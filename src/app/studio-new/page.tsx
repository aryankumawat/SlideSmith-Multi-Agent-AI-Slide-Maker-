'use client';

import { useState } from 'react';
import DeckGenerator from '@/components/DeckGenerator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye, Share } from 'lucide-react';
import { ChartDisplay } from '@/components/ChartDisplay';

interface Slide {
  layout: 'title' | 'title_bullets' | 'two_column' | 'quote' | 'chart' | 'image_full';
  title: string;
  bullets?: string[];
  notes?: string;
  chart_spec?: any;
  image?: { prompt: string; alt: string; source: string };
  citations?: string[];
}

interface Deck {
  title: string;
  theme: string;
  slides: Slide[];
}

export default function StudioNewPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedDeck, setGeneratedDeck] = useState<Deck | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (data: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout
      
      const response = await fetch('/api/generate-deck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error occurred' }));
        const errorMessage = errorData.error || errorData.details || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (!result.deck) {
        throw new Error('Invalid response: deck not found in response');
      }
      setGeneratedDeck(result.deck);
    } catch (err) {
      console.error('Generation error:', err);
      let errorMessage = 'An error occurred';
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'Request timed out. The generation is taking too long. Please try again or check if your LLM service is running.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to strip markdown formatting for clean exports
  const stripMarkdown = (text: string): string => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove **bold**
      .replace(/\*(.*?)\*/g, '$1')       // Remove *italic*
      .replace(/__(.*?)__/g, '$1')       // Remove __bold__
      .replace(/_(.*?)_/g, '$1')         // Remove _italic_
      .trim();
  };

  const convertDeckForExport = (deck: Deck) => {
    // Convert new deck format to old format expected by export APIs
    // Strip markdown formatting for clean text in exports
    return {
      id: `deck-${Date.now()}`,
      title: stripMarkdown(deck.title),
      theme: deck.theme,
      meta: {
        title: stripMarkdown(deck.title),
        theme: deck.theme,
        audience: 'general',
        tone: 'professional',
      },
      slides: deck.slides.map((slide, index) => {
        const blocks: any[] = [];
        
        // Add title as Heading block (strip markdown)
        if (slide.title) {
          blocks.push({
            type: 'Heading',
            text: stripMarkdown(slide.title),
            level: 1,
          });
        }
        
        // Add bullets as Bullets block (strip markdown from each bullet)
        if (slide.bullets && slide.bullets.length > 0) {
          blocks.push({
            type: 'Bullets',
            items: slide.bullets.map(bullet => stripMarkdown(bullet)),
          });
        }
        
        // Add chart if present
        if (slide.chart_spec) {
          blocks.push({
            type: 'Chart',
            chartSpec: slide.chart_spec,
          });
        }
        
        // Add image if present
        if (slide.image) {
          blocks.push({
            type: 'Image',
            url: slide.image.source || '',
            alt: stripMarkdown(slide.image.alt),
            caption: stripMarkdown(slide.image.prompt),
          });
        }
        
        return {
          id: `slide-${index}`,
          layout: slide.layout || 'title-content',
          blocks,
          notes: slide.notes || '',
          citations: slide.citations || [],
        };
      }),
    };
  };

  const handleExport = async (format: 'pptx' | 'pdf' | 'json') => {
    if (!generatedDeck) return;
    
    if (format === 'json') {
      // Download JSON with markdown stripped for clean text
      const cleanedDeck = {
        ...generatedDeck,
        title: stripMarkdown(generatedDeck.title),
        slides: generatedDeck.slides.map(slide => ({
          ...slide,
          title: stripMarkdown(slide.title),
          bullets: slide.bullets?.map(bullet => stripMarkdown(bullet)) || [],
          image: slide.image ? {
            ...slide.image,
            alt: stripMarkdown(slide.image.alt),
            prompt: stripMarkdown(slide.image.prompt)
          } : undefined
        }))
      };
      
      const blob = new Blob([JSON.stringify(cleanedDeck, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${stripMarkdown(generatedDeck.title) || 'presentation'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
    
    try {
      const endpoint = format === 'pptx' ? '/api/export/pptx' : '/api/export/pdf';
      
      // PPTX uses the new format directly (advanced exporter expects it)
      // PDF uses the old blocks format (legacy exporter expects it)
      const deckToExport = format === 'pptx' ? generatedDeck : convertDeckForExport(generatedDeck);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deck: deckToExport }),
      });

      if (!response.ok) {
        // Get error details from response
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`Export ${format} failed:`, response.status, errorData);
        throw new Error(`Failed to export ${format.toUpperCase()}: ${errorData.error || response.statusText}`);
      }

      // Get the blob and download it
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generatedDeck.title || 'presentation'}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Export failed:`, error);
      setError(`Failed to export as ${format.toUpperCase()}. Please try again.`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        {!generatedDeck ? (
          <div className="space-y-4">
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <p className="text-red-600 font-medium">Error: {error}</p>
                  <p className="text-sm text-red-500 mt-2">
                    {error.includes('Ollama') && 'Make sure Ollama is running: `ollama serve` or check your LLM configuration.'}
                    {error.includes('timeout') && 'The request took too long. Try reducing the slide count or check your LLM service.'}
                  </p>
                </CardContent>
              </Card>
            )}
            <DeckGenerator onGenerate={handleGenerate} isLoading={isLoading} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">{generatedDeck.title}</h1>
                <p className="text-gray-600">Theme: {generatedDeck.theme}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setGeneratedDeck(null)}>
                  Generate New
                </Button>
                <Button onClick={() => handleExport('pptx')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export PPTX
                </Button>
                <Button variant="outline" onClick={() => handleExport('pdf')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <p className="text-red-600">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* Slides Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedDeck.slides.map((slide, index) => {
                // Helper function to render text with bold markdown
                const renderMarkdown = (text: string) => {
                  const parts = text.split(/(\*\*.*?\*\*)/g);
                  return parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={i} className="text-blue-600 font-semibold">{part.slice(2, -2)}</strong>;
                    }
                    return <span key={i}>{part}</span>;
                  });
                };

                // Get theme-based styling with better contrast for headings
                const getThemeClasses = () => {
                  const theme = generatedDeck.theme;
                  switch (theme) {
                    case 'deep_space':
                      return {
                        card: 'bg-gradient-to-br from-slate-900 to-blue-900 border-blue-500',
                        header: 'bg-gradient-to-r from-blue-600 to-purple-600',
                        accent: 'text-white' // White for dark backgrounds
                      };
                    case 'ultra_violet':
                      return {
                        card: 'bg-gradient-to-br from-purple-900 to-pink-900 border-purple-500',
                        header: 'bg-gradient-to-r from-purple-600 to-fuchsia-600',
                        accent: 'text-white' // White for dark backgrounds
                      };
                    case 'minimal':
                      return {
                        card: 'bg-white border-gray-300',
                        header: 'bg-gray-100',
                        accent: 'text-gray-900' // Dark for light backgrounds
                      };
                    case 'corporate':
                      return {
                        card: 'bg-gradient-to-br from-slate-50 to-blue-50 border-blue-300',
                        header: 'bg-gradient-to-r from-blue-500 to-indigo-500',
                        accent: 'text-white' // White for colored headers
                      };
                    default:
                      return {
                        card: 'bg-white border-gray-200',
                        header: 'bg-gradient-to-r from-blue-50 to-purple-50',
                        accent: 'text-gray-900' // Dark for light backgrounds
                      };
                  }
                };

                const themeClasses = getThemeClasses();

                return (
                  <Card key={index} className={`h-auto min-h-64 overflow-hidden border-2 hover:shadow-xl transition-all ${themeClasses.card}`}>
                    <CardHeader className={`pb-3 ${themeClasses.header}`}>
                      <CardTitle className={`text-base font-semibold leading-tight ${themeClasses.accent}`}>
                        {renderMarkdown(slide.title)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        {/* Bullets with emoji and bold support */}
                        {slide.bullets && slide.bullets.length > 0 && (
                          <ul className="text-sm space-y-2">
                            {slide.bullets.map((bullet, bulletIndex) => (
                              <li key={bulletIndex} className="flex items-start gap-2">
                                <span className="text-gray-400 shrink-0 mt-0.5">▸</span>
                                <span className="leading-relaxed">
                                  {renderMarkdown(bullet)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        
                        {/* Image/Visual indicator with icon (compact) */}
                        {slide.image && (
                          <div className="mt-2 p-2 bg-gradient-to-br from-purple-50 to-pink-50 rounded border border-purple-200">
                            <div className="flex items-center gap-2">
                              <span className="text-base">🎨</span>
                              <strong className="text-xs text-purple-700">Visual: {slide.image.alt || 'Diagram included'}</strong>
                            </div>
                          </div>
                        )}
                        
                        {/* Chart visualization */}
                        {slide.chart_spec && (
                          <ChartDisplay chartSpec={slide.chart_spec} className="mt-3" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle>Export Options</CardTitle>
                <CardDescription>
                  Download your presentation in various formats
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button onClick={() => handleExport('pptx')} className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    PowerPoint (PPTX)
                  </Button>
                  <Button variant="outline" onClick={() => handleExport('pdf')} className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    PDF Document
                  </Button>
                  <Button variant="outline" onClick={() => handleExport('json')} className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    JSON Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
