'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface StatBlock { value: string; label: string; }
interface Card { icon: string; title: string; description: string; }

interface Slide {
  layout: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  stat_blocks?: StatBlock[] | null;
  cards?: Card[] | null;
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

// ─── Theme definitions ────────────────────────────────────────────────────────
interface ThemeConfig {
  bg: string; surface: string; titleColor: string; bodyColor: string;
  accentColor: string; mutedColor: string; headerBg: string;
  bulletDot: string; font: string; gradient: string;
  cardBg: string; cardBorder: string;
}

const THEMES: Record<string, ThemeConfig> = {
  academic: {
    bg: '#FAFAFA', surface: '#FFFFFF', titleColor: '#1A3A5C', bodyColor: '#2D3748',
    accentColor: '#C0392B', mutedColor: '#718096', headerBg: '#1A3A5C',
    bulletDot: '#C0392B', font: '"Georgia", serif',
    gradient: 'linear-gradient(135deg, #1A3A5C 0%, #2E5266 100%)',
    cardBg: '#FFFFFF', cardBorder: '#E2E8F0',
  },
  corporate: {
    bg: '#F0F4FF', surface: '#FFFFFF', titleColor: '#1E40AF', bodyColor: '#1E293B',
    accentColor: '#2563EB', mutedColor: '#64748B', headerBg: '#1E40AF',
    bulletDot: '#2563EB', font: '"Inter", sans-serif',
    gradient: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
    cardBg: '#FFFFFF', cardBorder: '#DBEAFE',
  },
  deep_space: {
    bg: '#0B0F1A', surface: '#101828', titleColor: '#E2E8F0', bodyColor: '#CBD5E1',
    accentColor: '#7C3AED', mutedColor: '#64748B', headerBg: '#1A1F2E',
    bulletDot: '#7C3AED', font: '"Inter", sans-serif',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)',
    cardBg: 'rgba(255,255,255,0.05)', cardBorder: 'rgba(255,255,255,0.1)',
  },
  ultra_violet: {
    bg: '#0F0820', surface: '#1B1035', titleColor: '#F8FAFC', bodyColor: '#E2D9F3',
    accentColor: '#A855F7', mutedColor: '#7C6FA0', headerBg: '#1B1035',
    bulletDot: '#A855F7', font: '"Inter", sans-serif',
    gradient: 'linear-gradient(135deg, #A855F7 0%, #06B6D4 100%)',
    cardBg: 'rgba(255,255,255,0.05)', cardBorder: 'rgba(168,85,247,0.2)',
  },
  navy_gold: {
    bg: '#0A1628', surface: '#0F2040', titleColor: '#F4C430', bodyColor: '#E2E8F0',
    accentColor: '#F4C430', mutedColor: '#8EA8C3', headerBg: '#06101E',
    bulletDot: '#F4C430', font: '"Georgia", serif',
    gradient: 'linear-gradient(135deg, #0A1628 0%, #1A3A6C 100%)',
    cardBg: 'rgba(244,196,48,0.06)', cardBorder: 'rgba(244,196,48,0.2)',
  },
  minimal: {
    bg: '#FFFFFF', surface: '#F8FAFC', titleColor: '#111827', bodyColor: '#374151',
    accentColor: '#3B82F6', mutedColor: '#9CA3AF', headerBg: '#F1F5F9',
    bulletDot: '#3B82F6', font: '"Inter", sans-serif',
    gradient: 'linear-gradient(135deg, #374151 0%, #6B7280 100%)',
    cardBg: '#FFFFFF', cardBorder: '#E5E7EB',
  },
};

const getTheme = (name: string): ThemeConfig => THEMES[name] || THEMES.academic;

// ─── Color palette ────────────────────────────────────────────────────────────
const PALETTE = ['#1A3A5C', '#C0392B', '#2E86AB', '#A23B72', '#F18F01', '#5C6BC0', '#26A69A', '#78909C'];

// ─── Chart data builder ───────────────────────────────────────────────────────
function buildChartData(spec: any) {
  // Chart.js format: { labels: [...], datasets: [...] }
  if (spec?.labels && spec?.datasets) {
    const keys = spec.datasets.map((d: any) => d.label || 'Value');
    const data = spec.labels.map((label: string, i: number) => {
      const row: any = { name: label };
      spec.datasets.forEach((ds: any) => { row[ds.label || 'Value'] = ds.data[i] ?? 0; });
      return row;
    });
    return { data, keys };
  }
  // Simple format: { data: [{ name, value }, ...] }
  if (Array.isArray(spec?.data) && spec.data.length > 0) {
    const sample = spec.data[0];
    const keys = Object.keys(sample).filter(k => k !== 'name' && typeof sample[k] === 'number');
    if (keys.length > 0) return { data: spec.data, keys };
    // If values aren't numbers, map to Value key
    return { data: spec.data.map((d: any) => ({ name: d.name ?? d.label ?? '', Value: Number(d.value ?? d.Value ?? d.y ?? 0) })), keys: ['Value'] };
  }
  return { data: [{ name: 'A', Value: 40 }, { name: 'B', Value: 65 }, { name: 'C', Value: 52 }, { name: 'D', Value: 78 }], keys: ['Value'] };
}

