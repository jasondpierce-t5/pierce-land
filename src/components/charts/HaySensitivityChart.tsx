'use client';

/**
 * HaySensitivityChart — Line chart showing impact of hay price on winter net.
 *
 * Highlights the current hay price point with an accent-colored marker
 * so users can see where they currently sit on the sensitivity curve.
 */

import { Line } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { GREEN, ACCENT, defaultOptions } from './chart-config';
import type { HaySensitivityPoint } from '@/lib/types';

interface HaySensitivityChartProps {
  data: HaySensitivityPoint[];
  currentHayPrice: number;
}

export default function HaySensitivityChart({
  data: points,
  currentHayPrice,
}: HaySensitivityChartProps) {
  // Build point color arrays — ACCENT for current price, GREEN for others
  const pointColors = points.map((p) =>
    p.hayPricePerBale === currentHayPrice ? ACCENT : GREEN
  );
  const pointRadii = points.map((p) =>
    p.hayPricePerBale === currentHayPrice ? 6 : 3
  );

  const chartData = {
    labels: points.map((p) =>
      `$${p.hayPricePerBale.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    ),
    datasets: [
      {
        label: 'Winter Net/Head',
        data: points.map((p) => p.winterNetPerHead),
        borderColor: GREEN,
        backgroundColor: GREEN,
        pointBackgroundColor: pointColors,
        pointBorderColor: pointColors,
        pointRadius: pointRadii,
        pointHoverRadius: 7,
        tension: 0.3,
        fill: false,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    ...defaultOptions,
    plugins: {
      ...defaultOptions.plugins,
      legend: {
        ...defaultOptions.plugins.legend,
        display: false,
      },
    },
    scales: {
      ...defaultOptions.scales,
      x: {
        ...defaultOptions.scales.x,
        title: {
          display: true,
          text: 'Hay Price/Bale',
          font: {
            family: 'Inter, system-ui, sans-serif',
          },
        },
      },
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
    <div className="h-64">
      <Line data={chartData} options={options} />
    </div>
  );
}
