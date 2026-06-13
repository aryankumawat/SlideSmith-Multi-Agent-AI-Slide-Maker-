'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Deck, Slide, Theme, GenerateRequest } from '@/lib/schema';
import { deckStorage } from '@/lib/storage';
import { DeckCanvas } from '@/components/DeckCanvas';
import { LivePlanner } from '@/components/LivePlanner';
import { PDFUpload } from '@/components/PDFUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  Download, 
  Save, 
  Share, 
  Settings, 
  Plus, 
  Trash2, 
  RotateCcw,
  Palette,
  Users,
  FileText,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DEMO_DECK, DEMO_TOPICS } from '@/lib/demo-data';
import { PresentationPlan } from '@/lib/planner';

export default function StudioPage() {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showGenerateForm, setShowGenerateForm] = useState(true);
  const [showPlanner, setShowPlanner] = useState(false);
  const [showPDFUpload, setShowPDFUpload] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PresentationPlan | null>(null);
  const { toast } = useToast();

  // Generate form state
  const [generateForm, setGenerateForm] = useState<GenerateRequest>({
    topic: '',
    mode: 'plan',
    detail: '',
    tone: 'Professional',
    audience: 'General audience',
    length: 10,
    theme: 'DeepSpace',
    enableLive: false,
  });

  // Load deck from URL or storage
  useEffect(() => {
    const loadDeck = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const deckParam = urlParams.get('deck');
      
      if (deckParam) {
        try {
          const decodedDeck = JSON.parse(atob(deckParam));
          setDeck(decodedDeck);
          setShowGenerateForm(false);
        } catch (error) {
          console.error('Error loading deck from URL:', error);
        }
      } else {
        // Try to load from storage
        const storedDeck = await deckStorage.getCurrentDeck();
        if (storedDeck) {
          setDeck(storedDeck);
          setShowGenerateForm(false);
        }
      }
    };

    loadDeck();
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!generateForm.topic.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a topic for your presentation.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      // First, generate the plan
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...generateForm,
          mode: 'plan'
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate plan: ${response.status}`);
      }

      const { plan } = await response.json();
      setCurrentPlan(plan);
      setShowGenerateForm(false);
      setShowPlanner(true);

      toast({
        title: 'Plan Generated',
        description: 'Your presentation plan is ready! Starting live execution...',
      });
    } catch (error) {
      console.error('Error generating plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate presentation plan. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [generateForm, toast]);

  const handlePlanComplete = useCallback(async (generatedDeck: any) => {
    setDeck(generatedDeck);
    setCurrentSlideIndex(0);
    setShowPlanner(false);
    setCurrentPlan(null);
    
    // Save to storage
    await deckStorage.saveDeck(generatedDeck);
    await deckStorage.setCurrentDeck(generatedDeck);

    toast({
      title: 'Success',
      description: 'Your presentation has been generated and is ready!',
    });
  }, [toast]);

  const handleCancelPlan = useCallback(() => {
    setShowPlanner(false);
    setCurrentPlan(null);
    setShowGenerateForm(true);
  }, []);

  const handlePDFProcessed = useCallback((content: any, outline: any) => {
    // Convert PDF outline to deck format
    const generatedDeck: Deck = {
      id: `deck-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: outline.title,
      subtitle: outline.abstract,
      theme: 'Academic' as Theme,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1',
        author: 'AI Slide Maker',
      },
      slides: outline.agenda.map((section: any, index: number) => ({
        id: `slide-${index + 1}`,
        layout: 'title+bullets' as const,
        blocks: [
          {
            type: 'Heading' as const,
            text: section.title,
          },
          {
            type: 'Subheading' as const,
            text: section.objective,
          },
          {
            type: 'Bullets' as const,
            items: section.keyPoints,
          },
        ],
        notes: `Academic level: ${section.academicLevel}. ${section.objective}`,
      })),
    };

    setDeck(generatedDeck);
    setCurrentSlideIndex(0);
    setShowPDFUpload(false);
    setShowGenerateForm(false);
    
    // Save to storage
    deckStorage.saveDeck(generatedDeck);
    
    toast({
      title: 'PDF Processed Successfully',
      description: `Generated ${generatedDeck.slides.length} slides from your research paper`,
    });
  }, [toast]);

  const handlePDFError = useCallback((error: string) => {
    toast({
      title: 'PDF Processing Failed',
      description: error,
      variant: 'destructive',
    });
  }, [toast]);

  const handleSlideChange = useCallback((index: number) => {
    setCurrentSlideIndex(index);
  }, []);

  const handleSlideUpdate = useCallback(async (slide: Slide) => {
    if (!deck) return;

    const updatedSlides = [...deck.slides];
    updatedSlides[currentSlideIndex] = slide;
    
    const updatedDeck = {
      ...deck,
      slides: updatedSlides,
    };

    setDeck(updatedDeck);
    await deckStorage.saveDeck(updatedDeck);
  }, [deck, currentSlideIndex]);

  const handleRegenerateSlide = useCallback(async (slideIndex: number) => {
    if (!deck) return;

    setIsGenerating(true);
    try {
      // For now, just show a toast - in production, you'd call an API
      toast({
        title: 'Regenerating Slide',
        description: `Regenerating slide ${slideIndex + 1}...`,
      });
    } catch (error) {
      console.error('Error regenerating slide:', error);
      toast({
        title: 'Error',
        description: 'Failed to regenerate slide.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [deck, toast]);

  const handleAddSlide = useCallback(async (afterIndex: number) => {
    if (!deck) return;

    // For now, just show a toast - in production, you'd call an API
    toast({
      title: 'Add Slide',
      description: `Adding slide after slide ${afterIndex + 1}...`,
    });
  }, [deck, toast]);

  const handleDeleteSlide = useCallback(async (slideIndex: number) => {
    if (!deck || deck.slides.length <= 1) return;

    const updatedSlides = deck.slides.filter((_, index) => index !== slideIndex);
    const updatedDeck = {
      ...deck,
      slides: updatedSlides,
    };

    setDeck(updatedDeck);
    setCurrentSlideIndex(Math.min(currentSlideIndex, updatedSlides.length - 1));
    await deckStorage.saveDeck(updatedDeck);

    toast({
      title: 'Slide Deleted',
      description: 'Slide has been removed from your presentation.',
    });
  }, [deck, currentSlideIndex, toast]);

  const handleExportPDF = useCallback(async () => {
    if (!deck) return;

    setIsExporting(true);
    try {
      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deck }),
      });

      if (!response.ok) {
        throw new Error(`Failed to export PDF: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${deck.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: 'PDF exported successfully!',
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to export PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [deck, toast]);

  const handleExportPPTX = useCallback(async () => {
    if (!deck) return;

    setIsExporting(true);
    try {
      const response = await fetch('/api/export/pptx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deck }),
      });

      if (!response.ok) {
        throw new Error(`Failed to export PPTX: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${deck.title}.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: 'PPTX exported successfully!',
      });
    } catch (error) {
      console.error('Error exporting PPTX:', error);
      toast({
        title: 'Error',
        description: 'Failed to export PPTX.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [deck, toast]);

  const handleSave = useCallback(async () => {
    if (!deck) return;

    await deckStorage.saveDeck(deck);
    toast({
      title: 'Saved',
      description: 'Presentation saved successfully!',
    });
  }, [deck, toast]);

  const handleShare = useCallback(() => {
    if (!deck) return;

    const encoded = btoa(JSON.stringify(deck));
    const shareUrl = `${window.location.origin}/studio?deck=${encoded}`;
    
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: 'Link Copied',
      description: 'Share link copied to clipboard!',
    });
  }, [deck, toast]);

  const handleNewPresentation = useCallback(() => {
    setDeck(null);
    setCurrentSlideIndex(0);
    setShowGenerateForm(true);
  }, []);

  const handleLoadDemo = useCallback(() => {
    setDeck(DEMO_DECK);
    setCurrentSlideIndex(0);
    setShowGenerateForm(false);
    toast({
      title: 'Demo Loaded',
      description: 'Demo presentation loaded successfully!',
    });
  }, [toast]);

  const handleLoadDemoTopic = useCallback((topic: typeof DEMO_TOPICS[0]) => {
    setGenerateForm({
      topic: topic.topic,
      mode: 'plan',
      detail: topic.detail,
      tone: topic.tone,
      audience: topic.audience,
      length: topic.length,
      theme: topic.theme,
      enableLive: true,
    });
    toast({
      title: 'Demo Topic Loaded',
      description: 'Demo topic loaded. Click Generate to create the presentation.',
    });
  }, []);

  if (showPlanner && currentPlan) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <LivePlanner
            plan={currentPlan}
            onPlanComplete={handlePlanComplete}
            onCancel={handleCancelPlan}
          />
        </div>
      </div>
    );
  }

  if (showPDFUpload) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowPDFUpload(false);
                setShowGenerateForm(true);
              }}
              className="mb-4"
            >
              ← Back to Text Generation
            </Button>
          </div>
          <PDFUpload
            onPDFProcessed={handlePDFProcessed}
            onError={handlePDFError}
          />
        </div>
      </div>
    );
  }

  if (showGenerateForm) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-6 w-6 text-blue-600" />
                  <span>Generate New Presentation</span>
                </CardTitle>
                <CardDescription>
                  Enter your topic and preferences to generate a stunning presentation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Topic *</label>
                  <Input
                    placeholder="e.g., The Future of Artificial Intelligence"
                    value={generateForm.topic}
                    onChange={(e) => setGenerateForm(prev => ({ ...prev, topic: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Additional Details</label>
                  <Textarea
                    placeholder="Any specific points you'd like to include..."
                    value={generateForm.detail}
                    onChange={(e) => setGenerateForm(prev => ({ ...prev, detail: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Tone</label>
                    <Select
                      value={generateForm.tone}
                      onValueChange={(value) => setGenerateForm(prev => ({ ...prev, tone: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Professional">Professional</SelectItem>
                        <SelectItem value="Casual">Casual</SelectItem>
                        <SelectItem value="Academic">Academic</SelectItem>
                        <SelectItem value="Creative">Creative</SelectItem>
                        <SelectItem value="Technical">Technical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Audience</label>
                    <Input
                      placeholder="e.g., Business executives"
                      value={generateForm.audience}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, audience: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Number of Slides</label>
                    <Input
                      type="number"
                      min="3"
                      max="50"
                      value={generateForm.length}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, length: parseInt(e.target.value) || 10 }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Theme</label>
                    <Select
                      value={generateForm.theme}
                      onValueChange={(value) => setGenerateForm(prev => ({ ...prev, theme: value as Theme }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DeepSpace">Deep Space</SelectItem>
                        <SelectItem value="Ultraviolet">Ultraviolet</SelectItem>
                        <SelectItem value="Minimal">Minimal</SelectItem>
                        <SelectItem value="Corporate">Corporate</SelectItem>
                        <SelectItem value="NeonGrid">Neon Grid</SelectItem>
                        <SelectItem value="Academic">Academic</SelectItem>
                        <SelectItem value="Conference">Conference</SelectItem>
                        <SelectItem value="Journal">Journal</SelectItem>
                        <SelectItem value="Thesis">Thesis</SelectItem>
                        <SelectItem value="Beamer">Beamer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableLive"
                    checked={generateForm.enableLive}
                    onCheckedChange={(checked) => setGenerateForm(prev => ({ ...prev, enableLive: checked }))}
                  />
                  <label htmlFor="enableLive" className="text-sm font-medium">
                    Enable live widgets (charts, tickers, etc.)
                  </label>
                </div>

                <div className="space-y-4">
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !generateForm.topic.trim()}
                    className="w-full"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Generate Presentation
                      </>
                    )}
                  </Button>

                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Or try a demo:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadDemo}
                      >
                        Load Demo Presentation
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPDFUpload(true)}
                        className="flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        Upload PDF Paper
                      </Button>
                      {DEMO_TOPICS.map((topic, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleLoadDemoTopic(topic)}
                        >
                          {topic.topic}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            No Presentation Loaded
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Generate a new presentation or load an existing one.
          </p>
          <Button onClick={handleNewPresentation}>
            <Plus className="mr-2 h-4 w-4" />
            New Presentation
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {deck.title}
            </h1>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {deck.slides.length} slides
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
            >
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
            >
              <Share className="mr-2 h-4 w-4" />
              Share
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting}
            >
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPPTX}
              disabled={isExporting}
            >
              <Download className="mr-2 h-4 w-4" />
              PPTX
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewPresentation}
            >
              <Plus className="mr-2 h-4 w-4" />
              New
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4">
          <Tabs defaultValue="settings" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="slides">Slides</TabsTrigger>
            </TabsList>
            
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Presentation Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Title</label>
                    <p className="text-sm">{deck.title}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Theme</label>
                    <p className="text-sm">{deck.theme}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Audience</label>
                    <p className="text-sm">{deck.subtitle}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="slides" className="space-y-2">
              <div className="space-y-2">
                {deck.slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentSlideIndex(index)}
                    className={`w-full p-3 text-left rounded-lg border transition-colors ${
                      index === currentSlideIndex
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-sm font-medium">Slide {index + 1}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {slide.blocks.find(b => b.type === 'Heading')?.type === 'Heading' 
                        ? (slide.blocks.find(b => b.type === 'Heading') as any)?.text
                        : 'Untitled'
                      }
                    </div>
                  </button>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Canvas */}
        <div className="flex-1">
          <DeckCanvas
            deck={deck}
            currentSlideIndex={currentSlideIndex}
            onSlideChange={handleSlideChange}
            onSlideUpdate={handleSlideUpdate}
            onRegenerateSlide={handleRegenerateSlide}
            onAddSlide={handleAddSlide}
            onDeleteSlide={handleDeleteSlide}
          />
        </div>
      </div>
    </div>
  );
}
