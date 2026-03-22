'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, FileText, AlignLeft, Layers, BookOpen, BarChart3 } from 'lucide-react';

type TextDensity = 'low' | 'medium' | 'text_heavy';

interface DeckGeneratorProps {
  onGenerate: (data: any) => void;
  isLoading?: boolean;
}

const TEXT_DENSITY_OPTIONS: { value: TextDensity; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: 'low',
    label: 'Visual Focus',
    desc: '1–2 impactful bullets per slide, diagram-heavy',
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    value: 'medium',
    label: 'Balanced',
    desc: '3–4 bullets per slide, charts + text',
    icon: <Layers className="w-5 h-5" />,
  },
  {
    value: 'text_heavy',
    label: 'Text-Heavy',
    desc: '5–7 detailed bullets, academic depth',
    icon: <AlignLeft className="w-5 h-5" />,
  },
];

export default function DeckGenerator({ onGenerate, isLoading = false }: DeckGeneratorProps) {
  const [formData, setFormData] = useState({
    topic_or_prompt: '',
    tone: 'academic',
    audience: 'general',
    slide_count: 10,
    theme: 'academic',
    text_density: 'medium' as TextDensity,
    live_widgets: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({ mode: 'quick_prompt', ...formData });
  };

  const set = (field: string, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 uppercase tracking-widest">
            <BookOpen className="w-3.5 h-3.5" />
            Multi-Agent AI • Powered by Ollama
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-3">
            Slide<span className="text-blue-600">Smith</span>
          </h1>
          <p className="text-slate-500 text-lg max-w-md mx-auto">
            Describe your topic, set your parameters, and get a professional presentation in minutes.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                Generate Presentation
              </CardTitle>
              <CardDescription>Fill in the details below to create your deck</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-4">
              {/* Prompt */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  What is your presentation about? <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="e.g., 'The impact of machine learning on drug discovery — include pharmacokinetics data, clinical trial stages, and regulatory pathways for a graduate audience.'"
                  value={formData.topic_or_prompt}
                  onChange={e => set('topic_or_prompt', e.target.value)}
                  className="min-h-[110px] resize-none text-sm border-slate-200 focus:border-blue-400"
                  required
                />
              </div>

              {/* Row: slides + theme */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Number of Slides
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={4}
                      max={30}
                      step={1}
                      value={formData.slide_count}
                      onChange={e => set('slide_count', parseInt(e.target.value))}
                      className="flex-1 accent-blue-600"
                    />
                    <span className="w-8 text-center font-bold text-blue-700 text-sm">
                      {formData.slide_count}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">4 – 30 slides</div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Theme</label>
                  <Select value={formData.theme} onValueChange={v => set('theme', v)}>
                    <SelectTrigger className="border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academic">Academic (Light)</SelectItem>
                      <SelectItem value="corporate">Corporate Blue</SelectItem>
                      <SelectItem value="deep_space">Deep Space (Dark)</SelectItem>
                      <SelectItem value="ultra_violet">Ultra Violet (Dark)</SelectItem>
                      <SelectItem value="navy_gold">Navy & Gold</SelectItem>
                      <SelectItem value="minimal">Minimal White</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row: tone + audience */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Tone</label>
                  <Select value={formData.tone} onValueChange={v => set('tone', v)}>
                    <SelectTrigger className="border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="persuasive">Persuasive</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Audience</label>
                  <Select value={formData.audience} onValueChange={v => set('audience', v)}>
                    <SelectTrigger className="border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="executives">Executives</SelectItem>
                      <SelectItem value="technical">Technical / Engineering</SelectItem>
                      <SelectItem value="students">Students / Academic</SelectItem>
                      <SelectItem value="researchers">Researchers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Text Density */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Content Density
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {TEXT_DENSITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set('text_density', opt.value)}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        formData.text_density === opt.value
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-slate-200 hover:border-blue-300 bg-white'
                      }`}
                    >
                      <div className={`mb-1.5 ${formData.text_density === opt.value ? 'text-blue-600' : 'text-slate-400'}`}>
                        {opt.icon}
                      </div>
                      <div className={`text-xs font-semibold ${formData.text_density === opt.value ? 'text-blue-700' : 'text-slate-700'}`}>
                        {opt.label}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 leading-tight">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-base shadow-md"
                disabled={isLoading || !formData.topic_or_prompt.trim()}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Generating — this may take a few minutes…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Generate Presentation
                  </span>
                )}
              </Button>

              <p className="text-xs text-slate-400 text-center">
                Uses Ollama locally • No data leaves your machine
              </p>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
