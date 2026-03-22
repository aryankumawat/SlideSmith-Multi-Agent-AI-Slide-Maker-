'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Download, Network, Zap, BookOpen, BarChart3, AlignLeft, Layers } from 'lucide-react';

const features = [
  {
    icon: <Zap className="h-6 w-6" />,
    color: 'bg-blue-100 text-blue-600',
    title: 'Multi-Agent AI Pipeline',
    desc: '13 specialized agents — researcher, structurer, fact-checker, and more — collaborate to build your deck.',
  },
  {
    icon: <Network className="h-6 w-6" />,
    color: 'bg-purple-100 text-purple-600',
    title: 'Interactive Diagrams',
    desc: 'Auto-generated flowcharts, timelines, comparison tables, cycle diagrams, and hierarchy charts.',
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    color: 'bg-green-100 text-green-600',
    title: 'Live Charts',
    desc: 'Interactive bar, line, pie, area charts rendered with real data directly in your slides.',
  },
  {
    icon: <BookOpen className="h-6 w-6" />,
    color: 'bg-red-100 text-red-600',
    title: 'Academic & Professional Themes',
    desc: 'Choose from Academic, Corporate, Navy & Gold, Deep Space, Minimal, and Ultra Violet themes.',
  },
  {
    icon: <AlignLeft className="h-6 w-6" />,
    color: 'bg-orange-100 text-orange-600',
    title: 'Text Density Control',
    desc: 'Visual Focus (1–2 bullets), Balanced (3–4), or Text-Heavy (5–7) — you decide the depth.',
  },
  {
    icon: <Download className="h-6 w-6" />,
    color: 'bg-indigo-100 text-indigo-600',
    title: 'PPTX & PDF Export',
    desc: 'Export native PowerPoint files with editable charts, or high-quality PDFs — all locally processed.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Nav */}
      <header className="container mx-auto px-6 py-5">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">SlideSmith</span>
          </div>
          <Link href="/studio-new">
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              Open Studio <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-4 py-2 rounded-full mb-6 uppercase tracking-widest">
            <BookOpen className="w-3.5 h-3.5" />
            Powered by Ollama • Runs 100% Locally
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-5 leading-tight">
            Academic-grade
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              AI Presentations
            </span>
          </h1>
          <p className="text-xl text-slate-500 mb-8 max-w-xl mx-auto leading-relaxed">
            Enter a prompt, choose your slide count and content density. SlideSmith&apos;s 13-agent pipeline
            generates charts, diagrams, and structured slides — all offline with Ollama.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/studio-new">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 gap-2 px-8 shadow-lg">
                <Sparkles className="h-5 w-5" />
                Start Creating
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Content Density Explainer */}
      <section className="container mx-auto px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-2xl font-bold text-slate-800 mb-6">Content Density Options</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: <BarChart3 className="w-5 h-5" />, label: 'Visual Focus', sub: '1–2 bullets · diagram-heavy', color: 'border-blue-300 bg-blue-50' },
              { icon: <Layers className="w-5 h-5" />, label: 'Balanced', sub: '3–4 bullets · charts + text', color: 'border-indigo-300 bg-indigo-50' },
              { icon: <AlignLeft className="w-5 h-5" />, label: 'Text-Heavy', sub: '5–7 bullets · academic depth', color: 'border-purple-300 bg-purple-50' },
            ].map(opt => (
              <div key={opt.label} className={`rounded-xl border-2 p-4 text-center ${opt.color}`}>
                <div className="flex justify-center mb-2 text-slate-600">{opt.icon}</div>
                <div className="font-semibold text-slate-800 text-sm">{opt.label}</div>
                <div className="text-xs text-slate-500 mt-1">{opt.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            Everything you need for perfect presentations
          </h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            Professional-grade tools, academic rigor, and zero cloud dependency.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map(f => (
            <div key={f.title} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                {f.icon}
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-12 text-center text-white shadow-xl">
          <h2 className="text-3xl font-bold mb-3">Ready to build your deck?</h2>
          <p className="text-blue-100 mb-7 text-lg">
            One prompt. Multiple agents. A presentation in minutes — entirely on your machine.
          </p>
          <Link href="/studio-new">
            <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 gap-2 font-semibold px-8 shadow-md">
              <Sparkles className="h-5 w-5" />
              Open SlideSmith Studio
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 border-t border-slate-200">
        <p className="text-center text-sm text-slate-400">
          &copy; {new Date().getFullYear()} SlideSmith · Built with Next.js, Ollama, Recharts
        </p>
      </footer>
    </div>
  );
}
