'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Slide {
  layout: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  notes?: string;
  citations?: string[];
}

interface Deck {
  title: string;
  theme: string;
  slides: Slide[];
}

const strip = (text: string) =>
  text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').trim();

const convertForPdf = (deck: Deck) => ({
  id: `deck-${Date.now()}`,
  title: strip(deck.title),
  theme: deck.theme,
  meta: { title: strip(deck.title), theme: deck.theme, audience: 'general', tone: 'professional' },
  slides: deck.slides.map((slide, idx) => ({
    id: `slide-${idx}`,
    layout: slide.layout || 'title-content',
    blocks: [
      { type: 'Heading', text: strip(slide.title), level: 1 },
      ...(slide.bullets?.length ? [{ type: 'Bullets', items: slide.bullets.map(strip) }] : []),
    ],
    notes: slide.notes || '',
    citations: slide.citations || [],
  })),
});

export default function ExportPage() {
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'export' | 'repurpose'>('export');
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'pptx' | 'json'>('pdf');
  const [includeSpeakerNotes, setIncludeSpeakerNotes] = useState(true);
  const [editableShapes, setEditableShapes] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('ss-deck');
    if (!raw) { router.replace('/studio-new'); return; }
    try { setDeck(JSON.parse(raw)); } catch { router.replace('/studio-new'); }
  }, [router]);

  const handleExport = async (format: 'pptx' | 'pdf' | 'json') => {
    if (!deck) return;
    setExporting(format);
    setError(null);
    try {
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(deck, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${strip(deck.title)}.json`; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        return;
      }
      const endpoint = format === 'pptx' ? '/api/export/pptx' : '/api/export/pdf';
      const body = format === 'pptx' ? deck : convertForPdf(deck);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck: body }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(err.error || res.statusText);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${strip(deck.title)}.${format}`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const handleCopy = (field: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  if (!deck) return null;

  const slideCount = deck.slides.length;
  const estPdfSize = `${(slideCount * 0.4).toFixed(1)} MB`;
  const estPptxSize = `${(slideCount * 0.25).toFixed(1)} MB`;

  const linkedinContent = deck.slides
    .slice(0, 3)
    .map((s) => `• ${strip(s.title)}`)
    .join('\n');

  const blogContent = deck.slides
    .map((s) => `## ${strip(s.title)}\n${s.bullets?.map((b) => strip(b)).join(' ') ?? ''}`)
    .join('\n\n');

  const emailContent = `Subject: ${strip(deck.title)}\n\nHi,\n\nI wanted to share key insights from "${strip(deck.title)}":\n\n${deck.slides.slice(0, 4).map((s) => `• ${strip(s.title)}`).join('\n')}\n\nBest regards`;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background-deep">

      {/* Blurred background — simulated presentation editor */}
      <div className="absolute inset-0 z-0 blur-md opacity-40 grayscale pointer-events-none flex">
        {/* Left sidebar mock */}
        <div className="w-64 h-full bg-surface-container-low border-r border-subtle flex flex-col gap-2 p-3">
          {deck.slides.map((slide, i) => (
            <div
              key={i}
              className="w-full rounded-lg bg-surface-container border border-subtle p-2 flex items-center gap-2"
            >
              <span className="text-[8px] font-mono text-text-secondary w-4 shrink-0">{i + 1}</span>
              <div className="flex-1 h-8 bg-surface-variant rounded" />
            </div>
          ))}
        </div>
        {/* Main canvas mock */}
        <div className="flex-1 h-full bg-surface flex items-center justify-center p-12">
          <div className="w-full max-w-2xl aspect-video bg-surface-container rounded-2xl border border-subtle flex items-center justify-center">
            <div className="text-center space-y-4 px-12">
              <div className="h-6 bg-surface-variant rounded-full w-3/4 mx-auto" />
              <div className="h-3 bg-surface-container-high rounded-full w-1/2 mx-auto" />
              <div className="space-y-2 mt-6">
                {[80, 60, 70].map((w, i) => (
                  <div key={i} className={`h-2 bg-surface-variant rounded-full mx-auto`} style={{ width: `${w}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(10,10,11,0.6)', backdropFilter: 'blur(4px)' }}>
        <div className="glass-panel w-full max-w-5xl h-[720px] rounded-[32px] overflow-hidden flex flex-col shadow-2xl">

          {/* Modal Header */}
          <div className="h-20 px-10 border-b border-subtle flex items-center justify-between shrink-0" style={{ background: 'rgba(23,24,28,0.4)' }}>

            {/* Left: icon + title */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg primary-gradient flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white" style={{ fontSize: 16 }}>publish</span>
              </div>
              <span className="text-white font-semibold text-base" style={{ fontFamily: 'var(--font-syne, Syne, sans-serif)', letterSpacing: '-0.01em' }}>
                Export &amp; Repurpose
              </span>
            </div>

            {/* Center: tab switcher */}
            <div className="flex items-center rounded-full p-1 border border-subtle" style={{ background: 'rgba(13,14,16,1)' }}>
              <button
                onClick={() => setActiveTab('export')}
                className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeTab === 'export'
                    ? 'bg-surface-variant text-white shadow-sm'
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                Export File
              </button>
              <button
                onClick={() => setActiveTab('repurpose')}
                className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeTab === 'repurpose'
                    ? 'bg-surface-variant text-white shadow-sm'
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                Repurpose Content
              </button>
            </div>

            {/* Right: close */}
            <button
              onClick={() => router.push('/studio-new')}
              className="w-8 h-8 rounded-full border border-subtle flex items-center justify-center text-text-secondary hover:text-white hover:border-white/20 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }}
              aria-label="Close"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-hidden">

            {/* ───── Export Tab ───── */}
            {activeTab === 'export' && (
              <div className="h-full flex p-10 gap-10">

                {/* Left: format selection */}
                <div className="w-1/2 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-1">
                  <h2 className="text-white font-semibold text-lg" style={{ fontFamily: 'var(--font-syne, Syne, sans-serif)', letterSpacing: '-0.01em' }}>
                    Choose Format
                  </h2>

                  {error && (
                    <div className="px-4 py-3 rounded-xl border text-sm" style={{ background: 'rgba(255,100,100,0.08)', borderColor: 'rgba(255,100,100,0.2)', color: '#FF6B6B' }}>
                      {error}
                    </div>
                  )}

                  {/* PDF card */}
                  <button
                    onClick={() => setSelectedFormat('pdf')}
                    className={`w-full text-left rounded-2xl p-5 transition-all duration-200 ${
                      selectedFormat === 'pdf'
                        ? 'border-2 border-primary-container accent-glow'
                        : 'border border-subtle hover:border-white/15'
                    }`}
                    style={{ background: 'rgba(23,24,28,0.6)' }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#ef4444' }}>picture_as_pdf</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-semibold text-sm">High-Quality PDF</span>
                          {selectedFormat === 'pdf' && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,212,255,0.15)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.25)', letterSpacing: '0.08em' }}>
                              RECOMMENDED
                            </span>
                          )}
                        </div>
                        <p className="text-text-secondary text-xs leading-relaxed">Best for printing &amp; universal sharing</p>
                        <p className="text-text-secondary text-xs mt-1" style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}>
                          Est. size: {estPdfSize}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        id="speakerNotes"
                        checked={includeSpeakerNotes}
                        onChange={(e) => setIncludeSpeakerNotes(e.target.checked)}
                        className="w-3.5 h-3.5 rounded accent-cyan-400 cursor-pointer"
                        style={{ accentColor: '#00D4FF' }}
                      />
                      <label htmlFor="speakerNotes" className="text-xs text-text-secondary cursor-pointer select-none">
                        Include Speaker Notes
                      </label>
                    </div>
                  </button>

                  {/* PPTX card */}
                  <button
                    onClick={() => setSelectedFormat('pptx')}
                    className={`w-full text-left rounded-2xl p-5 transition-all duration-200 ${
                      selectedFormat === 'pptx'
                        ? 'border-2 border-primary-container accent-glow'
                        : 'border border-subtle hover:border-white/15'
                    }`}
                    style={{ background: 'rgba(23,24,28,0.6)' }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.2)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#f97316' }}>slideshow</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-semibold text-sm">PowerPoint (.pptx)</span>
                        </div>
                        <p className="text-text-secondary text-xs leading-relaxed">Edit in PowerPoint, Keynote, or Google Slides</p>
                        <p className="text-text-secondary text-xs mt-1" style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}>
                          Est. size: {estPptxSize}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        id="editableShapes"
                        checked={editableShapes}
                        onChange={(e) => setEditableShapes(e.target.checked)}
                        className="w-3.5 h-3.5 rounded cursor-pointer"
                        style={{ accentColor: '#00D4FF' }}
                      />
                      <label htmlFor="editableShapes" className="text-xs text-text-secondary cursor-pointer select-none">
                        Editable Shapes
                      </label>
                    </div>
                  </button>

                  {/* JSON card */}
                  <button
                    onClick={() => setSelectedFormat('json')}
                    className={`w-full text-left rounded-2xl p-5 transition-all duration-200 ${
                      selectedFormat === 'json'
                        ? 'border-2 border-primary-container accent-glow'
                        : 'border border-subtle hover:border-white/15'
                    }`}
                    style={{ background: 'rgba(23,24,28,0.6)' }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.2)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#7C3AED' }}>data_object</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-white font-semibold text-sm">Raw JSON</span>
                        <p className="text-text-secondary text-xs leading-relaxed mt-1">Import back into SlideSmith or integrate with your own tooling</p>
                      </div>
                    </div>
                  </button>

                  {/* Password / Vector toggles */}
                  <div className="rounded-2xl border border-subtle p-4 flex flex-col gap-3" style={{ background: 'rgba(23,24,28,0.4)' }}>
                    <p className="text-xs text-text-secondary font-medium uppercase tracking-widest" style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}>Options</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-on-surface-variant">Password protection</span>
                      <div className="w-8 h-4 rounded-full border border-subtle flex items-center px-0.5 cursor-not-allowed opacity-40" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <div className="w-3 h-3 rounded-full bg-surface-variant" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-on-surface-variant">Vector graphics export</span>
                      <div className="w-8 h-4 rounded-full border border-subtle flex items-center px-0.5 cursor-not-allowed opacity-40" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <div className="w-3 h-3 rounded-full bg-surface-variant" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: live preview + download */}
                <div className="flex-1 flex flex-col gap-4">
                  {/* Preview label */}
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
                    <span className="text-[10px] font-bold tracking-widest text-primary-container uppercase" style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}>
                      Live Export Preview
                    </span>
                  </div>

                  {/* Slide preview cards */}
                  <div className="flex-1 rounded-2xl border border-subtle overflow-hidden flex flex-col" style={{ background: 'rgba(13,14,16,0.6)' }}>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3">
                      {deck.slides.map((slide, i) => (
                        <div
                          key={i}
                          className="rounded-xl border border-subtle p-3 flex gap-3 items-start"
                          style={{ background: 'rgba(23,24,28,0.8)' }}
                        >
                          <span className="text-[9px] font-mono text-text-secondary tabular-nums shrink-0 pt-0.5 w-4">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-medium leading-snug truncate">{strip(slide.title)}</p>
                            {slide.bullets && slide.bullets.length > 0 && (
                              <p className="text-text-secondary text-[10px] mt-1 truncate">{strip(slide.bullets[0])}</p>
                            )}
                          </div>
                          <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: selectedFormat === 'pdf' ? '#ef4444' : selectedFormat === 'pptx' ? '#f97316' : '#7C3AED' }} />
                        </div>
                      ))}
                    </div>

                    {/* Format badge */}
                    <div className="border-t border-subtle px-4 py-2.5 flex items-center justify-between">
                      <span className="text-[10px] text-text-secondary font-mono uppercase tracking-wide">
                        {slideCount} slides · {selectedFormat.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-text-secondary font-mono">
                        {selectedFormat === 'pdf' ? estPdfSize : selectedFormat === 'pptx' ? estPptxSize : '< 1 MB'}
                      </span>
                    </div>
                  </div>

                  {/* Download button */}
                  <button
                    onClick={() => handleExport(selectedFormat)}
                    disabled={!!exporting}
                    className="w-full h-12 rounded-2xl text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 primary-gradient transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:opacity-80"
                    style={{ fontFamily: 'var(--font-syne, Syne, sans-serif)' }}
                  >
                    {exporting === selectedFormat ? (
                      <>
                        <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>refresh</span>
                        Exporting…
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
                        Download Presentation
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ───── Repurpose Tab ───── */}
            {activeTab === 'repurpose' && (
              <div className="h-full p-10 flex flex-col gap-8 overflow-y-auto custom-scrollbar">
                {/* Header */}
                <div className="flex items-center justify-between shrink-0">
                  <div>
                    <h2 className="text-white font-semibold text-lg" style={{ fontFamily: 'var(--font-syne, Syne, sans-serif)', letterSpacing: '-0.01em' }}>
                      AI Content Repurposing
                    </h2>
                    <p className="text-text-secondary text-sm mt-0.5">Transform your slides into ready-to-publish content</p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-subtle text-text-secondary hover:text-white hover:border-white/20 transition-colors text-sm" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
                    Regenerate All
                  </button>
                </div>

                {/* 3-column grid */}
                <div className="grid grid-cols-3 gap-5">

                  {/* LinkedIn Post */}
                  <div className="rounded-2xl border border-subtle overflow-hidden flex flex-col" style={{ background: 'rgba(23,24,28,0.6)' }}>
                    <div className="px-4 py-3 border-b border-subtle flex items-center justify-between" style={{ background: 'rgba(10,102,194,0.12)' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black text-white" style={{ background: '#0A66C2' }}>
                          in
                        </div>
                        <span className="text-white text-xs font-semibold">LinkedIn Post</span>
                      </div>
                      <button
                        onClick={() => handleCopy('linkedin', linkedinContent)}
                        className="text-text-secondary hover:text-white transition-colors"
                        aria-label="Copy"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                          {copiedField === 'linkedin' ? 'done' : 'content_copy'}
                        </span>
                      </button>
                    </div>
                    <div className="flex-1 p-4">
                      <p className="text-on-surface-variant text-xs leading-relaxed whitespace-pre-line">
                        🚀 Excited to share insights from &quot;{strip(deck.title)}&quot;!{'\n\n'}{linkedinContent}{'\n\n'}What&apos;s your take? Drop a comment below 👇 #Innovation #Productivity
                      </p>
                    </div>
                    <div className="px-4 py-2.5 border-t border-subtle">
                      <span className="text-[10px] text-text-secondary font-mono">
                        {280 - linkedinContent.length > 0 ? `${280 - linkedinContent.length} chars remaining` : 'Optimal length'}
                      </span>
                    </div>
                  </div>

                  {/* Blog Article */}
                  <div className="rounded-2xl border border-subtle overflow-hidden flex flex-col" style={{ background: 'rgba(23,24,28,0.6)' }}>
                    <div className="px-4 py-3 border-b border-subtle flex items-center justify-between" style={{ background: 'rgba(0,212,255,0.08)' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center primary-gradient">
                          <span className="material-symbols-outlined text-white" style={{ fontSize: 13 }}>article</span>
                        </div>
                        <span className="text-white text-xs font-semibold">Blog Article</span>
                      </div>
                      <button
                        onClick={() => handleCopy('blog', blogContent)}
                        className="text-text-secondary hover:text-white transition-colors"
                        aria-label="Copy"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                          {copiedField === 'blog' ? 'done' : 'content_copy'}
                        </span>
                      </button>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                      <p className="text-on-surface-variant text-xs leading-relaxed whitespace-pre-line">
                        {blogContent.slice(0, 400)}{blogContent.length > 400 ? '…' : ''}
                      </p>
                    </div>
                    <div className="px-4 py-2.5 border-t border-subtle">
                      <span className="text-[10px] text-text-secondary font-mono">
                        ~{Math.round(blogContent.split(' ').length / 200)} min read · {blogContent.split(' ').length} words
                      </span>
                    </div>
                  </div>

                  {/* Email Newsletter */}
                  <div className="rounded-2xl border border-subtle overflow-hidden flex flex-col" style={{ background: 'rgba(23,24,28,0.6)' }}>
                    <div className="px-4 py-3 border-b border-subtle flex items-center justify-between" style={{ background: 'rgba(96,1,209,0.15)' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(96,1,209,0.6)', border: '1px solid rgba(210,187,255,0.2)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#c9aeff' }}>mail</span>
                        </div>
                        <span className="text-white text-xs font-semibold">Email Newsletter</span>
                      </div>
                      <button
                        onClick={() => handleCopy('email', emailContent)}
                        className="text-text-secondary hover:text-white transition-colors"
                        aria-label="Copy"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                          {copiedField === 'email' ? 'done' : 'content_copy'}
                        </span>
                      </button>
                    </div>
                    <div className="flex-1 p-4">
                      <p className="text-on-surface-variant text-xs leading-relaxed whitespace-pre-line">
                        {emailContent}
                      </p>
                    </div>
                    <div className="px-4 py-2.5 border-t border-subtle">
                      <span className="text-[10px] text-text-secondary font-mono">Plain text · HTML ready</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="h-16 px-10 border-t border-subtle flex items-center justify-between shrink-0" style={{ background: 'rgba(27,28,30,1)' }}>
            {/* Left: status */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-text-secondary" style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}>AI Engine v4.2 Ready</span>
              </div>
              <div className="w-px h-3 bg-subtle opacity-40" />
              <span className="text-xs text-text-secondary truncate max-w-[160px]">Project: {strip(deck.title)}</span>
              <div className="w-px h-3 bg-subtle opacity-40" />
              <span className="text-xs text-text-secondary">Last Edit: just now</span>
            </div>

            {/* Right: encryption badge */}
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400" style={{ fontSize: 14 }}>verified_user</span>
              <span className="text-xs text-text-secondary" style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}>End-to-End Encryption Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
