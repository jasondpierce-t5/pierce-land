'use client';

/**
 * ScenarioChart — Grouped bar chart comparing Low/Mid/High price scenarios.
 *
 * Shows spring net/head, winter net/head, and annual net for each scenario
 * so bankers can quickly visualize upside and downside risk.
 */

import { Bar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { SCENARIO_COLORS, defaultOptions } from './chart-config';
import type { ScenarioResult } from '@/lib/types';

interface ScenarioChartProps {
  scenarios: {
    low: ScenarioResult;
    mid: ScenarioResult;
    high: ScenarioResult;
  };
}

export default function ScenarioChart({ scenarios }: ScenarioChartProps) {
  const labels = ['Spring Net/Head', 'Winter Net/Head', 'Annual Net'];

  const data = {
    labels,
    datasets: [
      {
        label: 'Low',
        data: [
          scenarios.low.springNet,
          scenarios.low.winterNet,
          scenarios.low.annualNet,
        ],
        backgroundColor: SCENARIO_COLORS.low,
      },
      {
        label: 'Mid',
        data: [
          scenarios.mid.springNet,
          scenarios.mid.winterNet,
          scenarios.mid.annualNet,
        ],
        backgroundColor: SCENARIO_COLORS.mid,
      },
      {
        label: 'High',
        data: [
          scenarios.high.springNet,
          scenarios.high.winterNet,
          scenarios.high.annualNet,
        ],
        backgroundColor: SCENARIO_COLORS.high,
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
          callback: (value) => {
            const num = Number(value);
            if (num < 0) {
              return `($${Math.abs(num).toLocaleString()})`;
            }
            return `$${num.toLocaleString()}`;
          },
        },
      },
    },
  };

  return (
    <div className="h-72">
      <Bar data={data} options={options} />
    </div>
  );
}
