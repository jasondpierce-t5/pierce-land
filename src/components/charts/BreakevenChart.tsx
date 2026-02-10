'use client';

/**
 * BreakevenChart — Bar chart showing breakeven prices vs current market price.
 *
 * Visually demonstrates whether the current market price exceeds breakeven,
 * indicating profitability for each turn.
 */

import { Bar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { ACCENT, GREEN, defaultOptions } from './chart-config';

interface BreakevenChartProps {
  springBreakeven: number;
  winterBreakeven: number;
  currentMarketPrice: number;
}

export default function BreakevenChart({
  springBreakeven,
  winterBreakeven,
  currentMarketPrice,
}: BreakevenChartProps) {
  const labels = ['Spring Turn', 'Winter Turn'];

  const data = {
    labels,
    datasets: [
      {
        label: 'Breakeven Price',
        data: [springBreakeven, winterBreakeven],
        backgroundColor: ACCENT,
      },
      {
        label: 'Market Price',
        data: [currentMarketPrice, currentMarketPrice],
        backgroundColor: GREEN,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    ...defaultOptions,
    plugins: {
      ...defaultOptions.plugins,
      legend: {
        ...defaultOptions.plugins.legend,
        position: 'top' as const,
      },
    },
    scales: {
      ...defaultOptions.scales,
      y: {
        ...defaultOptions.scales.y,
        ticks: {
          ...defaultOptions.scales.y.ticks,
          callback: (value) => `$${Number(value).toLocaleString()}/cwt`,
        },
      },
    },
  };

  return (
    <div className="h-64">
      <Bar data={data} options={options} />
    </div>
  );
}
