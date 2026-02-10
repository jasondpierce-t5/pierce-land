'use client';

/**
 * PurchaseSensitivityChart — Line chart showing impact of purchase price on annual net.
 *
 * Highlights the current purchase price point with an accent-colored marker
 * so users can see where they currently sit on the sensitivity curve.
 */

import { Line } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { PRIMARY, ACCENT, defaultOptions } from './chart-config';
import type { PurchaseSensitivityPoint } from '@/lib/types';

interface PurchaseSensitivityChartProps {
  data: PurchaseSensitivityPoint[];
  currentPurchasePrice: number;
}

export default function PurchaseSensitivityChart({
  data: points,
  currentPurchasePrice,
}: PurchaseSensitivityChartProps) {
  // Build point color arrays — ACCENT for current price, PRIMARY for others
  const pointColors = points.map((p) =>
    p.purchasePriceCwt === currentPurchasePrice ? ACCENT : PRIMARY
  );
  const pointRadii = points.map((p) =>
    p.purchasePriceCwt === currentPurchasePrice ? 6 : 3
  );

  const chartData = {
    labels: points.map((p) =>
      `$${p.purchasePriceCwt.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    ),
    datasets: [
      {
        label: 'Annual Net Total',
        data: points.map((p) => p.annualNetTotal),
        borderColor: PRIMARY,
        backgroundColor: PRIMARY,
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
          text: 'Purchase Price/CWT',
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
