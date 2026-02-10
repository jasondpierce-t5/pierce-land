'use client';

/**
 * CostBreakdownChart — Doughnut chart showing cost component breakdown.
 *
 * Generic component that works for both spring and winter turn cost breakdowns.
 * Filters out zero-value segments to keep the chart clean.
 */

import { Doughnut } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { PRIMARY, ACCENT, GREEN } from './chart-config';

// Professional muted palette for cost segments
const SEGMENT_COLORS = [
  PRIMARY,   // #1a3a2a — dark green
  ACCENT,    // #c4872a — warm brown/orange
  GREEN,     // #3a7d53 — medium green
  '#94a3b8', // slate-400
  '#0284c7', // sky-600
  '#f59e0b', // amber-500
];

interface CostBreakdownChartProps {
  title: string;
  segments: { label: string; value: number }[];
}

export default function CostBreakdownChart({
  title,
  segments,
}: CostBreakdownChartProps) {
  // Filter out zero-value segments
  const filtered = segments.filter((s) => s.value > 0);

  const data = {
    labels: filtered.map((s) => s.label),
    datasets: [
      {
        data: filtered.map((s) => s.value),
        backgroundColor: SEGMENT_COLORS.slice(0, filtered.length),
        borderWidth: 1,
        borderColor: '#ffffff',
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: {
            family: 'Inter, system-ui, sans-serif',
          },
          padding: 12,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = Number(context.raw);
            return ` ${context.label}: $${value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`;
          },
        },
      },
      title: {
        display: !!title,
        text: title,
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 14,
          weight: 'bold',
        },
      },
    },
  };

  return (
    <div className="h-64">
      <Doughnut data={data} options={options} />
    </div>
  );
}
