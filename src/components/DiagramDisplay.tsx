'use client';

import React from 'react';

interface DiagramNode {
  id: string;
  label: string;
  description?: string;
}

interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
}

interface TimelineEvent {
  year: string;
  label: string;
  description?: string;
}

interface ComparisonSide {
  title: string;
  items: string[];
}

interface DiagramSpec {
  type: 'flowchart' | 'comparison' | 'timeline' | 'hierarchy' | 'cycle';
  title?: string;
  // Flowchart / Hierarchy / Cycle
  nodes?: DiagramNode[];
  edges?: DiagramEdge[];
  // Timeline
  events?: TimelineEvent[];
  // Comparison
  left?: ComparisonSide;
  right?: ComparisonSide;
}

interface DiagramDisplayProps {
  diagramSpec: DiagramSpec;
  className?: string;
  compact?: boolean;
}

const NODE_COLORS = [
  '#1A3A5C', '#2E86AB', '#C0392B', '#A23B72', '#F18F01',
  '#5C6BC0', '#26A69A', '#8D6E63',
];

// ─── Flowchart ────────────────────────────────────────────────────────────────
function Flowchart({ spec, compact }: { spec: DiagramSpec; compact: boolean }) {
  const nodes = spec.nodes || [];
  const edges = spec.edges || [];

  if (nodes.length === 0) return null;

  // Simple linear layout (left to right or top to bottom based on count)
  const isHorizontal = nodes.length <= 5;
  const nodeWidth = compact ? 80 : 110;
  const nodeHeight = compact ? 40 : 52;
  const gapX = compact ? 50 : 70;
  const gapY = compact ? 55 : 70;

  const svgWidth = isHorizontal
    ? nodes.length * (nodeWidth + gapX) + 20
    : nodeWidth + 120;
  const svgHeight = isHorizontal
    ? nodeHeight + 80
    : nodes.length * (nodeHeight + gapY) + 20;

  const getPos = (i: number) =>
    isHorizontal
      ? { x: 10 + i * (nodeWidth + gapX), y: 20 }
      : { x: 20, y: 10 + i * (nodeHeight + gapY) };

  // Map node id → index
  const nodeMap: Record<string, number> = {};
  nodes.forEach((n, i) => { nodeMap[n.id] = i; });

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width={svgWidth}
        height={svgHeight}
        className="mx-auto"
        style={{ minWidth: Math.min(svgWidth, 320) }}
      >
        {/* Edges */}
        {edges.map((edge, ei) => {
          const fi = nodeMap[edge.from];
          const ti = nodeMap[edge.to];
          if (fi === undefined || ti === undefined) return null;
          const fp = getPos(fi);
          const tp = getPos(ti);
          const x1 = isHorizontal ? fp.x + nodeWidth : fp.x + nodeWidth / 2;
          const y1 = isHorizontal ? fp.y + nodeHeight / 2 : fp.y + nodeHeight;
          const x2 = isHorizontal ? tp.x : tp.x + nodeWidth / 2;
          const y2 = isHorizontal ? tp.y + nodeHeight / 2 : tp.y;
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          return (
            <g key={ei}>
              <defs>
                <marker id={`arrow-${ei}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
                </marker>
              </defs>
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#94a3b8" strokeWidth={1.5}
                markerEnd={`url(#arrow-${ei})`}
              />
              {edge.label && (
                <text x={mx} y={my - 4} textAnchor="middle" fontSize={10} fill="#64748b">
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node, i) => {
          const pos = getPos(i);
          const color = NODE_COLORS[i % NODE_COLORS.length];
          return (
            <g key={node.id}>
              <rect
                x={pos.x} y={pos.y}
                width={nodeWidth} height={nodeHeight}
                rx={8} ry={8}
                fill={color} opacity={0.9}
              />
              <text
                x={pos.x + nodeWidth / 2}
                y={pos.y + nodeHeight / 2 - (node.description ? 7 : 0)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={compact ? 9 : 10}
                fontWeight="600"
                fill="#ffffff"
                style={{ userSelect: 'none' }}
              >
                {node.label.length > 14 ? node.label.slice(0, 13) + '…' : node.label}
              </text>
              {node.description && (
                <text
                  x={pos.x + nodeWidth / 2}
                  y={pos.y + nodeHeight / 2 + 8}
                  textAnchor="middle"
                  fontSize={compact ? 7 : 8}
                  fill="#e2e8f0"
                  opacity={0.85}
                >
                  {node.description.length > 18 ? node.description.slice(0, 17) + '…' : node.description}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function Timeline({ spec, compact }: { spec: DiagramSpec; compact: boolean }) {
  const events = spec.events || [];
  if (events.length === 0) return null;

  return (
    <div className="relative w-full px-2">
      {/* Vertical line */}
      <div className="absolute left-[28px] top-3 bottom-3 w-0.5 bg-slate-300" />
      <div className="space-y-3 pl-14">
        {events.map((ev, i) => (
          <div key={i} className="relative">
            {/* Dot */}
            <div
              className="absolute -left-[42px] top-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
              style={{ backgroundColor: NODE_COLORS[i % NODE_COLORS.length] }}
            >
              {i + 1}
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold text-slate-500">{ev.year}</span>
                <span className={`font-semibold text-slate-800 ${compact ? 'text-xs' : 'text-sm'}`}>
                  {ev.label}
                </span>
              </div>
              {ev.description && !compact && (
                <p className="text-xs text-slate-500 mt-0.5">{ev.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Comparison ───────────────────────────────────────────────────────────────
function Comparison({ spec, compact }: { spec: DiagramSpec; compact: boolean }) {
  const left = spec.left;
  const right = spec.right;
  if (!left || !right) return null;

  return (
    <div className="grid grid-cols-2 gap-3 w-full">
      {[left, right].map((side, si) => (
        <div
          key={si}
          className="rounded-xl border-2 overflow-hidden"
          style={{ borderColor: NODE_COLORS[si * 2] }}
        >
          <div
            className="px-3 py-2 text-center text-white font-semibold text-xs"
            style={{ backgroundColor: NODE_COLORS[si * 2] }}
          >
            {side.title}
          </div>
          <ul className={`p-3 space-y-1.5 ${compact ? '' : ''}`}>
            {side.items.map((item, ii) => (
              <li key={ii} className="flex items-start gap-1.5">
                <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: NODE_COLORS[si * 2] }} />
                <span className={`${compact ? 'text-xs' : 'text-xs'} text-slate-700 leading-snug`}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ─── Cycle ────────────────────────────────────────────────────────────────────
function Cycle({ spec, compact }: { spec: DiagramSpec; compact: boolean }) {
  const nodes = spec.nodes || [];
  if (nodes.length === 0) return null;

  const size = compact ? 160 : 200;
  const r = size / 2 - (compact ? 28 : 35);
  const cx = size / 2;
  const cy = size / 2;
  const nodeR = compact ? 28 : 35;

  return (
    <div className="w-full flex justify-center">
      <svg width={size} height={size}>
        {/* Circle arrows */}
        {nodes.map((_, i) => {
          const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
          const nextAngle = (2 * Math.PI * (i + 1)) / nodes.length - Math.PI / 2;
          const x1 = cx + r * Math.cos(angle);
          const y1 = cy + r * Math.sin(angle);
          const x2 = cx + r * Math.cos(nextAngle);
          const y2 = cy + r * Math.sin(nextAngle);
          return (
            <g key={`edge-${i}`}>
              <defs>
                <marker id={`ca-${i}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 z" fill="#94a3b8" />
                </marker>
              </defs>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cbd5e1" strokeWidth={1.5}
                markerEnd={`url(#ca-${i})`} strokeDasharray="4 2" />
            </g>
          );
        })}
        {/* Nodes */}
        {nodes.map((node, i) => {
          const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          const color = NODE_COLORS[i % NODE_COLORS.length];
          return (
            <g key={node.id}>
              <circle cx={x} cy={y} r={nodeR} fill={color} opacity={0.9} />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                fontSize={compact ? 8 : 9} fontWeight="600" fill="#fff"
                style={{ userSelect: 'none' }}>
                {node.label.length > 10 ? node.label.slice(0, 9) + '…' : node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function DiagramDisplay({ diagramSpec, className = '', compact = false }: DiagramDisplayProps) {
  const title = diagramSpec.title || '';
  const typeLabel = diagramSpec.type.charAt(0).toUpperCase() + diagramSpec.type.slice(1);

  const renderDiagram = () => {
    switch (diagramSpec.type) {
      case 'flowchart':
      case 'hierarchy':
        return <Flowchart spec={diagramSpec} compact={compact} />;
      case 'timeline':
        return <Timeline spec={diagramSpec} compact={compact} />;
      case 'comparison':
        return <Comparison spec={diagramSpec} compact={compact} />;
      case 'cycle':
        return <Cycle spec={diagramSpec} compact={compact} />;
      default:
        return <Flowchart spec={diagramSpec} compact={compact} />;
    }
  };

  return (
    <div className={`rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm ${className}`}>
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          {typeLabel} Diagram
        </p>
        {title && <span className="text-xs text-slate-500">— {title}</span>}
      </div>
      <div className="px-3 pb-3">{renderDiagram()}</div>
    </div>
  );
}
