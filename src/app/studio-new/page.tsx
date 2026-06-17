'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlideCanvas } from '@/components/SlideCanvas';
import Link from 'next/link';

// ── Interfaces ────────────────────────────────────────────────────────────────

interface Slide {
  layout: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  stat_blocks?: Array<{ value: string; label: string }> | null;
  cards?: Array<{ icon: string; title: string; description: string }> | null;
  notes?: string;
  chart_spec?: any;
  diagram_spec?: any;
  image?: { prompt: string; alt: string; source: string; url?: string };
  citations?: string[];
}

interface Deck {
  title: string;
  theme: string;
  slides: Slide[];
}

interface LoadingState {
  progress: number;
  message: string;
  deckTitle: string;
  slideTopics: string[];
  completedSlides: number;
  totalSlides: number;
  currentTitle: string;
}

interface FormData {
  topic: string;
  num_slides: number;
  theme: string;
  tone: string;
  audience: string;
  text_density: string;
  content_format: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LOADING_INIT: LoadingState = {
  progress: 0,
  message: 'Starting…',
  deckTitle: '',
  slideTopics: [],
  completedSlides: 0,
  totalSlides: 0,
  currentTitle: '',
};

const DEFAULT_FORM: FormData = {
  topic: '',
  num_slides: 10,
  theme: 'dark_modern',
  tone: 'professional',
  audience: 'general',
  text_density: 'balanced',
  content_format: 'mixed',
};

const EASE = [0.32, 0.72, 0, 1] as const;

const RECOMMENDATION_CHIPS = [
  'AI in Healthcare',
  'Startup Pitch Deck',
  'Quarterly Earnings',
  'Architecture Portfolio',
];

const THEME_OPTIONS = [
  { value: 'dark_modern', label: 'Dark Modern' },
  { value: 'corporate_blue', label: 'Corporate Blue' },
  { value: 'minimal_white', label: 'Minimal White' },
  { value: 'academic_research', label: 'Academic Research' },
  { value: 'creative_bold', label: 'Creative Bold' },
  { value: 'nature_green', label: 'Nature Green' },
];

const NAV_ITEMS = [
  { icon: 'account_tree', label: 'Research', id: 'research' },
  { icon: 'dashboard', label: 'Structure', id: 'structure' },
  { icon: 'layers', label: 'Layout', id: 'layout' },
  { icon: 'edit_note', label: 'Writing', id: 'writing' },
  { icon: 'image', label: 'Media', id: 'media' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const strip = (text: string) =>
  text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').trim();

// ── Sub-components ────────────────────────────────────────────────────────────

function TopNav({
  showSearch = false,
  onNewDeck,
  deckTitle,
}: {
  showSearch?: boolean;
  onNewDeck?: () => void;
  deckTitle?: string;
}) {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 border-b border-subtle bg-surface"
      style={{ height: 64 }}
    >
      {/* Left */}
      <div className="flex items-center gap-6">
        <span
          className="font-bold text-primary"
          style={{ fontFamily: 'var(--font-syne)', fontSize: 18, letterSpacing: '-0.02em' }}
        >
          SlideSmith
        </span>
        <div className="flex items-center gap-1">
          {['Projects', 'Studio', 'Intelligence'].map((item) => (
            <button
              key={item}
              className="px-3 py-1.5 rounded-lg text-sm text-on-surface-variant hover:text-on-surface transition-colors"
              style={{ fontFamily: 'var(--font-syne)', fontSize: 13 }}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Center search (editor state) */}
      {showSearch && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-subtle bg-surface-container"
          style={{ minWidth: 280 }}
        >
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>
            search
          </span>
          <span className="text-on-surface-variant" style={{ fontSize: 13 }}>
            Search slides… <kbd className="opacity-50 text-xs">⌘K</kbd>
          </span>
        </div>
      )}

      {/* Right */}
      <div className="flex items-center gap-3">
        {deckTitle && (
          <span
            className="text-on-surface-variant text-sm max-w-[200px] truncate hidden md:block"
            style={{ fontSize: 12 }}
          >
            {deckTitle}
          </span>
        )}
        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>
            settings
          </span>
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>
            notifications
          </span>
        </button>
        {onNewDeck ? (
          <>
            <button
              onClick={onNewDeck}
              className="px-3 py-1.5 rounded-lg border border-subtle text-on-surface-variant hover:text-on-surface text-xs font-bold transition-colors"
              style={{ fontFamily: 'var(--font-syne)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
            >
              New deck
            </button>
            <Link
              href="/export"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold accent-gradient-bg hover:opacity-90 transition-opacity"
              style={{ fontFamily: 'var(--font-syne)', letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none' }}
            >
              Export
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
            </Link>
          </>
        ) : (
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold accent-gradient-bg hover:opacity-90 transition-opacity"
            style={{ fontFamily: 'var(--font-syne)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
          >
            Export
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
          </button>
        )}
        <div
          className="w-8 h-8 rounded-full accent-gradient-bg flex items-center justify-center text-white text-xs font-bold cursor-pointer"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          A
        </div>
      </div>
    </nav>
  );
}

function LeftSidebarNav({ activeItem = 'layout' }: { activeItem?: string }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV_ITEMS.map((item) => {
        const isActive = item.id === activeItem;
        return (
          <button
            key={item.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              isActive
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
            style={{ fontFamily: 'var(--font-syne)', fontSize: 13, fontWeight: isActive ? 600 : 400 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {item.icon}
            </span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

// ── Screen 1: Studio Dashboard ────────────────────────────────────────────────

function StudioDashboard({
  onGenerate,
  isLoading,
  error,
}: {
  onGenerate: (data: FormData) => void;
  isLoading: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.topic.trim()) onGenerate(form);
  };

  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      <TopNav />

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="fixed top-[76px] left-1/2 z-50 -translate-x-1/2 rounded-xl border px-4 py-3 bg-surface-card"
            style={{ maxWidth: 520, width: 'calc(100% - 32px)', borderColor: 'rgba(255,100,100,0.2)' }}
          >
            <p className="font-bold text-xs mb-1" style={{ color: '#FF6B6B', letterSpacing: '0.06em' }}>
              Generation failed
            </p>
            <p className="text-xs leading-relaxed" style={{ color: '#AA4444' }}>{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden" style={{ paddingTop: 64 }}>
        {/* Left sidebar */}
        <aside
          className="flex flex-col flex-shrink-0 border-r border-subtle bg-surface-container overflow-y-auto"
          style={{ width: 280 }}
        >
          {/* Header */}
          <div className="px-5 py-5 border-b border-subtle">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
                auto_awesome
              </span>
              <h2
                className="font-bold text-on-surface"
                style={{ fontFamily: 'var(--font-syne)', fontSize: 14, letterSpacing: '-0.01em' }}
              >
                Presentation Studio
              </h2>
            </div>
            <p
              className="text-on-surface-variant"
              style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              AI Multi-Agent Mode
            </p>
          </div>

          {/* Nav */}
          <div className="py-3">
            <LeftSidebarNav activeItem="layout" />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Generation form */}
          <div className="px-4 py-4 border-t border-subtle">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <textarea
                value={form.topic}
                onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                placeholder="What are we building today?"
                rows={3}
                disabled={isLoading}
                className="w-full rounded-xl border border-subtle bg-surface-container-high text-on-surface text-sm resize-none px-3 py-2.5 placeholder-on-surface-variant focus:outline-none focus:border-primary-container transition-colors"
                style={{ fontFamily: 'var(--font-geist-sans)', fontSize: 12, lineHeight: 1.5 }}
              />

              {/* Slide count stepper */}
              <div className="flex items-center justify-between">
                <span
                  className="text-on-surface-variant text-xs"
                  style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10, letterSpacing: '0.06em' }}
                >
                  SLIDES
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, num_slides: Math.max(8, f.num_slides - 1) }))}
                    className="w-6 h-6 flex items-center justify-center rounded-lg border border-subtle text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                    disabled={isLoading}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>remove</span>
                  </button>
                  <span
                    className="text-on-surface font-bold w-6 text-center"
                    style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 13 }}
                  >
                    {form.num_slides}
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, num_slides: Math.min(20, f.num_slides + 1) }))}
                    className="w-6 h-6 flex items-center justify-center rounded-lg border border-subtle text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                    disabled={isLoading}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
                  </button>
                </div>
              </div>

              {/* Theme dropdown */}
              <select
                value={form.theme}
                onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))}
                disabled={isLoading}
                className="w-full rounded-xl border border-subtle bg-surface-container-high text-on-surface text-xs px-3 py-2 focus:outline-none focus:border-primary-container transition-colors appearance-none"
                style={{ fontFamily: 'var(--font-geist-sans)', fontSize: 12 }}
              >
                {THEME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Generate button */}
              <button
                type="submit"
                disabled={isLoading || !form.topic.trim()}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-white font-bold text-xs accent-gradient-bg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                style={{ fontFamily: 'var(--font-syne)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  {isLoading ? 'refresh' : 'rocket_launch'}
                </span>
                {isLoading ? 'Generating…' : 'Generate Deck'}
              </button>
            </form>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-background-deep px-8 py-12">
          {/* AI illustration / glassmorphism panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="glass-panel rounded-2xl p-6 mb-8 glow-cyan"
            style={{ maxWidth: 480, width: '100%' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p
                  className="text-on-surface-variant text-xs mb-1"
                  style={{ fontFamily: 'var(--font-geist-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                >
                  AGENTS:ACTIVE
                </p>
                <div className="flex items-center gap-2">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                      className="w-2 h-2 rounded-full"
                      style={{ background: 'var(--ss-cyan)' }}
                    />
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p
                  className="text-on-surface-variant text-xs mb-1"
                  style={{ fontFamily: 'var(--font-geist-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 10 }}
                >
                  RENDER_ENGINE_V2.4
                </p>
                <div
                  className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(0,212,255,0.15)', color: 'var(--ss-cyan)', fontSize: 10, fontFamily: 'var(--font-geist-mono)' }}
                >
                  READY
                </div>
              </div>
            </div>

            {/* Agent grid visualization */}
            <div className="grid grid-cols-3 gap-2">
              {['Research', 'Structure', 'Layout', 'Writing', 'Media', 'QA'].map((agent, i) => (
                <motion.div
                  key={agent}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
                  className="rounded-lg border border-subtle p-2 text-center"
                  style={{ background: 'rgba(0,212,255,0.04)' }}
                >
                  <p className="text-on-surface-variant" style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 9, letterSpacing: '0.06em' }}>
                    {agent.toUpperCase()}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            className="text-center mb-4"
          >
            <h1
              className="font-bold text-on-surface mb-3"
              style={{
                fontFamily: 'var(--font-syne)',
                fontSize: 'clamp(28px, 4vw, 48px)',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
              }}
            >
              Turn any idea into a{' '}
              <span className="accent-gradient-text">presentation</span>
            </h1>
            <p
              className="text-on-surface-variant mx-auto"
              style={{ maxWidth: 480, fontSize: 15, lineHeight: 1.6 }}
            >
              21 specialized AI agents collaborate to research, structure, write,
              and design your deck — from a single prompt.
            </p>
          </motion.div>

          {/* Recommendation chips */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
            className="flex flex-wrap justify-center gap-2 mt-4"
          >
            {RECOMMENDATION_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => {
                  /* Scroll left sidebar into view on mobile if needed */
                  document
                    .querySelector<HTMLTextAreaElement>('textarea[placeholder]')
                    ?.focus();
                  const el = document.querySelector<HTMLTextAreaElement>('textarea[placeholder]');
                  if (el) el.value = chip;
                }}
                className="px-4 py-2 rounded-full border border-subtle bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high text-sm transition-colors"
                style={{ fontFamily: 'var(--font-geist-sans)', fontSize: 12 }}
              >
                {chip}
              </button>
            ))}
          </motion.div>
        </main>

        {/* Right sidebar */}
        <aside
          className="flex flex-col flex-shrink-0 border-l border-subtle overflow-y-auto"
          style={{ width: 320, background: 'var(--color-surface-container-low)' }}
        >
          <div className="px-5 py-4 border-b border-subtle">
            <h3
              className="font-bold text-on-surface"
              style={{ fontFamily: 'var(--font-syne)', fontSize: 13, letterSpacing: '-0.01em' }}
            >
              Deck Intelligence
            </h3>
          </div>

          <div className="p-4 flex flex-col gap-4">
            {/* Empty state */}
            <div
              className="rounded-2xl border-2 border-dashed border-subtle flex flex-col items-center justify-center py-10 text-center"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <span className="material-symbols-outlined text-on-surface-variant mb-3" style={{ fontSize: 36, opacity: 0.4 }}>
                analytics
              </span>
              <p className="text-on-surface-variant text-xs leading-relaxed" style={{ fontSize: 12, maxWidth: 160 }}>
                Generate a deck to unlock intelligence insights
              </p>
            </div>

            {/* Teaser: Semantic Consistency */}
            <div className="rounded-xl border border-subtle bg-surface-container p-4">
              <div className="flex items-center justify-between mb-3">
                <p
                  className="text-on-surface text-xs font-bold"
                  style={{ fontFamily: 'var(--font-syne)', fontSize: 12 }}
                >
                  Semantic Consistency
                </p>
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>
                  insights
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                <div className="h-full w-0 rounded-full accent-gradient-bg" />
              </div>
              <p className="text-on-surface-variant mt-2" style={{ fontSize: 10, fontFamily: 'var(--font-geist-mono)' }}>
                — / 100
              </p>
            </div>

            {/* Teaser: Visual Impact Score */}
            <div className="rounded-xl border border-subtle bg-surface-container p-4">
              <div className="flex items-center justify-between mb-3">
                <p
                  className="text-on-surface text-xs font-bold"
                  style={{ fontFamily: 'var(--font-syne)', fontSize: 12 }}
                >
                  Visual Impact Score
                </p>
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>
                  bar_chart
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                <div className="h-full w-0 rounded-full accent-gradient-bg" />
              </div>
              <p className="text-on-surface-variant mt-2" style={{ fontSize: 10, fontFamily: 'var(--font-geist-mono)' }}>
                — / 100
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Screen 2: AI Workflow Live ────────────────────────────────────────────────

function WorkflowLive({ loadingState }: { loadingState: LoadingState }) {
  const { progress, message, deckTitle, slideTopics, completedSlides, totalSlides } = loadingState;
  const hasOutline = slideTopics.length > 0;

  const workflowNodes = [
    { id: 'research', label: 'Research', icon: 'account_tree', done: progress >= 10 },
    { id: 'structuring', label: 'Structuring', icon: 'dashboard', done: hasOutline },
    { id: 'writing', label: 'Writing', icon: 'bolt', active: progress < 95 && progress >= 5, done: progress >= 95 },
    { id: 'layout', label: 'Layout', icon: 'layers', done: progress >= 95 },
    { id: 'media', label: 'Media', icon: 'image', done: progress >= 99 },
  ];

  const agentLogs = [
    { time: '00:01', agent: 'Planner', msg: message },
    { time: '00:03', agent: 'Researcher', msg: hasOutline ? `Outline: ${totalSlides} slides` : 'Gathering context…' },
    { time: '00:08', agent: 'Writer', msg: hasOutline ? `Writing slide ${completedSlides + 1}…` : 'Waiting for outline…' },
    { time: '00:12', agent: 'Layout', msg: progress >= 95 ? 'Applying theme…' : 'Queued' },
    { time: '00:15', agent: 'Media', msg: progress >= 99 ? 'Sourcing images…' : 'Queued' },
  ];

  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      <TopNav />

      <div className="flex flex-1 overflow-hidden" style={{ paddingTop: 64 }}>
        {/* Left sidebar */}
        <aside
          className="flex flex-col flex-shrink-0 border-r border-subtle bg-surface-container overflow-y-auto"
          style={{ width: 280 }}
        >
          {/* Active Constraints card */}
          <div className="px-4 py-4 border-b border-subtle">
            <p
              className="text-on-surface-variant text-xs mb-3"
              style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}
            >
              Active Constraints
            </p>
            {[
              { label: 'Tone', value: 'Professional' },
              { label: 'Complexity', value: 'Standard' },
              { label: 'Agent Count', value: '21' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-2 border-b border-subtle"
              >
                <span className="text-on-surface-variant text-xs">{item.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-on-surface text-xs font-bold" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                    {item.value}
                  </span>
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 14 }}>
                    health_and_safety
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pipeline nodes */}
          <div className="px-4 py-4">
            <p
              className="text-on-surface-variant text-xs mb-3"
              style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}
            >
              Pipeline Nodes
            </p>
            <div className="flex flex-col gap-2">
              {workflowNodes.map((node) => (
                <div
                  key={node.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                    node.active
                      ? 'border-primary-container bg-surface-container-high'
                      : node.done
                      ? 'border-subtle bg-surface-container'
                      : 'border-subtle opacity-40'
                  }`}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 16,
                      color: node.active
                        ? 'var(--color-primary-container)'
                        : node.done
                        ? 'var(--ss-cyan)'
                        : 'var(--color-on-surface-variant)',
                    }}
                  >
                    {node.done ? 'check_circle' : node.icon}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      node.active
                        ? 'text-primary'
                        : node.done
                        ? 'text-on-surface-variant'
                        : 'text-on-surface-variant'
                    }`}
                    style={{ fontSize: 12, fontFamily: 'var(--font-syne)' }}
                  >
                    {node.label}
                  </span>
                  {node.active && (
                    <motion.div
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="ml-auto w-1.5 h-1.5 rounded-full"
                      style={{ background: 'var(--color-primary-container)' }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1" />

          {/* Bottom regenerate */}
          <div className="p-4 border-t border-subtle">
            <div
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-white font-bold text-xs opacity-40 cursor-not-allowed accent-gradient-bg"
              style={{ fontFamily: 'var(--font-syne)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
              Regenerate Deck
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex flex-1 flex-col overflow-y-auto bg-background-deep px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1
              className="font-bold text-on-surface mb-2"
              style={{
                fontFamily: 'var(--font-syne)',
                fontSize: 'clamp(22px, 3vw, 32px)',
                letterSpacing: '-0.02em',
              }}
            >
              Collaborative Agent Synthesis
            </h1>
            <p className="text-on-surface-variant" style={{ fontSize: 14 }}>
              21 specialized AI agents working in parallel on your presentation
            </p>
            {deckTitle && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2 font-bold text-on-surface"
                style={{ fontFamily: 'var(--font-syne)', fontSize: 16, letterSpacing: '-0.01em' }}
              >
                {deckTitle}
              </motion.p>
            )}
          </div>

          {/* Workflow nodes row */}
          <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-2">
            {workflowNodes.map((node, idx) => (
              <div key={node.id} className="flex items-center">
                <div className="flex flex-col items-center gap-2" style={{ minWidth: 90 }}>
                  <div
                    className={`relative flex items-center justify-center rounded-full transition-all ${
                      node.active ? 'w-12 h-12' : 'w-9 h-9'
                    }`}
                    style={{
                      background: node.done
                        ? 'rgba(0,212,255,0.2)'
                        : node.active
                        ? 'rgba(0,212,255,0.15)'
                        : 'rgba(255,255,255,0.04)',
                      border: node.done
                        ? '2px solid var(--ss-cyan)'
                        : node.active
                        ? '2px solid var(--color-primary-container)'
                        : '2px solid rgba(255,255,255,0.08)',
                      boxShadow: node.active ? '0 0 20px rgba(0,212,255,0.3)' : 'none',
                    }}
                  >
                    {node.active && (
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{ border: '2px solid var(--color-primary-container)' }}
                      />
                    )}
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: node.active ? 22 : 18,
                        color: node.done
                          ? 'var(--ss-cyan)'
                          : node.active
                          ? 'var(--color-primary-container)'
                          : 'rgba(255,255,255,0.2)',
                      }}
                    >
                      {node.done ? 'check_circle' : node.icon}
                    </span>
                  </div>
                  <span
                    className={`text-xs text-center ${
                      node.active
                        ? 'text-primary font-bold'
                        : node.done
                        ? 'text-on-surface-variant'
                        : 'text-outline opacity-40'
                    }`}
                    style={{ fontSize: 11, fontFamily: 'var(--font-syne)' }}
                  >
                    {node.label}
                    {node.active && (
                      <span className="block text-xs" style={{ color: 'var(--color-primary-container)', fontSize: 9 }}>
                        ACTIVE
                      </span>
                    )}
                  </span>
                </div>
                {idx < workflowNodes.length - 1 && (
                  <div
                    className="flex-1 h-0.5 mx-1 rounded-full"
                    style={{
                      minWidth: 32,
                      background:
                        workflowNodes[idx + 1].done || workflowNodes[idx + 1].active
                          ? 'linear-gradient(90deg, var(--ss-cyan), var(--color-primary-container))'
                          : 'rgba(255,255,255,0.06)',
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Content Synthesis Hub card */}
          <div className="rounded-2xl border border-subtle bg-surface-card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <p
                className="text-on-surface font-bold"
                style={{ fontFamily: 'var(--font-syne)', fontSize: 13 }}
              >
                Content Synthesis Hub
              </p>
              <div
                className="px-2 py-0.5 rounded-full text-xs"
                style={{ background: 'rgba(0,212,255,0.12)', color: 'var(--ss-cyan)', fontFamily: 'var(--font-geist-mono)', fontSize: 10 }}
              >
                LIVE
              </div>
            </div>

            {/* 16:9 animated placeholder */}
            <div
              className="relative rounded-xl overflow-hidden mb-4"
              style={{ aspectRatio: '16/9', background: 'var(--ss-bg-deep)' }}
            >
              {/* Skeleton slides */}
              <div className="absolute inset-0 grid grid-cols-3 gap-1 p-2 opacity-30">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                    className="rounded-lg bg-surface-container"
                    style={{ aspectRatio: '16/9' }}
                  />
                ))}
              </div>

              {/* Central pulsing indicator */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.8, 0.5, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex flex-col items-center gap-2"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--ss-cyan)' }}>
                    bolt
                  </span>
                  <p
                    className="text-on-surface-variant text-xs"
                    style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11 }}
                  >
                    {hasOutline
                      ? `Slide ${completedSlides} / ${totalSlides}`
                      : 'Building outline…'}
                  </p>
                </motion.div>
              </div>

              {/* Agent avatars */}
              <div className="absolute bottom-3 left-3 flex -space-x-1">
                {['R', 'S', 'W', 'L', 'M'].map((a, i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                    className="w-6 h-6 rounded-full border border-surface-card flex items-center justify-center text-xs font-bold text-white accent-gradient-bg"
                    style={{ fontSize: 9, fontFamily: 'var(--font-syne)' }}
                  >
                    {a}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-subtle bg-surface-container-low p-3">
                <p
                  className="text-on-surface-variant text-xs mb-1"
                  style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10, letterSpacing: '0.06em' }}
                >
                  TOKENS INGESTED
                </p>
                <motion.p
                  className="text-on-surface font-bold"
                  style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 20 }}
                >
                  {Math.round(progress * 142).toLocaleString()}
                </motion.p>
              </div>
              <div className="rounded-xl border border-subtle bg-surface-container-low p-3">
                <p
                  className="text-on-surface-variant text-xs mb-1"
                  style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10, letterSpacing: '0.06em' }}
                >
                  AGENTS ASSIGNED
                </p>
                <p
                  className="text-on-surface font-bold"
                  style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 20 }}
                >
                  {hasOutline ? 21 : 7}
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Right sidebar */}
        <aside
          className="flex flex-col flex-shrink-0 border-l border-subtle bg-surface-container overflow-hidden"
          style={{ width: 320 }}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-subtle flex items-center justify-between">
            <h3
              className="font-bold text-on-surface"
              style={{ fontFamily: 'var(--font-syne)', fontSize: 13 }}
            >
              Agent Activity
            </h3>
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,212,255,0.12)', color: 'var(--ss-cyan)' }}
            >
              <motion.div
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--ss-cyan)' }}
              />
              <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10 }}>LIVE</span>
            </div>
          </div>

          {/* Agent log entries */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
            <AnimatePresence>
              {agentLogs.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="flex gap-2.5 items-start"
                >
                  <span
                    className="text-on-surface-variant flex-shrink-0 mt-0.5"
                    style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10 }}
                  >
                    {log.time}
                  </span>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span
                      className="font-bold"
                      style={{
                        fontFamily: 'var(--font-geist-mono)',
                        fontSize: 10,
                        color: 'var(--color-primary-container)',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {log.agent.toUpperCase()}
                    </span>
                    <span
                      className="text-on-surface-variant leading-relaxed"
                      style={{ fontSize: 11 }}
                    >
                      {log.msg}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Generation progress */}
          <div className="px-4 py-4 border-t border-subtle">
            <div className="flex items-center justify-between mb-2">
              <p
                className="text-on-surface text-xs font-bold"
                style={{ fontFamily: 'var(--font-syne)', fontSize: 12 }}
              >
                Generation Progress
              </p>
              <motion.span
                key={Math.floor(progress)}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-bold"
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: 14,
                  color: 'var(--color-primary-container)',
                }}
              >
                {progress}%
              </motion.span>
            </div>
            <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                className="h-full rounded-full accent-gradient-bg relative overflow-hidden"
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                    animation: 'ss-shimmer 1.8s ease-in-out infinite',
                  }}
                />
              </motion.div>
            </div>
            <p
              className="text-on-surface-variant mt-2 text-xs"
              style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10 }}
            >
              {message}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Screen 3: Presentation Editor ─────────────────────────────────────────────

