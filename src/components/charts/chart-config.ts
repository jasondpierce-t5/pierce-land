/**
 * Chart.js configuration for Pierce Land & Cattle.
 *
 * Registers all needed Chart.js components at module level
 * and exports shared color constants and default options.
 */

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register Chart.js components at module level (standard react-chartjs-2 pattern)
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// =============================================================================
// Color palette — matches Tailwind config / PROJECT.md
// =============================================================================

export const PRIMARY = '#1a3a2a'; // dark green
export const ACCENT = '#c4872a'; // warm brown/orange
export const GREEN = '#3a7d53'; // medium green
export const RED = '#dc2626'; // losses — Tailwind red-600
export const GRAY = '#6b7280'; // neutral — Tailwind gray-500

// Scenario colors: low = RED (pessimistic), mid = GRAY (base), high = GREEN (optimistic)
export const SCENARIO_COLORS = {
  low: RED,
  mid: GRAY,
  high: GREEN,
} as const;

// =============================================================================
// Default chart options
// =============================================================================

export const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        font: {
          family: 'Inter, system-ui, sans-serif',
        },
      },
    },
  },
  scales: {
    x: {
      ticks: {
        font: {
          family: 'Inter, system-ui, sans-serif',
        },
      },
    },
    y: {
      ticks: {
        font: {
          family: 'Inter, system-ui, sans-serif',
        },
      },
    },
  },
} as const;
