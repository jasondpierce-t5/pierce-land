import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchPlanData } from '@/lib/plan-data';
import {
  formatCurrency,
  formatCurrencyWhole,
  formatPercent,
  formatNumber,
} from '@/lib/formatters';

// =============================================================================
// Metadata
// =============================================================================

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await fetchPlanData(params.slug);

  if (!data) {
    return { title: 'Plan Not Found | Pierce Land & Cattle' };
  }

  return {
    title: `${data.version.bank_name} | Pierce Land & Cattle Business Plan`,
  };
}

// =============================================================================
// Page component
// =============================================================================

export default async function PlanPage({ params }: PageProps) {
  const data = await fetchPlanData(params.slug);

  if (!data) {
    notFound();
  }

  const { version, config, spring, winter, annual } = data;

  // Format the current date as "Month Year"
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Cover Header */}
      <div className="w-full bg-primary text-white py-10 px-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold tracking-wide">
            PIERCE LAND &amp; CATTLE
          </h1>
          <p className="text-xl mt-1 text-white/80">
            Stocker Heifer Business Plan
          </p>

          <div className="border-t border-white/20 my-4" />

          <div className="flex justify-between items-center">
            <span className="text-lg">
              Prepared for: {version.bank_name}
            </span>
            <span className="text-lg text-white/80">
              {currentDate}
            </span>
          </div>

          <p className="mt-2 text-white/70">
            {config.operator_name} | {config.operation_location}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* KPI Summary Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
          {/* Annual Net Income */}
          <div className="bg-white shadow-sm rounded-lg p-4 border-l-4 border-accent">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Annual Net Income
            </p>
            <p
              className={`text-xl font-bold ${
                annual.annualNetIncome >= 0 ? 'text-green-700' : 'text-red-600'
              }`}
            >
              {formatCurrencyWhole(annual.annualNetIncome)}
            </p>
          </div>

          {/* Head Count */}
          <div className="bg-white shadow-sm rounded-lg p-4 border-l-4 border-accent">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Head Count
            </p>
            <p className="text-xl font-bold text-gray-900">
              {formatNumber(config.head_count)}
            </p>
          </div>

          {/* LOC Utilization */}
          <div className="bg-white shadow-sm rounded-lg p-4 border-l-4 border-accent">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              LOC Utilization
            </p>
            <p className="text-xl font-bold text-gray-900">
              {formatPercent(annual.locUtilization)}
            </p>
          </div>

          {/* Spring Net/Head */}
          <div className="bg-white shadow-sm rounded-lg p-4 border-l-4 border-accent">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Spring Net/Head
            </p>
            <p
              className={`text-xl font-bold ${
                spring.netIncome >= 0 ? 'text-green-700' : 'text-red-600'
              }`}
            >
              {formatCurrency(spring.netIncome)}
            </p>
          </div>

          {/* Winter Net/Head */}
          <div className="bg-white shadow-sm rounded-lg p-4 border-l-4 border-accent">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Winter Net/Head
            </p>
            <p
              className={`text-xl font-bold ${
                winter.netIncome >= 0 ? 'text-green-700' : 'text-red-600'
              }`}
            >
              {formatCurrency(winter.netIncome)}
            </p>
          </div>
        </div>

        {/* Business plan sections added by Plan 06-02 and 06-03 */}
      </div>
    </div>
  );
}
