import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchPlanData } from '@/lib/plan-data';
import {
  formatCurrency,
  formatCurrencyWhole,
  formatPercent,
  formatNumber,
  formatWeight,
  formatCwt,
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

        {/* ================================================================= */}
        {/* Operation Overview                                               */}
        {/* ================================================================= */}
        <section>
          <h2 className="border-l-4 border-accent pl-4 text-2xl font-bold text-gray-900">
            Operation Overview
          </h2>

          <div className="mt-4 bg-white shadow-sm rounded-lg p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Operator Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">
                  Operator Details
                </h3>
                <div className="space-y-0">
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="text-gray-600">Operator</span>
                    <span className="font-medium text-gray-900">{config.operator_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="text-gray-600">Location</span>
                    <span className="font-medium text-gray-900">{config.operation_location}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="text-gray-600">Experience</span>
                    <span className="font-medium text-gray-900">{config.years_experience} years</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Acreage</span>
                    <span className="font-medium text-gray-900">{formatNumber(config.acres)} acres</span>
                  </div>
                </div>
              </div>

              {/* Operation Parameters */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">
                  Operation Parameters
                </h3>
                <div className="space-y-0">
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="text-gray-600">Head Count</span>
                    <span className="font-medium text-gray-900">{formatNumber(config.head_count)}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="text-gray-600">Purchase Weight</span>
                    <span className="font-medium text-gray-900">{formatWeight(config.purchase_weight_lbs)}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="text-gray-600">Target Sale Weight</span>
                    <span className="font-medium text-gray-900">{formatWeight(config.sale_weight_lbs)}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="text-gray-600">Avg Daily Gain</span>
                    <span className="font-medium text-gray-900">{config.avg_daily_gain_lbs} lbs/day</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="text-gray-600">Interest Rate</span>
                    <span className="font-medium text-gray-900">{formatPercent(config.interest_rate_pct)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Line of Credit</span>
                    <span className="font-medium text-gray-900">{formatCurrencyWhole(config.loc_amount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Business plan sections added by Plan 06-02 and 06-03 */}
      </div>
    </div>
  );
}