// ─── Inline chart component ───────────────────────────────────────────────────
function SlideChart({ spec, scale, width = 400, height = 250 }: { spec: any; scale: number; width?: number; height?: number }) {
  const type = (spec?.type || 'bar').toLowerCase();
  const { data, keys } = buildChartData(spec);
  const fontSize = Math.max(8, Math.round(9 * scale));
  const commonProps = { data, width, height, margin: { top: 4, right: 8, left: -16, bottom: 2 } };
  const axisProps = { tick: { fontSize }, stroke: '#94a3b8' };
  const tooltipStyle = { fontSize: 10, padding: 4 };

  if (type === 'pie' || type === 'doughnut') {
    const pieData = data.map((d: any) => ({ name: d.name, value: d[keys[0]] ?? 0 }));
    return (
      <PieChart>
        <Pie data={pieData} cx="50%" cy="50%" innerRadius={type === 'doughnut' ? '35%' : 0} outerRadius="72%" paddingAngle={3} dataKey="value">
          {pieData.map((_: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend iconSize={8} wrapperStyle={{ fontSize }} />
      </PieChart>
    );
  }
  if (type === 'line') return (
    <LineChart {...commonProps}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" />
      <XAxis dataKey="name" {...axisProps} />
      <YAxis {...axisProps} />
      <Tooltip contentStyle={tooltipStyle} />
      {keys.length > 1 && <Legend wrapperStyle={{ fontSize }} />}
      {keys.map((k: string, i: number) => <Line key={k} type="monotone" dataKey={k} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={{ r: 2 }} />)}
    </LineChart>
  );
  if (type === 'area') return (
    <AreaChart {...commonProps}>
      <defs>{keys.map((k: string, i: number) => (
        <linearGradient key={k} id={`ag${i}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.35} />
          <stop offset="95%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.02} />
        </linearGradient>
      ))}</defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" />
      <XAxis dataKey="name" {...axisProps} />
      <YAxis {...axisProps} />
      <Tooltip contentStyle={tooltipStyle} />
      {keys.map((k: string, i: number) => <Area key={k} type="monotone" dataKey={k} stroke={PALETTE[i % PALETTE.length]} fill={`url(#ag${i})`} strokeWidth={2} />)}
    </AreaChart>
  );
  return (
    <BarChart {...commonProps}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" />
      <XAxis dataKey="name" {...axisProps} />
      <YAxis {...axisProps} />
      <Tooltip contentStyle={tooltipStyle} />
      {keys.length > 1 && <Legend wrapperStyle={{ fontSize }} />}
      {keys.map((k: string, i: number) => (
        <Bar key={k} dataKey={k} fill={PALETTE[i % PALETTE.length]} radius={[3, 3, 0, 0]}>
          {keys.length === 1 && data.map((_: any, idx: number) => <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />)}
        </Bar>
      ))}
    </BarChart>
  );
}

// ─── Flowchart / cycle diagram ────────────────────────────────────────────────
function SlideDiagram({ spec, scale, theme }: { spec: any; scale: number; theme: ThemeConfig }) {
  if (!spec) return null;
  const type = spec.type;

  if (type === 'cycle' && spec.nodes) {
    const nodes = spec.nodes || [];
    const size = 180 * scale;
    const r = size / 2 - 32 * scale;
    const cx = size / 2, cy = size / 2;
    const nr = 28 * scale;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <svg width={size} height={size}>
          {nodes.map((_: any, i: number) => {
            const a1 = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
            const a2 = (2 * Math.PI * (i + 1)) / nodes.length - Math.PI / 2;
            return <line key={i} x1={cx + r * Math.cos(a1)} y1={cy + r * Math.sin(a1)} x2={cx + r * Math.cos(a2)} y2={cy + r * Math.sin(a2)} stroke={theme.mutedColor + '80'} strokeWidth={1.5} strokeDasharray="4 2" />;
          })}
          {nodes.map((node: any, i: number) => {
            const a = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
            const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
            return (
              <g key={node.id || i}>
                <circle cx={x} cy={y} r={nr} fill={PALETTE[i % PALETTE.length]} opacity={0.92} />
                <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={Math.round(8 * scale)} fontWeight="600" fill="#fff">{(node.label || '').slice(0, 10)}</text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // Flowchart / hierarchy
  const nodes = spec.nodes || [];
  const edges = spec.edges || [];
  if (!nodes.length) return null;

  const nw = 90 * scale, nh = 38 * scale, gap = 48 * scale;
  const isH = nodes.length <= 6;
  const svgW = isH ? nodes.length * (nw + gap) : nw + 60 * scale;
  const svgH = isH ? nh + 60 * scale : nodes.length * (nh + gap);
  const getPos = (i: number) => isH ? { x: 8 + i * (nw + gap), y: 10 } : { x: 10, y: 8 + i * (nh + gap) };
  const nodeMap: Record<string, number> = {};
  nodes.forEach((n: any, i: number) => { nodeMap[n.id] = i; });

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
      <svg width={svgW} height={svgH} style={{ maxWidth: '100%' }}>
        {edges.map((edge: any, ei: number) => {
          const fi = nodeMap[edge.from], ti = nodeMap[edge.to];
          if (fi === undefined || ti === undefined) return null;
          const fp = getPos(fi), tp = getPos(ti);
          const x1 = isH ? fp.x + nw : fp.x + nw / 2;
          const y1 = isH ? fp.y + nh / 2 : fp.y + nh;
          const x2 = isH ? tp.x : tp.x + nw / 2;
          const y2 = isH ? tp.y + nh / 2 : tp.y;
          return (
            <g key={ei}>
              <defs><marker id={`a${ei}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill={theme.mutedColor} /></marker></defs>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={theme.mutedColor} strokeWidth={1.5} markerEnd={`url(#a${ei})`} />
            </g>
          );
        })}
        {nodes.map((node: any, i: number) => {
          const pos = getPos(i);
          return (
            <g key={node.id || i}>
              <rect x={pos.x} y={pos.y} width={nw} height={nh} rx={6} fill={PALETTE[i % PALETTE.length]} opacity={0.92} />
              <text x={pos.x + nw / 2} y={pos.y + nh / 2} textAnchor="middle" dominantBaseline="middle" fontSize={Math.round(9 * scale)} fontWeight="600" fill="#fff">{(node.label || '').slice(0, 14)}</text>
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
          ? <strong key={i} style={{ color: accentColor, fontWeight: 700 }}>{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

// ─── Shared slide elements ────────────────────────────────────────────────────
function SlideHeader({ title, slideNum, total, theme, scale }: {
  title: string; slideNum: number; total: number; theme: ThemeConfig; scale: number;
}) {
  const h = Math.round(68 * scale);
  const pad = Math.round(36 * scale);
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: h,
      background: theme.gradient, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: `0 ${pad}px`,
    }}>
      <p style={{ fontSize: Math.round(21 * scale), fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2, flex: 1, marginRight: Math.round(12 * scale) }}>
        {title}
      </p>
      <span style={{ fontSize: Math.round(9 * scale), color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}>
        {slideNum} / {total}
      </span>
    </div>
  );
}

function SlideAccentLine({ theme, scale }: { theme: ThemeConfig; scale: number }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: Math.round(4 * scale), background: theme.gradient,
    }} />
  );
}

function StatBlockCard({ stat, theme, scale, color }: { stat: StatBlock; theme: ThemeConfig; scale: number; color: string }) {
  return (
    <div style={{
      flex: 1, borderRadius: Math.round(10 * scale),
      background: theme.cardBg, border: `1px solid ${theme.cardBorder}`,
      padding: `${Math.round(10 * scale)}px ${Math.round(14 * scale)}px`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      boxShadow: `0 ${Math.round(2 * scale)}px ${Math.round(8 * scale)}px rgba(0,0,0,0.08)`,
    }}>
      <p style={{ fontSize: Math.round(30 * scale), fontWeight: 800, color, lineHeight: 1, marginBottom: Math.round(4 * scale) }}>
        {stat.value}
      </p>
      <p style={{ fontSize: Math.round(10 * scale), color: theme.mutedColor, textAlign: 'center', lineHeight: 1.3 }}>
        {stat.label}
      </p>
    </div>
  );
}

// ─── LAYOUT: Title ────────────────────────────────────────────────────────────
function TitleSlide({ slide, theme, slideNum, total, scale }: {
  slide: Slide; theme: ThemeConfig; slideNum: number; total: number; scale: number;
}) {
  const pad = Math.round(64 * scale);
  return (
    <div style={{ position: 'absolute', inset: 0, background: theme.gradient, fontFamily: theme.font, overflow: 'hidden' }}>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', top: Math.round(-80 * scale), right: Math.round(-80 * scale), width: Math.round(320 * scale), height: Math.round(320 * scale), borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
      <div style={{ position: 'absolute', bottom: Math.round(-60 * scale), left: Math.round(-60 * scale), width: Math.round(240 * scale), height: Math.round(240 * scale), borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
      <div style={{ position: 'absolute', top: '35%', left: '58%', width: Math.round(120 * scale), height: Math.round(120 * scale), borderRadius: '50%', background: 'rgba(255,255,255,0.025)' }} />

      {/* Center content */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `0 ${pad}px` }}>
        <div style={{ fontSize: Math.round(10 * scale), fontWeight: 600, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: Math.round(14 * scale) }}>
          Presentation
        </div>
        <h1 style={{ fontSize: Math.round(44 * scale), fontWeight: 800, color: '#FFFFFF', textAlign: 'center', lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: Math.round(14 * scale), maxWidth: Math.round(780 * scale) }}>
          {slide.title}
        </h1>
        <div style={{ width: Math.round(56 * scale), height: Math.round(3 * scale), background: 'rgba(255,255,255,0.4)', borderRadius: 2, marginBottom: Math.round(16 * scale) }} />
        {slide.subtitle && (
          <p style={{ fontSize: Math.round(17 * scale), color: 'rgba(255,255,255,0.78)', textAlign: 'center', lineHeight: 1.55, maxWidth: Math.round(640 * scale), marginBottom: Math.round(26 * scale) }}>
            {slide.subtitle}
          </p>
        )}
        {slide.bullets && slide.bullets.length > 0 && (
          <div style={{ display: 'flex', gap: Math.round(8 * scale), flexWrap: 'wrap', justifyContent: 'center' }}>
            {slide.bullets.slice(0, 3).map((b, i) => (
              <span key={i} style={{ padding: `${Math.round(5 * scale)}px ${Math.round(14 * scale)}px`, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: Math.round(100 * scale), fontSize: Math.round(11 * scale), color: 'rgba(255,255,255,0.88)' }}>
                {b.replace(/\*\*/g, '')}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ position: 'absolute', bottom: Math.round(16 * scale), right: Math.round(20 * scale), fontSize: Math.round(9 * scale), color: 'rgba(255,255,255,0.35)' }}>
        {slideNum} / {total}
      </div>
      <SlideAccentLine theme={theme} scale={scale} />
    </div>
  );
}

// ─── LAYOUT: Section Divider ──────────────────────────────────────────────────
function SectionDividerSlide({ slide, theme, slideNum, total, scale, sectionNum }: {
  slide: Slide; theme: ThemeConfig; slideNum: number; total: number; scale: number; sectionNum: number;
}) {
  const leftW = Math.round(260 * scale);
  const pad = Math.round(44 * scale);
  return (
    <div style={{ position: 'absolute', inset: 0, background: theme.bg, fontFamily: theme.font, overflow: 'hidden' }}>
      {/* Left gradient panel */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: leftW, background: theme.gradient, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: Math.round(72 * scale), fontWeight: 900, color: 'rgba(255,255,255,0.14)', lineHeight: 1, fontFamily: 'sans-serif' }}>
          {String(sectionNum).padStart(2, '0')}
        </span>
        <span style={{ fontSize: Math.round(9 * scale), fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', marginTop: Math.round(6 * scale) }}>
          SECTION
        </span>
      </div>

      {/* Right content */}
      <div style={{ position: 'absolute', left: leftW + Math.round(8 * scale), top: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: `0 ${pad}px` }}>
        <h1 style={{ fontSize: Math.round(36 * scale), fontWeight: 800, color: theme.titleColor, lineHeight: 1.15, marginBottom: Math.round(12 * scale), letterSpacing: '-0.01em' }}>
          {slide.title}
        </h1>
        <div style={{ width: Math.round(44 * scale), height: Math.round(3 * scale), background: theme.accentColor, borderRadius: 2, marginBottom: Math.round(14 * scale) }} />
        {slide.subtitle && (
          <p style={{ fontSize: Math.round(15 * scale), color: theme.mutedColor, lineHeight: 1.55, marginBottom: Math.round(10 * scale), maxWidth: Math.round(360 * scale) }}>
            {slide.subtitle}
          </p>
        )}
        {slide.bullets?.[0] && (
          <p style={{ fontSize: Math.round(13 * scale), color: theme.bodyColor, lineHeight: 1.6, maxWidth: Math.round(360 * scale) }}>
            {slide.bullets[0].replace(/\*\*/g, '')}
          </p>
        )}
      </div>

      <div style={{ position: 'absolute', bottom: Math.round(14 * scale), right: Math.round(20 * scale), fontSize: Math.round(9 * scale), color: theme.mutedColor }}>
        {slideNum} / {total}
      </div>
      <SlideAccentLine theme={theme} scale={scale} />
    </div>
  );
}

// ─── LAYOUT: Center Focus (Summary / KPI) ─────────────────────────────────────
function CenterFocusSlide({ slide, theme, slideNum, total, scale }: {
  slide: Slide; theme: ThemeConfig; slideNum: number; total: number; scale: number;
}) {
  const headerH = Math.round(68 * scale);
  const pad = Math.round(36 * scale);
  const statH = Math.round(88 * scale);
  const statBlocks = slide.stat_blocks?.length ? slide.stat_blocks.slice(0, 3) : null;

  return (
    <div style={{ position: 'absolute', inset: 0, background: theme.bg, fontFamily: theme.font, overflow: 'hidden' }}>
      <SlideHeader title={slide.title} slideNum={slideNum} total={total} theme={theme} scale={scale} />

      {/* Central content */}
      <div style={{
        position: 'absolute',
        top: headerH + Math.round(16 * scale),
        bottom: statBlocks ? statH + Math.round(36 * scale) : Math.round(36 * scale),
        left: Math.round(80 * scale), right: Math.round(80 * scale),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: Math.round(-40 * scale), background: theme.accentColor, opacity: 0.06, borderRadius: '50%', filter: `blur(${Math.round(40 * scale)}px)` }} />
          {slide.subtitle ? (
            <>
              <p style={{ fontSize: Math.round(22 * scale), fontWeight: 600, color: theme.titleColor, fontStyle: 'italic', lineHeight: 1.45, position: 'relative', marginBottom: slide.bullets?.[0] ? Math.round(14 * scale) : 0 }}>
                "{slide.subtitle}"
              </p>
              {slide.bullets?.[0] && (
                <p style={{ fontSize: Math.round(13 * scale), color: theme.mutedColor, position: 'relative' }}>
                  {slide.bullets[0].replace(/\*\*/g, '')}
                </p>
              )}
            </>
          ) : slide.bullets?.[0] ? (
            <p style={{ fontSize: Math.round(20 * scale), fontWeight: 600, color: theme.titleColor, lineHeight: 1.5 }}>
              <Bold text={slide.bullets[0]} accentColor={theme.accentColor} />
            </p>
          ) : (
            <p style={{ fontSize: Math.round(18 * scale), color: theme.mutedColor, fontStyle: 'italic' }}>Key takeaways</p>
          )}
        </div>
      </div>

      {/* Stat blocks row */}
      {statBlocks && (
        <div style={{ position: 'absolute', bottom: Math.round(28 * scale), left: pad, right: pad, display: 'flex', gap: Math.round(14 * scale), height: statH }}>
          {statBlocks.map((stat, i) => (
            <StatBlockCard key={i} stat={stat} theme={theme} scale={scale} color={PALETTE[i % PALETTE.length]} />
          ))}
        </div>
      )}

      <SlideAccentLine theme={theme} scale={scale} />
    </div>
  );
}

// ─── LAYOUT: Grid Cards ───────────────────────────────────────────────────────
function GridCardsSlide({ slide, theme, slideNum, total, scale }: {
  slide: Slide; theme: ThemeConfig; slideNum: number; total: number; scale: number;
}) {
  const headerH = Math.round(68 * scale);
  const pad = Math.round(28 * scale);
  const gap = Math.round(14 * scale);
  const cardColors = [theme.accentColor, PALETTE[2], PALETTE[0], PALETTE[4]];

  const cards: Card[] = slide.cards?.length
    ? slide.cards.slice(0, 4)
    : (slide.bullets || []).slice(0, 4).map((b, i) => ({
      icon: ['🔬', '📊', '⚡', '🛡️'][i] || '•',
      title: b.replace(/\*\*(.*?)\*\*/g, '$1').split(':')[0].trim() || `Point ${i + 1}`,
      description: b.replace(/\*\*/g, '').split(':').slice(1).join(':').trim() || b.replace(/\*\*/g, ''),
    }));

  return (
    <div style={{ position: 'absolute', inset: 0, background: theme.bg, fontFamily: theme.font }}>
      <SlideHeader title={slide.title} slideNum={slideNum} total={total} theme={theme} scale={scale} />
      <div style={{
        position: 'absolute',
        top: headerH + Math.round(14 * scale),
        left: pad, right: pad, bottom: Math.round(22 * scale),
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr', gap,
      }}>
        {cards.map((card, i) => (
          <div key={i} style={{
            borderRadius: Math.round(12 * scale), background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`, overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            boxShadow: `0 ${Math.round(2 * scale)}px ${Math.round(12 * scale)}px rgba(0,0,0,0.07)`,
          }}>
            <div style={{ height: Math.round(4 * scale), background: cardColors[i % cardColors.length] }} />
            <div style={{ padding: `${Math.round(12 * scale)}px ${Math.round(16 * scale)}px`, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(8 * scale), marginBottom: Math.round(7 * scale) }}>
                <span style={{ fontSize: Math.round(22 * scale) }}>{card.icon}</span>
                <p style={{ fontSize: Math.round(13 * scale), fontWeight: 700, color: theme.titleColor, lineHeight: 1.2 }}>{card.title}</p>
              </div>
              <p style={{ fontSize: Math.round(11 * scale), color: theme.bodyColor, lineHeight: 1.5, flex: 1 }}>{card.description}</p>
            </div>
          </div>
        ))}
      </div>
      <SlideAccentLine theme={theme} scale={scale} />
    </div>
  );
}

// ─── LAYOUT: Data Insight ─────────────────────────────────────────────────────
function DataInsightSlide({ slide, theme, slideNum, total, scale }: {
  slide: Slide; theme: ThemeConfig; slideNum: number; total: number; scale: number;
}) {
  const headerH = Math.round(68 * scale);
  const pad = Math.round(28 * scale);
  const statRowH = Math.round(80 * scale);
  const gap = Math.round(14 * scale);
  const chartPad = Math.round(10 * scale);
  const hasBullet = !!slide.bullets?.[0];
  const chartTop = headerH + statRowH + (hasBullet ? Math.round(52 * scale) : Math.round(14 * scale));
  const chartBottom = Math.round(22 * scale);
  const captionH = slide.chart_spec?.caption ? Math.round(16 * scale) : 4;
  // Explicit pixel height so ResponsiveContainer resolves correctly
  const chartInnerH = Math.round(540 * scale) - chartTop - chartBottom - 2 * chartPad - captionH;

  const statBlocks: StatBlock[] = slide.stat_blocks?.length
    ? slide.stat_blocks.slice(0, 3)
    : [{ value: '—', label: 'Metric 1' }, { value: '—', label: 'Metric 2' }, { value: '—', label: 'Metric 3' }];

  return (
    <div style={{ position: 'absolute', inset: 0, background: theme.bg, fontFamily: theme.font }}>
      <SlideHeader title={slide.title} slideNum={slideNum} total={total} theme={theme} scale={scale} />

      {/* Stat blocks row */}
      <div style={{ position: 'absolute', top: headerH + Math.round(12 * scale), left: pad, right: pad, height: statRowH, display: 'flex', gap }}>
        {statBlocks.map((stat, i) => (
          <StatBlockCard key={i} stat={stat} theme={theme} scale={scale} color={PALETTE[i % PALETTE.length]} />
        ))}
      </div>

      {/* Bullet insight */}
      {hasBullet && (
        <div style={{
          position: 'absolute',
          top: headerH + statRowH + Math.round(20 * scale),
          left: pad, right: pad,
          padding: `${Math.round(7 * scale)}px ${Math.round(12 * scale)}px`,
          background: theme.cardBg, border: `1px solid ${theme.cardBorder}`,
          borderLeft: `${Math.round(3 * scale)}px solid ${theme.accentColor}`,
          borderRadius: Math.round(6 * scale),
        }}>
          <p style={{ fontSize: Math.round(11 * scale), color: theme.bodyColor, lineHeight: 1.45, margin: 0 }}>
            <Bold text={slide.bullets![0]} accentColor={theme.accentColor} />
          </p>
        </div>
      )}

      {/* Chart — explicit pixel height so ResponsiveContainer resolves */}
      {slide.chart_spec && chartInnerH > 20 && (
        <div style={{
          position: 'absolute',
          top: chartTop, left: pad, right: pad, bottom: chartBottom,
          borderRadius: Math.round(10 * scale),
          background: theme.cardBg, border: `1px solid ${theme.cardBorder}`,
          padding: chartPad,
          overflow: 'hidden',
        }}>
          {slide.chart_spec?.caption && (
            <p style={{ fontSize: Math.round(9 * scale), color: theme.mutedColor, marginBottom: Math.round(3 * scale), fontStyle: 'italic', margin: 0 }}>{slide.chart_spec.caption}</p>
          )}
          <div style={{ height: chartInnerH }}>
            <ResponsiveContainer width="100%" height="100%">
              <SlideChart spec={slide.chart_spec} scale={scale} />
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <SlideAccentLine theme={theme} scale={scale} />
    </div>
  );
}

// ─── LAYOUT: Split (text + visual) ───────────────────────────────────────────
function SplitSlide({ slide, theme, slideNum, total, scale }: {
  slide: Slide; theme: ThemeConfig; slideNum: number; total: number; scale: number;
}) {
  const headerH = Math.round(68 * scale);
  const pad = Math.round(30 * scale);
  const gap = Math.round(18 * scale);
  const bullets = slide.bullets || [];
  const hasChart = !!slide.chart_spec;
  const hasDiagram = !!slide.diagram_spec;
  const hasImage = !!slide.image?.url;
  const hasVisual = hasChart || hasDiagram || hasImage;

  return (
    <div style={{ position: 'absolute', inset: 0, background: theme.bg, fontFamily: theme.font }}>
      <SlideHeader title={slide.title} slideNum={slideNum} total={total} theme={theme} scale={scale} />
      <div style={{
        position: 'absolute', top: headerH + Math.round(12 * scale),
        left: pad, right: pad, bottom: Math.round(22 * scale),
        display: 'flex', gap,
      }}>
        {bullets.length > 0 && (
          <div style={{ flex: hasVisual ? '0 0 44%' : 1, display: 'flex', flexDirection: 'column', gap: Math.round(8 * scale), justifyContent: 'center' }}>
            {bullets.slice(0, 6).map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: Math.round(8 * scale), alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0, width: Math.round(7 * scale), height: Math.round(7 * scale), borderRadius: '50%', marginTop: Math.round(5 * scale), background: PALETTE[i % PALETTE.length] }} />
                <p style={{ fontSize: Math.round(14 * scale), color: theme.bodyColor, lineHeight: 1.5, margin: 0 }}>
                  <Bold text={b} accentColor={theme.accentColor} />
                </p>
              </div>
            ))}
            {slide.citations?.slice(0, 1).map((c, i) => (
              <p key={i} style={{ fontSize: Math.round(9 * scale), color: theme.mutedColor, fontStyle: 'italic', marginTop: Math.round(6 * scale) }}>{c}</p>
            ))}
          </div>
        )}
        {hasVisual && (
          <div style={{ flex: bullets.length > 0 ? '0 0 53%' : 1, display: 'flex', flexDirection: 'column', gap: Math.round(10 * scale), minHeight: 0 }}>
            {hasChart && (
              <div style={{ flex: 1, minHeight: 0, borderRadius: Math.round(10 * scale), background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, padding: Math.round(10 * scale), overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {slide.chart_spec?.title && <p style={{ fontSize: Math.round(9 * scale), color: theme.mutedColor, marginBottom: Math.round(4 * scale), fontWeight: 600, flexShrink: 0 }}>{slide.chart_spec.title}</p>}
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <SlideChart spec={slide.chart_spec} scale={scale} />
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {hasDiagram && !hasChart && (
              <div style={{ flex: 1 }}>
                <SlideDiagram spec={slide.diagram_spec} scale={scale} theme={theme} />
              </div>
            )}
            {hasImage && !hasChart && !hasDiagram && (
              <div style={{ flex: 1, borderRadius: Math.round(10 * scale), overflow: 'hidden', boxShadow: `0 ${Math.round(4 * scale)}px ${Math.round(16 * scale)}px rgba(0,0,0,0.15)` }}>
                <img
                  src={slide.image!.url}
                  alt={slide.image!.alt || slide.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </div>
        )}
      </div>
      <SlideAccentLine theme={theme} scale={scale} />
    </div>
  );
}

// ─── LAYOUT: Comparison ───────────────────────────────────────────────────────
function ComparisonSlide({ slide, theme, slideNum, total, scale }: {
  slide: Slide; theme: ThemeConfig; slideNum: number; total: number; scale: number;
}) {
  const headerH = Math.round(68 * scale);
  const pad = Math.round(28 * scale);
  const gap = Math.round(16 * scale);
  const diag = slide.diagram_spec;
  const left = diag?.left || { title: 'Before', items: (slide.bullets || []).slice(0, 3) };
  const right = diag?.right || { title: 'After', items: (slide.bullets || []).slice(3, 6) };
  const sideColors = [PALETTE[0], PALETTE[2]];

  return (
    <div style={{ position: 'absolute', inset: 0, background: theme.bg, fontFamily: theme.font }}>
      <SlideHeader title={slide.title} slideNum={slideNum} total={total} theme={theme} scale={scale} />
      <div style={{ position: 'absolute', top: headerH + Math.round(12 * scale), left: pad, right: pad, bottom: Math.round(22 * scale), display: 'flex', gap }}>
        {[{ data: left, color: sideColors[0] }, { data: right, color: sideColors[1] }].map((side, si) => (
          <div key={si} style={{
            flex: 1, borderRadius: Math.round(12 * scale), background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`, overflow: 'hidden',
            boxShadow: `0 ${Math.round(2 * scale)}px ${Math.round(12 * scale)}px rgba(0,0,0,0.06)`,
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ background: side.color, padding: `${Math.round(10 * scale)}px ${Math.round(16 * scale)}px`, display: 'flex', alignItems: 'center', gap: Math.round(8 * scale) }}>
              <span style={{ fontSize: Math.round(16 * scale) }}>{si === 0 ? '↩' : '↪'}</span>
              <p style={{ fontSize: Math.round(14 * scale), fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>{side.data.title}</p>
            </div>
            <div style={{ padding: `${Math.round(12 * scale)}px ${Math.round(16 * scale)}px`, flex: 1 }}>
              {(side.data.items || []).map((item: string, ii: number) => (
                <div key={ii} style={{ display: 'flex', gap: Math.round(8 * scale), marginBottom: Math.round(10 * scale), alignItems: 'flex-start' }}>
                  <span style={{ color: side.color, fontSize: Math.round(10 * scale), marginTop: Math.round(3 * scale), flexShrink: 0 }}>▶</span>
                  <p style={{ fontSize: Math.round(13 * scale), color: theme.bodyColor, lineHeight: 1.45, margin: 0 }}>{item.replace(/\*\*/g, '')}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <SlideAccentLine theme={theme} scale={scale} />
    </div>
  );
}

// ─── LAYOUT: Timeline ─────────────────────────────────────────────────────────
function TimelineSlide({ slide, theme, slideNum, total, scale }: {
  slide: Slide; theme: ThemeConfig; slideNum: number; total: number; scale: number;
}) {
  const headerH = Math.round(68 * scale);
  const pad = Math.round(32 * scale);
  const dotR = Math.round(14 * scale);

  const rawEvents = slide.diagram_spec?.events || [];
  const events = rawEvents.length > 0
    ? rawEvents
    : (slide.bullets || []).slice(0, 5).map((b: string, i: number) => ({
      year: String(2020 + i),
      label: b.replace(/\*\*/g, '').split(':')[0].trim(),
      description: b.replace(/\*\*/g, '').split(':').slice(1).join(':').trim(),
    }));

  const displayEvents = events.slice(0, 5);

  return (
    <div style={{ position: 'absolute', inset: 0, background: theme.bg, fontFamily: theme.font }}>
      <SlideHeader title={slide.title} slideNum={slideNum} total={total} theme={theme} scale={scale} />
      <div style={{
        position: 'absolute',
        top: headerH + Math.round(16 * scale),
        left: pad, right: pad, bottom: Math.round(28 * scale),
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        <div style={{ position: 'relative' }}>
          {/* Connector line */}
          <div style={{ position: 'absolute', top: dotR + Math.round(72 * scale), left: dotR, right: dotR, height: Math.round(2 * scale), background: `${theme.accentColor}35` }} />
          {/* Events */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {displayEvents.map((ev: any, i: number) => {
              const color = PALETTE[i % PALETTE.length];
              const isAbove = i % 2 === 0;
              const boxH = Math.round(72 * scale);
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  {/* Label above */}
                  <div style={{ height: boxH, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: Math.round(8 * scale), visibility: isAbove ? 'visible' : 'hidden', maxWidth: Math.round(150 * scale), textAlign: 'center' }}>
                    <p style={{ fontSize: Math.round(11 * scale), fontWeight: 700, color: theme.titleColor, lineHeight: 1.3 }}>{ev.label}</p>
                    {ev.description && <p style={{ fontSize: Math.round(9 * scale), color: theme.mutedColor, lineHeight: 1.3, marginTop: Math.round(2 * scale) }}>{ev.description}</p>}
                  </div>
                  {/* Dot */}
                  <div style={{ width: dotR * 2, height: dotR * 2, borderRadius: '50%', background: color, border: `${Math.round(2 * scale)}px solid ${theme.bg}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, flexShrink: 0, boxShadow: `0 0 ${Math.round(8 * scale)}px ${color}70` }}>
                    <span style={{ fontSize: Math.round(8 * scale), fontWeight: 700, color: '#fff' }}>{i + 1}</span>
                  </div>
                  {/* Year */}
                  <div style={{ marginTop: Math.round(5 * scale), fontSize: Math.round(11 * scale), fontWeight: 700, color }}>
                    {ev.year}
                  </div>
                  {/* Label below */}
                  <div style={{ height: boxH, paddingTop: Math.round(4 * scale), visibility: !isAbove ? 'visible' : 'hidden', maxWidth: Math.round(150 * scale), textAlign: 'center' }}>
                    <p style={{ fontSize: Math.round(11 * scale), fontWeight: 700, color: theme.titleColor, lineHeight: 1.3 }}>{ev.label}</p>
                    {ev.description && <p style={{ fontSize: Math.round(9 * scale), color: theme.mutedColor, lineHeight: 1.3, marginTop: Math.round(2 * scale) }}>{ev.description}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <SlideAccentLine theme={theme} scale={scale} />
    </div>
  );
}

// ─── LAYOUT: Chart ────────────────────────────────────────────────────────────
function ChartSlide({ slide, theme, slideNum, total, scale }: {
  slide: Slide; theme: ThemeConfig; slideNum: number; total: number; scale: number;
}) {
  const headerH = Math.round(68 * scale);
  const pad = Math.round(28 * scale);
  const bullets = (slide.bullets || []).slice(0, 2);
  const chartPad = Math.round(12 * scale);
  const chartTop = headerH + (bullets.length > 0 ? Math.round(54 * scale) : Math.round(12 * scale));
  const chartBottom = Math.round(22 * scale);
  const captionH = slide.chart_spec?.caption ? Math.round(18 * scale) : 4;
  const chartInnerH = Math.round(540 * scale) - chartTop - chartBottom - 2 * chartPad - captionH;

  return (
    <div style={{ position: 'absolute', inset: 0, background: theme.bg, fontFamily: theme.font }}>
      <SlideHeader title={slide.title} slideNum={slideNum} total={total} theme={theme} scale={scale} />
      {bullets.length > 0 && (
        <div style={{ position: 'absolute', top: headerH + Math.round(10 * scale), left: pad, right: pad, display: 'flex', gap: Math.round(12 * scale) }}>
          {bullets.map((b, i) => (
            <div key={i} style={{ flex: 1, padding: `${Math.round(7 * scale)}px ${Math.round(12 * scale)}px`, background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderLeft: `${Math.round(3 * scale)}px solid ${PALETTE[i % PALETTE.length]}`, borderRadius: Math.round(6 * scale) }}>
              <p style={{ fontSize: Math.round(11 * scale), color: theme.bodyColor, lineHeight: 1.45, margin: 0 }}>
                <Bold text={b} accentColor={theme.accentColor} />
              </p>
            </div>
          ))}
        </div>
      )}
      {slide.chart_spec && chartInnerH > 20 && (
        <div style={{
          position: 'absolute',
          top: chartTop, left: pad, right: pad, bottom: chartBottom,
          borderRadius: Math.round(10 * scale), background: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`, padding: chartPad,
          overflow: 'hidden',
        }}>
          {slide.chart_spec?.caption && <p style={{ fontSize: Math.round(9 * scale), color: theme.mutedColor, marginBottom: Math.round(4 * scale), fontStyle: 'italic', margin: 0 }}>{slide.chart_spec.caption}</p>}
          <div style={{ height: chartInnerH }}>
            <ResponsiveContainer width="100%" height="100%">
              <SlideChart spec={slide.chart_spec} scale={scale} />
            </ResponsiveContainer>
          </div>
        </div>
      )}
      <SlideAccentLine theme={theme} scale={scale} />
    </div>
  );
}

// ─── LAYOUT: Title + Bullets (default) ───────────────────────────────────────
function BulletsSlide({ slide, theme, slideNum, total, scale }: {
  slide: Slide; theme: ThemeConfig; slideNum: number; total: number; scale: number;
}) {
  const headerH = Math.round(68 * scale);
  const pad = Math.round(30 * scale);
  const gap = Math.round(16 * scale);
  const bullets = slide.bullets || [];
  const hasChart = !!slide.chart_spec;
  const hasDiagram = !!slide.diagram_spec;
  const hasImage = !!slide.image?.url;
  const hasVisual = hasChart || hasDiagram || hasImage;

  return (
    <div style={{ position: 'absolute', inset: 0, background: theme.bg, fontFamily: theme.font }}>
      <SlideHeader title={slide.title} slideNum={slideNum} total={total} theme={theme} scale={scale} />
      <div style={{
        position: 'absolute', top: headerH + Math.round(12 * scale),
        left: pad, right: pad, bottom: Math.round(22 * scale),
        display: 'flex', flexDirection: hasVisual && bullets.length > 0 ? 'row' : 'column', gap,
      }}>
        {bullets.length > 0 && (
          <div style={{ flex: hasVisual ? '0 0 44%' : 1, display: 'flex', flexDirection: 'column', gap: Math.round(8 * scale), justifyContent: 'center' }}>
            {bullets.slice(0, 6).map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: Math.round(9 * scale), alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0, width: Math.round(7 * scale), height: Math.round(7 * scale), borderRadius: '50%', marginTop: Math.round(5 * scale), background: PALETTE[i % PALETTE.length] }} />
                <p style={{ fontSize: Math.round(14 * scale), color: theme.bodyColor, lineHeight: 1.5, margin: 0 }}>
                  <Bold text={b} accentColor={theme.accentColor} />
                </p>
              </div>
            ))}
            {slide.citations?.slice(0, 1).map((c, i) => (
              <p key={i} style={{ fontSize: Math.round(9 * scale), color: theme.mutedColor, fontStyle: 'italic', marginTop: Math.round(6 * scale) }}>{c}</p>
            ))}
          </div>
        )}
        {hasVisual && (
          <div style={{ flex: bullets.length > 0 ? '0 0 53%' : 1, display: 'flex', flexDirection: 'column', gap: Math.round(10 * scale), minHeight: 0 }}>
            {hasChart && (
              <div style={{ flex: 1, minHeight: 0, borderRadius: Math.round(10 * scale), background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, padding: Math.round(10 * scale), overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {slide.chart_spec?.title && <p style={{ fontSize: Math.round(9 * scale), color: theme.mutedColor, marginBottom: Math.round(4 * scale), fontWeight: 600, flexShrink: 0 }}>{slide.chart_spec.title}</p>}
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <SlideChart spec={slide.chart_spec} scale={scale} />
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {hasDiagram && !hasChart && (
              <div style={{ flex: 1 }}>
                <SlideDiagram spec={slide.diagram_spec} scale={scale} theme={theme} />
              </div>
            )}
            {hasImage && !hasChart && !hasDiagram && (
              <div style={{ flex: 1, borderRadius: Math.round(10 * scale), overflow: 'hidden', boxShadow: `0 ${Math.round(4 * scale)}px ${Math.round(16 * scale)}px rgba(0,0,0,0.15)` }}>
                <img
                  src={slide.image!.url}
                  alt={slide.image!.alt || slide.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </div>
        )}
        {!hasVisual && bullets.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: theme.mutedColor, fontSize: Math.round(14 * scale) }}>Loading content…</p>
          </div>
        )}
      </div>
      <SlideAccentLine theme={theme} scale={scale} />
    </div>
  );
}

// ─── SlideFrame dispatcher ────────────────────────────────────────────────────
function SlideFrame({ slide, theme, slideNum, total, scale = 1, sectionNum = 1 }: {
  slide: Slide; theme: ThemeConfig; slideNum: number; total: number; scale?: number; sectionNum?: number;
}) {
  const layout = slide.layout || 'title_bullets';
  const props = { slide, theme, slideNum, total, scale };

  switch (layout) {
    case 'title':         return <TitleSlide {...props} />;
    case 'section_divider': return <SectionDividerSlide {...props} sectionNum={sectionNum} />;
    case 'center_focus':  return <CenterFocusSlide {...props} />;
    case 'grid_cards':    return <GridCardsSlide {...props} />;
    case 'data_insight':  return <DataInsightSlide {...props} />;
    case 'comparison':    return <ComparisonSlide {...props} />;
    case 'timeline':      return <TimelineSlide {...props} />;
    case 'chart':         return <ChartSlide {...props} />;
    case 'split':         return <SplitSlide {...props} />;
    default:              return <BulletsSlide {...props} />;
  }
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────
function Thumbnail({ slide, theme, num, total, active, onClick, sectionNum }: {
  slide: Slide; theme: ThemeConfig; num: number; total: number;
  active: boolean; onClick: () => void; sectionNum?: number;
}) {
  return (
    <button onClick={onClick}
      className={`group relative rounded-lg overflow-hidden transition-all duration-150 w-full focus:outline-none ${active ? 'ring-2 ring-blue-500 shadow-lg' : 'ring-1 ring-white/10 hover:ring-white/30'}`}
      style={{ aspectRatio: '16/9' }}>
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <SlideFrame slide={slide} theme={theme} slideNum={num} total={total} scale={0.175} sectionNum={sectionNum} />
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
  const [notesOpen, setNotesOpen] = useState(false);

  const theme = getTheme(deck.theme);
  const slides = deck.slides;
  const slide = slides[current];

  // Precompute section numbers for section_divider slides
  let sectionCount = 0;
  const sectionNums: Record<number, number> = {};
  slides.forEach((s, i) => {
    if (s.layout === 'section_divider') {
      sectionCount++;
      sectionNums[i] = sectionCount;
    }
  });

  // Responsive scale
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        setScale(w / 960);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const prev = () => setCurrent(c => Math.max(0, c - 1));
  const next = () => setCurrent(c => Math.min(slides.length - 1, c + 1));

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

      {/* Left thumbnail panel */}
      <div className="flex-shrink-0 w-48 overflow-y-auto py-3 px-2 space-y-2"
        style={{ backgroundColor: '#13151f', borderRight: '1px solid #ffffff12' }}>
        <div className="flex items-center justify-between px-1 mb-3">
          <p className="text-[9px] text-white/25 font-bold uppercase tracking-widest">
            Slides
          </p>
          <p className="text-[9px] text-white/25 font-bold tabular-nums">
            {slides.length}
          </p>
        </div>
        {slides.map((s, i) => (
          <Thumbnail key={i} slide={s} theme={theme} num={i + 1} total={slides.length}
            active={current === i} onClick={() => setCurrent(i)} sectionNum={sectionNums[i]} />
        ))}
      </div>

      {/* Center main slide */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-6 min-h-0">
          <div ref={containerRef} className="w-full shadow-2xl rounded-xl overflow-hidden"
            style={{ maxWidth: 960, aspectRatio: '16/9', position: 'relative' }}>
            {slide && (
              <SlideFrame slide={slide} theme={theme} slideNum={current + 1} total={slides.length} scale={scale} sectionNum={sectionNums[current]} />
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-shrink-0 flex items-center justify-center gap-5 pb-4">
          <button onClick={prev} disabled={current === 0}
            className="w-9 h-9 flex items-center justify-center transition-all disabled:opacity-25 hover:bg-white/10"
            style={{ border: '1px solid #ffffff20', color: '#fff', borderRadius: 4 }}>
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Compact dot strip — max 12 dots, else show counter */}
          {slides.length <= 12 ? (
            <div className="flex gap-1.5 items-center">
              {slides.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: current === i ? 18 : 5,
                    height: 5,
                    backgroundColor: current === i ? theme.accentColor : '#ffffff25',
                    border: 'none', cursor: 'pointer', padding: 0,
                  }} />
              ))}
            </div>
          ) : (
            <span style={{
              fontSize: 12, color: '#ffffff50', fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.05em', minWidth: 56, textAlign: 'center',
              fontFamily: 'var(--font-syne), Syne, sans-serif',
            }}>
              {current + 1} / {slides.length}
            </span>
          )}

          <button onClick={next} disabled={current === slides.length - 1}
            className="w-9 h-9 flex items-center justify-center transition-all disabled:opacity-25 hover:bg-white/10"
            style={{ border: '1px solid #ffffff20', color: '#fff', borderRadius: 4 }}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Speaker notes — collapsible */}
        {slide?.notes && (
          <div className="flex-shrink-0 px-6 pb-3">
            <button
              onClick={() => setNotesOpen(o => !o)}
              className="flex items-center gap-2 mb-1.5 w-full text-left"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">
                Speaker Notes
              </span>
              <span className="text-[10px] text-white/20">{notesOpen ? '▲' : '▼'}</span>
            </button>
            {notesOpen && (
              <div className="rounded-lg p-3" style={{ backgroundColor: '#ffffff08', border: '1px solid #ffffff15' }}>
                <p className="text-sm text-white/60 leading-relaxed">{slide.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