function PresentationEditor({
  deck,
  onNewDeck,
}: {
  deck: Deck;
  onNewDeck: () => void;
}) {
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);

  // Circular SVG ring helper
  function CircleRing({
    pct,
    color,
    size = 72,
    strokeWidth = 6,
    label,
  }: {
    pct: number;
    color: string;
    size?: number;
    strokeWidth?: number;
    label: string;
  }) {
    const r = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    return (
      <div className="flex flex-col items-center gap-1">
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${circ}` }}
            animate={{ strokeDasharray: `${dash} ${circ}` }}
            transition={{ duration: 1.2, ease: EASE, delay: 0.3 }}
          />
        </svg>
        <span
          className="text-on-surface font-bold"
          style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 13, marginTop: -52, position: 'relative', zIndex: 1, transform: 'none' }}
        >
          {pct}%
        </span>
        <p className="text-on-surface-variant text-xs text-center" style={{ fontSize: 11, marginTop: 8 }}>{label}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      <TopNav showSearch deckTitle={strip(deck.title)} onNewDeck={onNewDeck} />

      <div className="flex flex-1 overflow-hidden" style={{ paddingTop: 64 }}>
        {/* Left sidebar */}
        <aside
          className="flex flex-col flex-shrink-0 border-r border-subtle bg-surface-container overflow-y-auto"
          style={{ width: 280 }}
        >
          {/* Header */}
          <div className="px-5 py-5 border-b border-subtle">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg accent-gradient-bg flex items-center justify-center">
                <span className="material-symbols-outlined text-white" style={{ fontSize: 14 }}>
                  auto_awesome
                </span>
              </div>
              <h2
                className="font-bold text-on-surface"
                style={{ fontFamily: 'var(--font-syne)', fontSize: 14, letterSpacing: '-0.01em' }}
              >
                Presentation Studio
              </h2>
            </div>
            <p
              className="text-on-surface-variant"
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              AI Multi-Agent Mode
            </p>
          </div>

          {/* Nav */}
          <div className="py-3">
            <LeftSidebarNav activeItem="layout" />
          </div>

          <div className="flex-1" />

          {/* Footer actions */}
          <div className="p-4 border-t border-subtle flex flex-col gap-2">
            <button
              onClick={onNewDeck}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-white font-bold text-xs accent-gradient-bg hover:opacity-90 transition-opacity"
              style={{ fontFamily: 'var(--font-syne)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
              Regenerate Deck
            </button>
            <div className="flex gap-2">
              <button className="flex-1 py-2 rounded-lg border border-subtle text-on-surface-variant hover:text-on-surface text-xs transition-colors" style={{ fontSize: 11 }}>
                Support
              </button>
              <button className="flex-1 py-2 rounded-lg border border-subtle text-on-surface-variant hover:text-on-surface text-xs transition-colors" style={{ fontSize: 11 }}>
                Settings
              </button>
            </div>
          </div>
        </aside>

        {/* Main canvas area */}
        <main className="flex flex-1 flex-col overflow-hidden bg-background-deep">
          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center overflow-hidden px-8 py-6">
            <div
              className="w-full rounded-[20px] overflow-hidden bg-surface-card"
              style={{ maxWidth: 1200, aspectRatio: '16/9' }}
            >
              <SlideCanvas deck={deck} />
            </div>
          </div>

          {/* Filmstrip */}
          <div
            className="flex-shrink-0 border-t border-subtle bg-surface-container-low overflow-x-auto"
            style={{ height: 128 }}
          >
            <div className="flex items-center gap-2 px-4 h-full" style={{ width: 'max-content' }}>
              {deck.slides.map((slide, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlideIdx(idx)}
                  className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                    idx === activeSlideIdx ? 'border-primary-container' : 'border-subtle hover:border-outline'
                  }`}
                  style={{ width: 160, height: 90 }}
                >
                  <div
                    className="w-full h-full flex flex-col items-center justify-center gap-1 bg-surface-container"
                    style={{ padding: 8 }}
                  >
                    <span
                      className="text-on-surface-variant font-bold"
                      style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10 }}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <p
                      className="text-on-surface text-center leading-tight overflow-hidden"
                      style={{
                        fontSize: 9,
                        fontFamily: 'var(--font-syne)',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        maxWidth: '100%',
                      }}
                    >
                      {slide.title}
                    </p>
                  </div>
                </button>
              ))}

              {/* Controls */}
              <div className="ml-4 flex-shrink-0 flex items-center gap-2">
                <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-subtle text-on-surface-variant hover:text-on-surface transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>remove</span>
                </button>
                <span className="text-on-surface-variant text-xs" style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11 }}>
                  100%
                </span>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-subtle text-on-surface-variant hover:text-on-surface transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold accent-gradient-bg hover:opacity-90 transition-opacity ml-2" style={{ fontFamily: 'var(--font-syne)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>play_arrow</span>
                  Present
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Right sidebar: Quality Dashboard */}
        <aside
          className="flex flex-col flex-shrink-0 border-l border-subtle bg-surface-container overflow-y-auto"
          style={{ width: 320 }}
        >
          <div className="px-5 py-4 border-b border-subtle">
            <h3
              className="font-bold text-on-surface"
              style={{ fontFamily: 'var(--font-syne)', fontSize: 13 }}
            >
              Quality Dashboard
            </h3>
          </div>

          <div className="p-4 flex flex-col gap-4">
            {/* Circular progress rings */}
            <div className="rounded-xl border border-subtle bg-surface-container-low p-4">
              <div className="flex justify-around items-start">
                {/* Accuracy ring */}
                <div className="relative flex flex-col items-center" style={{ width: 80 }}>
                  <svg width={72} height={72} style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx={36} cy={36} r={30} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
                    <motion.circle
                      cx={36}
                      cy={36}
                      r={30}
                      fill="none"
                      stroke="var(--color-primary-container)"
                      strokeWidth={6}
                      strokeLinecap="round"
                      initial={{ strokeDasharray: '0 188.4' }}
                      animate={{ strokeDasharray: '173.3 188.4' }}
                      transition={{ duration: 1.2, ease: EASE, delay: 0.3 }}
                    />
                  </svg>
                  <span
                    className="absolute text-on-surface font-bold"
                    style={{
                      fontFamily: 'var(--font-geist-mono)',
                      fontSize: 13,
                      top: 24,
                    }}
                  >
                    92%
                  </span>
                  <p className="text-on-surface-variant text-center mt-2" style={{ fontSize: 10 }}>
                    Accuracy
                  </p>
                </div>

                {/* Accessibility ring */}
                <div className="relative flex flex-col items-center" style={{ width: 80 }}>
                  <svg width={72} height={72} style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx={36} cy={36} r={30} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
                    <motion.circle
                      cx={36}
                      cy={36}
                      r={30}
                      fill="none"
                      stroke="var(--color-secondary)"
                      strokeWidth={6}
                      strokeLinecap="round"
                      initial={{ strokeDasharray: '0 188.4' }}
                      animate={{ strokeDasharray: '147 188.4' }}
                      transition={{ duration: 1.2, ease: EASE, delay: 0.5 }}
                    />
                  </svg>
                  <span
                    className="absolute text-on-surface font-bold"
                    style={{
                      fontFamily: 'var(--font-geist-mono)',
                      fontSize: 13,
                      top: 24,
                    }}
                  >
                    78%
                  </span>
                  <p className="text-on-surface-variant text-center mt-2" style={{ fontSize: 10 }}>
                    Accessibility
                  </p>
                </div>
              </div>
            </div>

            {/* Readability bar */}
            <div className="rounded-xl border border-subtle bg-surface-container-low p-4">
              <div className="flex items-center justify-between mb-3">
                <p
                  className="text-on-surface text-xs font-bold"
                  style={{ fontFamily: 'var(--font-syne)', fontSize: 12 }}
                >
                  Readability
                </p>
                <span
                  className="font-bold"
                  style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 12, color: 'var(--color-primary-container)' }}
                >
                  85%
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '85%' }}
                  transition={{ duration: 1, ease: EASE, delay: 0.4 }}
                  className="h-full rounded-full accent-gradient-bg"
                />
              </div>
            </div>

            {/* Deck stats */}
            <div className="rounded-xl border border-subtle bg-surface-container-low p-4">
              <p
                className="text-on-surface text-xs font-bold mb-3"
                style={{ fontFamily: 'var(--font-syne)', fontSize: 12 }}
              >
                Deck Stats
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Slides', value: String(deck.slides.length) },
                  { label: 'Theme', value: deck.theme.replace(/_/g, ' ') },
                  { label: 'Status', value: 'Complete' },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between">
                    <span className="text-on-surface-variant text-xs">{stat.label}</span>
                    <span
                      className="text-on-surface font-bold text-xs"
                      style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11 }}
                    >
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Agent Logs terminal */}
            <div className="rounded-xl border border-subtle bg-surface-container-lowest p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 14 }}>
                  terminal
                </span>
                <p
                  className="text-on-surface text-xs font-bold"
                  style={{ fontFamily: 'var(--font-syne)', fontSize: 12 }}
                >
                  AI Agent Logs
                </p>
              </div>
              <div className="flex flex-col gap-1">
                {[
                  `> deck "${strip(deck.title)}" generated`,
                  `> ${deck.slides.length} slides rendered`,
                  `> theme: ${deck.theme}`,
                  '> all agents complete',
                ].map((line, i) => (
                  <p
                    key={i}
                    className="text-on-surface-variant"
                    style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10, lineHeight: 1.6 }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <button className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-white font-bold text-xs accent-gradient-bg hover:opacity-90 transition-opacity" style={{ fontFamily: 'var(--font-syne)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_fix_high</span>
              Smart Polish
            </button>
            <button className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-subtle text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high text-xs font-bold transition-colors" style={{ fontFamily: 'var(--font-syne)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>palette</span>
              Theme Architect
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────

export default function StudioNewPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>(LOADING_INIT);
  const [generatedDeck, setGeneratedDeck] = useState<Deck | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (data: any) => {
    setIsLoading(true);
    setError(null);
    setLoadingState(LOADING_INIT);

    // Map internal form shape → API schema
    const THEME_MAP: Record<string, string> = {
      dark_modern: 'deep_space',
      corporate_blue: 'corporate',
      minimal_white: 'minimal',
      academic_research: 'academic',
      creative_bold: 'ultra_violet',
      nature_green: 'minimal',
    };
    const DENSITY_MAP: Record<string, string> = {
      balanced: 'medium',
      minimal: 'low',
      detailed: 'text_heavy',
      low: 'low',
      medium: 'medium',
      text_heavy: 'text_heavy',
    };

    const payload = {
      mode: 'quick_prompt',
      topic_or_prompt: data.topic ?? data.topic_or_prompt ?? '',
      slide_count: data.num_slides ?? data.slide_count ?? 10,
      theme: THEME_MAP[data.theme] ?? data.theme ?? 'deep_space',
      tone: data.tone ?? 'professional',
      audience: data.audience ?? 'general',
      text_density: DENSITY_MAP[data.text_density] ?? data.text_density ?? 'medium',
      content_format: data.content_format ?? 'mixed',
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000);

      const response = await fetch('/api/generate-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok || !response.body) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          let event: any;
          try { event = JSON.parse(part.slice(6)); } catch { continue; }

          if (event.type === 'planning') {
            setLoadingState(s => ({ ...s, message: event.message, progress: event.progress }));
          } else if (event.type === 'outline') {
            setLoadingState(s => ({
              ...s,
              deckTitle: event.title,
              slideTopics: event.slideTopics,
              totalSlides: event.totalSlides,
              progress: event.progress,
              message: 'Writing slides…',
            }));
          } else if (event.type === 'slide') {
            setLoadingState(s => ({
              ...s,
              completedSlides: event.index,
              currentTitle: event.title,
              totalSlides: event.totalSlides,
              progress: event.progress,
              message: `Slide ${event.index} of ${event.totalSlides}`,
            }));
          } else if (event.type === 'complete') {
            setGeneratedDeck(event.deck);
            sessionStorage.setItem('ss-deck', JSON.stringify(event.deck));
            setIsLoading(false);
            return;
          } else if (event.type === 'error') {
            throw new Error(event.message);
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error
        ? (err.name === 'AbortError' ? 'Request timed out. Is Ollama running? (ollama serve)' : err.message)
        : 'An unknown error occurred';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Screen 2: AI Workflow Live
  if (isLoading) {
    return <WorkflowLive loadingState={loadingState} />;
  }

  // Screen 3: Presentation Editor
  if (generatedDeck) {
    return (
      <PresentationEditor
        deck={generatedDeck}
        onNewDeck={() => { setGeneratedDeck(null); setError(null); }}
      />
    );
  }

  // Screen 1: Studio Dashboard
  return (
    <StudioDashboard
      onGenerate={handleGenerate}
      isLoading={isLoading}
      error={error}
    />
  );
}
