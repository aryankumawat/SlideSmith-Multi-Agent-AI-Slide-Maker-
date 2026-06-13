import { get, set, del, keys, clear } from 'idb-keyval';
import { Deck } from './schema';

const DECK_STORAGE_KEY = 'slidesmith-decks';
const CURRENT_DECK_KEY = 'slidesmith-current-deck';

export interface StoredDeck {
  id: string;
  deck: Deck;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export class DeckStorage {
  private static instance: DeckStorage;
  private decks: Map<string, StoredDeck> = new Map();

  private constructor() {
    this.loadDecks();
  }

  static getInstance(): DeckStorage {
    if (!DeckStorage.instance) {
      DeckStorage.instance = new DeckStorage();
    }
    return DeckStorage.instance;
  }

  private async loadDecks(): Promise<void> {
    // Only load from storage in browser environment
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      return;
    }
    
    try {
      const stored = await get<StoredDeck[]>(DECK_STORAGE_KEY);
      if (stored) {
        this.decks = new Map(stored.map(d => [d.id, d]));
      }
    } catch (error) {
      console.error('Error loading decks from storage:', error);
    }
  }

  private async saveDecks(): Promise<void> {
    // Only save to storage in browser environment
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      return;
    }
    
    try {
      await set(DECK_STORAGE_KEY, Array.from(this.decks.values()));
    } catch (error) {
      console.error('Error saving decks to storage:', error);
    }
  }

  async saveDeck(deck: Deck): Promise<void> {
    // Only save in browser environment
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      return;
    }
    
    const now = new Date().toISOString();
    const stored: StoredDeck = {
      id: deck.id,
      deck,
      createdAt: this.decks.get(deck.id)?.createdAt || now,
      updatedAt: now,
      version: (this.decks.get(deck.id)?.version || 0) + 1,
    };

    this.decks.set(deck.id, stored);
    await this.saveDecks();
  }

  async getDeck(id: string): Promise<Deck | null> {
    const stored = this.decks.get(id);
    return stored ? stored.deck : null;
  }

  async getAllDecks(): Promise<StoredDeck[]> {
    return Array.from(this.decks.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async deleteDeck(id: string): Promise<void> {
    this.decks.delete(id);
    await this.saveDecks();
  }

  async clearAllDecks(): Promise<void> {
    this.decks.clear();
    await this.saveDecks();
  }

  async setCurrentDeck(deck: Deck | null): Promise<void> {
    if (deck) {
      await set(CURRENT_DECK_KEY, deck);
    } else {
      await del(CURRENT_DECK_KEY);
    }
  }

  async getCurrentDeck(): Promise<Deck | null> {
    try {
      return await get<Deck>(CURRENT_DECK_KEY) || null;
    } catch (error) {
      console.error('Error getting current deck:', error);
      return null;
    }
  }

  async exportDeck(id: string): Promise<string> {
    const deck = await this.getDeck(id);
    if (!deck) {
      throw new Error('Deck not found');
    }

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      deck,
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importDeck(jsonData: string): Promise<Deck> {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.deck || !data.deck.id || !data.deck.slides) {
        throw new Error('Invalid deck format');
      }

      // Generate new ID to avoid conflicts
      const newId = `deck-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const deck: Deck = {
        ...data.deck,
        id: newId,
      };

      await this.saveDeck(deck);
      return deck;
    } catch (error) {
      console.error('Error importing deck:', error);
      throw new Error('Failed to import deck: Invalid format');
    }
  }

  async duplicateDeck(id: string): Promise<Deck> {
    const original = await this.getDeck(id);
    if (!original) {
      throw new Error('Deck not found');
    }

    const duplicated: Deck = {
      ...original,
      id: `deck-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: `${original.title} (Copy)`,
    };

    await this.saveDeck(duplicated);
    return duplicated;
  }

  async searchDecks(query: string): Promise<StoredDeck[]> {
    const allDecks = await this.getAllDecks();
    const lowercaseQuery = query.toLowerCase();

    return allDecks.filter(stored => {
      const deck = stored.deck;
      return (
        deck.title.toLowerCase().includes(lowercaseQuery) ||
        deck.subtitle?.toLowerCase().includes(lowercaseQuery) ||
        deck.metadata?.author?.toLowerCase().includes(lowercaseQuery) ||
        deck.slides.some(slide => 
          slide.blocks.some(block => 
            'text' in block && block.text.toLowerCase().includes(lowercaseQuery)
          )
        )
      );
    });
  }

  async getRecentDecks(limit: number = 10): Promise<StoredDeck[]> {
    const allDecks = await this.getAllDecks();
    return allDecks.slice(0, limit);
  }

  async getDeckStats(): Promise<{
    totalDecks: number;
    totalSlides: number;
    averageSlidesPerDeck: number;
    mostUsedTheme: string;
    lastUpdated: string | null;
  }> {
    const allDecks = await this.getAllDecks();
    const totalDecks = allDecks.length;
    const totalSlides = allDecks.reduce((sum, stored) => sum + stored.deck.slides.length, 0);
    const averageSlidesPerDeck = totalDecks > 0 ? totalSlides / totalDecks : 0;
    
    const themeCounts = allDecks.reduce((counts, stored) => {
      const theme = stored.deck.theme || 'DeepSpace';
      counts[theme] = (counts[theme] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    const mostUsedTheme = Object.entries(themeCounts).reduce((a, b) => 
      themeCounts[a[0]] > themeCounts[b[0]] ? a : b, 
      ['DeepSpace', 0]
    )[0];

    const lastUpdated = allDecks.length > 0 ? allDecks[0].updatedAt : null;

    return {
      totalDecks,
      totalSlides,
      averageSlidesPerDeck: Math.round(averageSlidesPerDeck * 10) / 10,
      mostUsedTheme,
      lastUpdated,
    };
  }
}

// Utility functions for URL-based sharing
export function encodeDeckToURL(deck: Deck): string {
  const compressed = JSON.stringify(deck);
  return btoa(compressed);
}

export function decodeDeckFromURL(encoded: string): Deck | null {
  try {
    const decompressed = atob(encoded);
    return JSON.parse(decompressed);
  } catch (error) {
    console.error('Error decoding deck from URL:', error);
    return null;
  }
}

export function createShareableURL(deck: Deck): string {
  const encoded = encodeDeckToURL(deck);
  return `${window.location.origin}/studio?deck=${encoded}`;
}

// Export the singleton instance
export const deckStorage = DeckStorage.getInstance();

