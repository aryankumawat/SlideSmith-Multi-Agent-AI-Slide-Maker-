'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Slide {
  layout: string;
  title: string;
  bullets?: string[];
  notes?: string;
  chart_spec?: any;
  diagram_spec?: any;
  image?: { prompt: string; alt: string; source: string };
  citations?: string[];
}

interface Deck {
  title: string;
  theme: string;
  slides: Slide[];
}

// ─── Theme definitions ────────────────────────────────────────────────────────
const THEMES: Record<string, {
  bg: string; surface: string; titleColor: string; bodyColor: string;
  accentColor: string; mutedColor: string; headerBg: string;
  bulletDot: string; slideNumBg: string; font: string;
  gradient: string;
}> = {
  academic: {
    bg: '#FAFAFA', surface: '#FFFFFF', titleColor: '#1A3A5C', bodyColor: '#2D3748',
    accentColor: '#C0392B', mutedColor: '#718096', headerBg: '#1A3A5C',
    bulletDot: '#C0392B', slideNumBg: '#1A3A5C', font: '"Georgia", serif',
    gradient: 'linear-gradient(135deg, #1A3A5C 0%, #2E5266 100%)',
  },
  corporate: {
    bg: '#F0F4FF', surface: '#FFFFFF', titleColor: '#1E40AF', bodyColor: '#1E293B',
    accentColor: '#2563EB', mutedColor: '#64748B', headerBg: '#1E40AF',
    bulletDot: '#2563EB', slideNumBg: '#1E40AF', font: '"Inter", sans-serif',
    gradient: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
  },
  deep_space: {
    bg: '#0B0F1A', surface: '#101828', titleColor: '#E2E8F0', bodyColor: '#CBD5E1',
    accentColor: '#7C3AED', mutedColor: '#64748B', headerBg: '#1A1F2E',
    bulletDot: '#7C3AED', slideNumBg: '#7C3AED', font: '"Inter", sans-serif',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)',
  },
  ultra_violet: {
    bg: '#0F0820', surface: '#1B1035', titleColor: '#F8FAFC', bodyColor: '#E2D9F3',
    accentColor: '#A855F7', mutedColor: '#7C6FA0', headerBg: '#1B1035',
    bulletDot: '#A855F7', slideNumBg: '#A855F7', font: '"Inter", sans-serif',
    gradient: 'linear-gradient(135deg, #A855F7 0%, #06B6D4 100%)',
  },
  navy_gold: {
    bg: '#0A1628', surface: '#0F2040', titleColor: '#F4C430', bodyColor: '#E2E8F0',
    accentColor: '#F4C430', mutedColor: '#8EA8C3', headerBg: '#06101E',
    bulletDot: '#F4C430', slideNumBg: '#F4C430', font: '"Georgia", serif',
    gradient: 'linear-gradient(135deg, #0A1628 0%, #1A3A6C 100%)',
  },
  minimal: {
    bg: '#FFFFFF', surface: '#F8FAFC', titleColor: '#111827', bodyColor: '#374151',
    accentColor: '#3B82F6', mutedColor: '#9CA3AF', headerBg: '#F1F5F9',
    bulletDot: '#3B82F6', slideNumBg: '#374151', font: '"Inter", sans-serif',
    gradient: 'linear-gradient(135deg, #374151 0%, #6B7280 100%)',
  },
};

const getTheme = (name: string) => THEMES[name] || THEMES.academic;

// ─── Chart palette ────────────────────────────────────────────────────────────
const PALETTE = ['#1A3A5C','#C0392B','#2E86AB','#A23B72','#F18F01','#5C6BC0','#26A69A','#78909C'];

function buildChartData(spec: any) {
  if (spec?.labels && spec?.datasets) {
    const keys = spec.datasets.map((d: any) => d.label || 'Value');
    const data = spec.labels.map((label: string, i: number) => {
      const row: any = { name: label };
      spec.datasets.forEach((ds: any) => { row[ds.label || 'Value'] = ds.data[i] ?? 0; });
      return row;
    });
    return { data, keys };
  }
  return { data: [{ name:'A',Value:40 },{ name:'B',Value:65 },{ name:'C',Value:52 },{ name:'D',Value:78 }], keys: ['Value'] };
}

