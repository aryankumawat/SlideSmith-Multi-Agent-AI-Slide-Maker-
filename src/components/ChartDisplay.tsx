'use client';

import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LabelList,
} from 'recharts';

interface ChartSpec {
  type?: string;
  kind?: string;
  title?: string;
  caption?: string;
  labels?: string[];
  datasets?: Array<{
    label?: string;
    data: number[];
    backgroundColor?: string | string[];
  }>;
  // Legacy flat format
  data?: any;
}

interface ChartDisplayProps {
  chartSpec: ChartSpec;
  className?: string;
  compact?: boolean;
}

// Academic color palette
const PALETTE = [
  '#1A3A5C', '#C0392B', '#2E86AB', '#A23B72', '#F18F01',
  '#5C6BC0', '#26A69A', '#8D6E63', '#78909C', '#66BB6A',
];

function buildChartData(spec: ChartSpec): { data: Record<string, any>[]; keys: string[] } {
  // New format: spec.labels + spec.datasets
  if (spec.labels && spec.datasets) {
    const keys = spec.datasets.map(d => d.label || 'Value');
    const data = spec.labels.map((label, i) => {
      const row: Record<string, any> = { name: label };
      spec.datasets!.forEach(ds => {
        row[ds.label || 'Value'] = ds.data[i] ?? 0;
      });
      return row;
    });
    return { data, keys };
  }

  // Legacy flat data
  if (spec.data) {
    if (Array.isArray(spec.data)) {
      const keys = Object.keys(spec.data[0] || {}).filter(k => k !== 'name');
      return { data: spec.data, keys };
    }
    if (spec.data.labels && spec.data.datasets) {
      const keys = spec.data.datasets.map((d: any) => d.label || 'Value');
      const data = spec.data.labels.map((label: string, i: number) => {
        const row: Record<string, any> = { name: label };
        spec.data.datasets.forEach((ds: any) => {
          row[ds.label || 'Value'] = ds.data[i] ?? 0;
        });
        return row;
      });
      return { data, keys };
    }
  }

  // Fallback demo data
  return {
    data: [
      { name: 'Q1', Value: 42 }, { name: 'Q2', Value: 61 },
      { name: 'Q3', Value: 55 }, { name: 'Q4', Value: 78 },
    ],
    keys: ['Value'],
  };
}

function getColors(spec: ChartSpec, index: number): string {
  const ds = spec.datasets?.[0];
  if (ds?.backgroundColor) {
    if (Array.isArray(ds.backgroundColor)) return ds.backgroundColor[index] || PALETTE[index % PALETTE.length];
    return ds.backgroundColor;
  }
  return PALETTE[index % PALETTE.length];
}

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
};

export function ChartDisplay({ chartSpec, className = '', compact = false }: ChartDisplayProps) {
  const chartType = (chartSpec.type || chartSpec.kind || 'bar').toLowerCase();
  const title = chartSpec.title || '';
  const caption = chartSpec.caption || '';
  const height = compact ? 160 : 220;

  const { data, keys } = buildChartData(chartSpec);

  const renderChart = () => {
    if (chartType === 'pie' || chartType === 'doughnut') {
      const pieData = data.map((d, i) => ({
        name: d.name,
        value: d[keys[0]] ?? 0,
        fill: getColors(chartSpec, i),
      }));
      return (
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={chartType === 'doughnut' ? (compact ? 30 : 45) : 0}
            outerRadius={compact ? 55 : 80}
            paddingAngle={3}
            dataKey="value"
          >
            {pieData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      );
    }

    if (chartType === 'line') {
      return (
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf0" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip {...TOOLTIP_STYLE} />
          {keys.length > 1 && <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />}
          {keys.map((key, i) => (
            <Line
              key={key} type="monotone" dataKey={key}
              stroke={PALETTE[i % PALETTE.length]} strokeWidth={2.5}
              dot={{ r: 4, fill: PALETTE[i % PALETTE.length] }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      );
    }

    if (chartType === 'area') {
      return (
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <defs>
            {keys.map((key, i) => (
              <linearGradient key={key} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.25} />
                <stop offset="95%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf0" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip {...TOOLTIP_STYLE} />
          {keys.length > 1 && <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />}
          {keys.map((key, i) => (
            <Area
              key={key} type="monotone" dataKey={key}
              stroke={PALETTE[i % PALETTE.length]} strokeWidth={2.5}
              fill={`url(#grad-${i})`}
            />
          ))}
        </AreaChart>
      );
    }

    // Default: bar chart
    return (
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip {...TOOLTIP_STYLE} />
        {keys.length > 1 && <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />}
        {keys.map((key, i) => (
          <Bar key={key} dataKey={key} fill={PALETTE[i % PALETTE.length]} radius={[4, 4, 0, 0]}>
            {keys.length === 1 &&
              data.map((_, idx) => (
                <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
              ))}
          </Bar>
        ))}
      </BarChart>
    );
  };

  return (
    <div className={`rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm ${className}`}>
      {title && (
        <div className="px-4 pt-3 pb-1">
          <p className="text-sm font-semibold text-slate-700">{title}</p>
        </div>
      )}
      <div className={`px-2 pb-2 ${title ? '' : 'pt-2'}`} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
      {caption && (
        <div className="px-4 pb-3">
          <p className="text-xs text-slate-400 italic">{caption}</p>
        </div>
      )}
    </div>
  );
}