// ─── In-slide chart ───────────────────────────────────────────────────────────
function SlideChart({ spec, scale }: { spec: any; scale: number }) {
  const type = (spec?.type || spec?.kind || 'bar').toLowerCase();
  const { data, keys } = buildChartData(spec);
  const fontSize = Math.round(10 * scale);
  const tooltipStyle = { fontSize: 10, padding: 4 };

  const commonProps = { data, margin: { top: 8, right: 8, left: 0, bottom: 4 } };
  const axisProps = { tick: { fontSize }, stroke: '#94a3b8' };

  if (type === 'pie' || type === 'doughnut') {
    const pieData = data.map((d: any, i: number) => ({ name: d.name, value: d[keys[0]] ?? 0 }));
    return (
      <PieChart>
        <Pie data={pieData} cx="50%" cy="50%"
          innerRadius={type === 'doughnut' ? '35%' : 0} outerRadius="70%"
          paddingAngle={3} dataKey="value">
          {pieData.map((_: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend iconSize={8} wrapperStyle={{ fontSize }} />
      </PieChart>
    );
  }
  if (type === 'line') return (
    <LineChart {...commonProps}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
      <XAxis dataKey="name" {...axisProps} />
      <YAxis {...axisProps} />
      <Tooltip contentStyle={tooltipStyle} />
      {keys.length > 1 && <Legend wrapperStyle={{ fontSize }} />}
      {keys.map((k: string, i: number) => <Line key={k} type="monotone" dataKey={k} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={{ r: 3 }} />)}
    </LineChart>
  );
  if (type === 'area') return (
    <AreaChart {...commonProps}>
      <defs>{keys.map((k: string, i: number) => (
        <linearGradient key={k} id={`ag-${i}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={PALETTE[i%PALETTE.length]} stopOpacity={0.3}/>
          <stop offset="95%" stopColor={PALETTE[i%PALETTE.length]} stopOpacity={0.02}/>
        </linearGradient>
      ))}</defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
      <XAxis dataKey="name" {...axisProps} />
      <YAxis {...axisProps} />
      <Tooltip contentStyle={tooltipStyle} />
      {keys.map((k: string, i: number) => <Area key={k} type="monotone" dataKey={k} stroke={PALETTE[i%PALETTE.length]} fill={`url(#ag-${i})`} strokeWidth={2} />)}
    </AreaChart>
  );
  // bar (default)
  return (
    <BarChart {...commonProps}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
      <XAxis dataKey="name" {...axisProps} />
      <YAxis {...axisProps} />
      <Tooltip contentStyle={tooltipStyle} />
      {keys.length > 1 && <Legend wrapperStyle={{ fontSize }} />}
      {keys.map((k: string, i: number) => (
        <Bar key={k} dataKey={k} fill={PALETTE[i%PALETTE.length]} radius={[3,3,0,0]}>
          {keys.length === 1 && data.map((_:any, idx:number) => <Cell key={idx} fill={PALETTE[idx%PALETTE.length]} />)}
        </Bar>
      ))}
    </BarChart>
  );
}

// ─── In-slide Diagram (SVG) ───────────────────────────────────────────────────
function SlideDiagram({ spec, scale, theme }: { spec: any; scale: number; theme: ReturnType<typeof getTheme> }) {
  if (!spec) return null;
  const type = spec.type;

  if (type === 'comparison' && spec.left && spec.right) {
    return (
      <div className="grid grid-cols-2 gap-2 h-full">
        {[spec.left, spec.right].map((side: any, si: number) => (
          <div key={si} className="rounded-lg overflow-hidden flex flex-col" style={{ border: `2px solid ${PALETTE[si*2]}` }}>
            <div className="px-2 py-1 text-white text-center font-bold" style={{ backgroundColor: PALETTE[si*2], fontSize: Math.round(11*scale) }}>{side.title}</div>
            <div className="p-2 flex-1" style={{ backgroundColor: '#ffffff10' }}>
              {(side.items || []).map((item: string, ii: number) => (
                <div key={ii} className="flex items-start gap-1 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: PALETTE[si*2] }} />
                  <span style={{ fontSize: Math.round(9*scale), color: theme.bodyColor, lineHeight: 1.3 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'timeline' && spec.events) {
    return (
      <div className="relative h-full overflow-auto px-2 py-1">
        <div className="absolute left-6 top-2 bottom-2 w-0.5" style={{ backgroundColor: theme.mutedColor + '60' }} />
        {(spec.events || []).map((ev: any, i: number) => (
          <div key={i} className="relative flex items-start gap-3 mb-2 pl-10">
            <div className="absolute left-4 top-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: PALETTE[i%PALETTE.length], fontSize: Math.round(7*scale) }}>{i+1}</div>
            <div>
              <span className="font-bold" style={{ fontSize: Math.round(8*scale), color: theme.mutedColor }}>{ev.year} </span>
              <span className="font-semibold" style={{ fontSize: Math.round(9*scale), color: theme.titleColor }}>{ev.label}</span>
              {ev.description && <div style={{ fontSize: Math.round(8*scale), color: theme.bodyColor, lineHeight: 1.3 }}>{ev.description}</div>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'cycle' && spec.nodes) {
    const nodes = spec.nodes || [];
    const size = 180 * scale;
    const r = size/2 - 32*scale;
    const cx = size/2, cy = size/2;
    const nr = 28*scale;
    return (
      <div className="flex justify-center items-center h-full">
        <svg width={size} height={size}>
          {nodes.map((_:any, i: number) => {
            const a1 = (2*Math.PI*i)/nodes.length - Math.PI/2;
            const a2 = (2*Math.PI*(i+1))/nodes.length - Math.PI/2;
            return (
              <line key={i} x1={cx+r*Math.cos(a1)} y1={cy+r*Math.sin(a1)}
                x2={cx+r*Math.cos(a2)} y2={cy+r*Math.sin(a2)}
                stroke={theme.mutedColor+'80'} strokeWidth={1.5} strokeDasharray="4 2"/>
            );
          })}
          {nodes.map((node: any, i: number) => {
            const a = (2*Math.PI*i)/nodes.length - Math.PI/2;
            const x = cx+r*Math.cos(a), y = cy+r*Math.sin(a);
            return (
              <g key={node.id||i}>
                <circle cx={x} cy={y} r={nr} fill={PALETTE[i%PALETTE.length]} opacity={0.92}/>
                <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                  fontSize={Math.round(8*scale)} fontWeight="600" fill="#fff">
                  {(node.label||'').slice(0,10)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // Flowchart / hierarchy (default)
  const nodes = spec.nodes || [];
  const edges = spec.edges || [];
  if (!nodes.length) return null;

  const nw = 90*scale, nh = 38*scale, gap = 48*scale;
  const isH = nodes.length <= 6;
  const svgW = isH ? nodes.length*(nw+gap) : nw + 60*scale;
  const svgH = isH ? nh + 60*scale : nodes.length*(nh+gap);
  const getPos = (i: number) => isH
    ? { x: 8 + i*(nw+gap), y: 10 }
    : { x: 10, y: 8 + i*(nh+gap) };
  const nodeMap: Record<string,number> = {};
  nodes.forEach((n: any, i: number) => { nodeMap[n.id] = i; });

  return (
    <div className="w-full h-full flex items-center justify-center overflow-auto">
      <svg width={svgW} height={svgH} style={{ maxWidth: '100%' }}>
        {edges.map((edge: any, ei: number) => {
          const fi = nodeMap[edge.from], ti = nodeMap[edge.to];
          if (fi===undefined||ti===undefined) return null;
          const fp = getPos(fi), tp = getPos(ti);
          const x1 = isH ? fp.x+nw : fp.x+nw/2;
          const y1 = isH ? fp.y+nh/2 : fp.y+nh;
          const x2 = isH ? tp.x : tp.x+nw/2;
          const y2 = isH ? tp.y+nh/2 : tp.y;
          return (
            <g key={ei}>
              <defs><marker id={`a${ei}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill={theme.mutedColor} /></marker></defs>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={theme.mutedColor} strokeWidth={1.5} markerEnd={`url(#a${ei})`}/>
              {edge.label && <text x={(x1+x2)/2} y={(y1+y2)/2-3} textAnchor="middle" fontSize={Math.round(7*scale)} fill={theme.mutedColor}>{edge.label}</text>}
            </g>
          );
        })}
        {nodes.map((node: any, i: number) => {
          const pos = getPos(i);
          return (
            <g key={node.id||i}>
              <rect x={pos.x} y={pos.y} width={nw} height={nh} rx={6} fill={PALETTE[i%PALETTE.length]} opacity={0.92}/>
              <text x={pos.x+nw/2} y={pos.y+nh/2-(node.description?5*scale:0)}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={Math.round(9*scale)} fontWeight="600" fill="#fff">
                {(node.label||'').slice(0,14)}
              </text>
              {node.description && (
                <text x={pos.x+nw/2} y={pos.y+nh/2+8*scale} textAnchor="middle"
                  fontSize={Math.round(7*scale)} fill="#e2e8f0" opacity={0.85}>
                  {node.description.slice(0,18)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Bold markdown renderer ───────────────────────────────────────────────────
function Bold({ text, accentColor }: { text: string; accentColor: string }) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i} style={{ color: accentColor, fontWeight: 700 }}>{p.slice(2,-2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

// ─── Single slide canvas (16:9) ───────────────────────────────────────────────
function SlideFrame({ slide, theme, slideNum, total, scale = 1 }:
  { slide: Slide; theme: ReturnType<typeof getTheme>; slideNum: number; total: number; scale?: number }) {

  const hasChart = !!slide.chart_spec;
  const hasDiagram = !!slide.diagram_spec;
  const hasVisual = hasChart || hasDiagram;
  const bullets = slide.bullets || [];
  const isTitle = slide.layout === 'title' || slideNum === 1;

  const titleSize = Math.round((isTitle ? 36 : 28) * scale);
  const bulletSize = Math.round(14 * scale);
  const captionSize = Math.round(10 * scale);
  const pad = Math.round(36 * scale);
  const headerH = Math.round(72 * scale);

  return (
    <div className="relative w-full h-full overflow-hidden select-none"
      style={{ backgroundColor: theme.bg, fontFamily: theme.font }}>

      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between"
        style={{ background: theme.gradient, height: headerH, padding: `0 ${pad}px` }}>
        <div className="flex-1 pr-4">
          <p style={{
            fontSize: titleSize, fontWeight: 700, color: '#FFFFFF',
            lineHeight: 1.2, letterSpacing: isTitle ? '-0.02em' : '-0.01em',
          }}>
            <Bold text={slide.title || 'Untitled'} accentColor={
              theme === THEMES.navy_gold ? '#F4C430' :
              theme === THEMES.academic ? '#FFD700' : '#a5f3fc'
            } />
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-white opacity-60" style={{ fontSize: Math.round(9*scale) }}>
            {slideNum} / {total}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="absolute" style={{
        top: headerH + Math.round(16*scale),
        left: pad, right: pad,
        bottom: Math.round(28*scale),
        display: 'flex',
        flexDirection: hasVisual && bullets.length > 0 ? 'row' : 'column',
        gap: Math.round(16*scale),
      }}>

        {/* Bullets */}
        {bullets.length > 0 && (
          <div style={{
            flex: hasVisual ? '0 0 45%' : 1,
            display: 'flex', flexDirection: 'column', gap: Math.round(6*scale),
          }}>
            {bullets.map((b, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="flex-shrink-0 rounded-full"
                  style={{
                    width: Math.round(6*scale), height: Math.round(6*scale),
                    marginTop: Math.round(5*scale), backgroundColor: theme.bulletDot,
                  }} />
                <p style={{ fontSize: bulletSize, color: theme.bodyColor, lineHeight: 1.5, margin: 0 }}>
                  <Bold text={b} accentColor={theme.accentColor} />
                </p>
              </div>
            ))}
            {slide.citations && slide.citations.length > 0 && (
              <div className="mt-auto pt-2 border-t opacity-50" style={{ borderColor: theme.mutedColor }}>
                {slide.citations.slice(0,2).map((c,i) => (
                  <p key={i} style={{ fontSize: captionSize, color: theme.mutedColor, margin: 0 }}>{c}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chart / Diagram panel */}
        {hasVisual && (
          <div style={{
            flex: bullets.length > 0 ? '0 0 53%' : 1,
            display: 'flex', flexDirection: 'column', gap: Math.round(8*scale),
          }}>
            {hasChart && (
              <div className="rounded-xl overflow-hidden"
                style={{ flex: 1, background: '#ffffff0d', border: `1px solid ${theme.mutedColor}40`, padding: Math.round(8*scale) }}>
                {slide.chart_spec?.title && (
                  <p style={{ fontSize: Math.round(10*scale), fontWeight: 600, color: theme.mutedColor, marginBottom: Math.round(4*scale) }}>
                    {slide.chart_spec.title}
                  </p>
                )}
                <div style={{ height: Math.round((hasChart && hasDiagram ? 120 : 200) * scale) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <SlideChart spec={slide.chart_spec} scale={scale} />
                  </ResponsiveContainer>
                </div>
                {slide.chart_spec?.caption && (
                  <p style={{ fontSize: Math.round(8*scale), color: theme.mutedColor, fontStyle: 'italic', marginTop: 4 }}>
                    {slide.chart_spec.caption}
                  </p>
                )}
              </div>
            )}
            {hasDiagram && (
              <div className="rounded-xl overflow-hidden"
                style={{ flex: 1, background: '#ffffff08', border: `1px solid ${theme.mutedColor}40`, padding: Math.round(8*scale) }}>
                <p style={{ fontSize: Math.round(9*scale), fontWeight: 600, color: theme.mutedColor, marginBottom: Math.round(4*scale), textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {slide.diagram_spec?.type} diagram
                  {slide.diagram_spec?.title && ` — ${slide.diagram_spec.title}`}
                </p>
                <div style={{ height: Math.round((hasChart && hasDiagram ? 100 : 180) * scale) }}>
                  <SlideDiagram spec={slide.diagram_spec} scale={scale} theme={theme} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Title-only center text */}
        {isTitle && bullets.length === 0 && !hasVisual && (
          <div className="flex-1 flex items-center justify-center">
            <p style={{ fontSize: Math.round(22*scale), color: theme.mutedColor, textAlign: 'center', fontStyle: 'italic' }}>
              Introduction
            </p>
          </div>
        )}
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: Math.round(4*scale), background: theme.gradient }} />
    </div>
  );
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────
function Thumbnail({ slide, theme, num, total, active, onClick }:
  { slide: Slide; theme: ReturnType<typeof getTheme>; num: number; total: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`group relative rounded-lg overflow-hidden transition-all duration-150 w-full focus:outline-none ${
        active ? 'ring-2 ring-blue-500 shadow-lg' : 'ring-1 ring-white/10 hover:ring-white/30'
      }`}
      style={{ aspectRatio: '16/9' }}>
      <div className="w-full h-full" style={{ transform: 'scale(1)', transformOrigin: 'top left' }}>
        <SlideFrame slide={slide} theme={theme} slideNum={num} total={total} scale={0.18} />
      </div>
      <div className={`absolute inset-0 flex items-end justify-start p-1 ${active ? '' : 'group-hover:bg-white/5'}`}>
        <span className="text-white text-[8px] font-bold opacity-60 bg-black/40 px-1 rounded">{num}</span>
      </div>
    </button>
  );
}

// ─── Main SlideCanvas export ──────────────────────────────────────────────────
export function SlideCanvas({ deck }: { deck: Deck }) {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const theme = getTheme(deck.theme);
  const slides = deck.slides;
  const slide = slides[current];

  // Responsive scale
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        setScale(w / 960); // base width 960px
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const prev = () => setCurrent(c => Math.max(0, c - 1));
  const next = () => setCurrent(c => Math.min(slides.length - 1, c + 1));

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-full min-h-0 overflow-hidden" style={{ backgroundColor: '#0F1117' }}>

      {/* ── Left panel: slide thumbnails ── */}
      <div className="flex-shrink-0 w-44 overflow-y-auto py-3 px-2 space-y-2"
        style={{ backgroundColor: '#1a1d27', borderRight: '1px solid #ffffff15' }}>
        <p className="text-[10px] text-white/30 font-semibold uppercase tracking-widest px-1 mb-2">
          {slides.length} Slides
        </p>
        {slides.map((s, i) => (
          <Thumbnail key={i} slide={s} theme={theme} num={i+1} total={slides.length}
            active={current === i} onClick={() => setCurrent(i)} />
        ))}
      </div>

      {/* ── Center: main slide ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Main canvas */}
        <div className="flex-1 flex items-center justify-center p-6 min-h-0">
          <div ref={containerRef} className="w-full shadow-2xl rounded-xl overflow-hidden"
            style={{ maxWidth: 960, aspectRatio: '16/9', position: 'relative' }}>
            {slide && (
              <SlideFrame slide={slide} theme={theme}
                slideNum={current+1} total={slides.length} scale={scale} />
            )}
          </div>
        </div>

        {/* Navigation bar */}
        <div className="flex-shrink-0 flex items-center justify-center gap-4 pb-4">
          <button onClick={prev} disabled={current === 0}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-white/10"
            style={{ border: '1px solid #ffffff30', color: '#fff' }}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className="rounded-full transition-all"
                style={{
                  width: current===i ? 20 : 6, height: 6,
                  backgroundColor: current===i ? theme.accentColor : '#ffffff30',
                }} />
            ))}
          </div>
          <button onClick={next} disabled={current === slides.length - 1}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-white/10"
            style={{ border: '1px solid #ffffff30', color: '#fff' }}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Speaker notes */}
        {slide?.notes && (
          <div className="flex-shrink-0 px-6 pb-3">
            <div className="rounded-lg p-3" style={{ backgroundColor: '#ffffff08', border: '1px solid #ffffff15' }}>
              <p className="text-xs font-semibold text-white/40 mb-1 uppercase tracking-wider">Speaker Notes</p>
              <p className="text-sm text-white/60">{slide.notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
