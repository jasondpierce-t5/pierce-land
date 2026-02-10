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
// Inline helper components for financial tables
// =============================================================================

function TableRow({
  label,
  value,
  indent = false,
}: {
  label: string;
  value: string | number;
  indent?: boolean;
}) {
  return (
    <div className={`flex justify-between py-2 px-4 even:bg-gray-50 ${indent ? 'pl-8' : ''}`}>
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function SubtotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 px-4 border-t border-gray-300 font-semibold">
      <span className="text-gray-700">{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}

function TotalRow({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <div className="flex justify-between py-3 px-4 bg-gray-50 border-t-2 border-gray-300 font-bold text-lg">
      <span className="text-gray-900">{label}</span>
      <span className={positive ? 'text-green-700' : 'text-red-600'}>{value}</span>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-2 bg-gray-100 font-semibold text-gray-700 text-sm uppercase tracking-wide">
      {children}
    </div>
  );
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

        {/* ================================================================= */}
        {/* Spring Turn — Per Head Analysis                                 */}
        {/* ================================================================= */}
        <section>
          <h2 className="border-l-4 border-accent pl-4 text-2xl font-bold text-gray-900">
            Spring Turn &mdash; Per Head Analysis
          </h2>

          <div className="mt-4 bg-white shadow-sm rounded-lg overflow-hidden">
            {/* Purchase */}
            <SectionHeading>Purchase</SectionHeading>
            <TableRow label="Purchase Weight" value={formatWeight(config.purchase_weight_lbs)} />
            <TableRow label="Purchase Price" value={formatCwt(config.market_price_500lb)} />
            <TableRow label="Purchase Cost" value={formatCurrency(spring.purchaseCost)} />

            {/* Carrying Costs */}
            <SectionHeading>Carrying Costs</SectionHeading>
            <TableRow label="Interest Cost" value={formatCurrency(spring.interestCost)} indent />
            <TableRow label="Death Loss" value={formatCurrency(spring.deathLoss)} indent />
            <TableRow label="Health" value={formatCurrency(config.spring_health_cost_per_head)} indent />
            <TableRow label="Freight In" value={formatCurrency(config.spring_freight_in_per_head)} indent />
            <TableRow label="Mineral" value={formatCurrency(config.spring_mineral_cost_per_head)} indent />
            <TableRow label="LRP Premium" value={formatCurrency(config.spring_lrp_premium_per_head)} indent />
            <TableRow label="Marketing/Commission" value={formatCurrency(config.spring_marketing_commission_per_head)} indent />
            <TableRow label="Freight Out" value={formatCurrency(config.spring_freight_out_per_head)} indent />
            <TableRow label="Miscellaneous" value={formatCurrency(config.spring_misc_per_head)} indent />
            <SubtotalRow label="Subtotal Carrying Costs" value={formatCurrency(spring.carryingCosts)} />

            {/* Total Investment */}
            <div className="flex justify-between py-3 px-4 bg-gray-50 border-t border-gray-200 font-bold">
              <span className="text-gray-900">Total Investment</span>
              <span className="text-gray-900">{formatCurrency(spring.totalInvestment)}</span>
            </div>

            {/* Sale */}
            <SectionHeading>Sale</SectionHeading>
            <TableRow label="Sale Weight" value={formatWeight(config.spring_sale_weight_lbs)} />
            <TableRow label="Days on Feed" value={`${spring.daysOnFeed}`} />
            <TableRow label="Weight Gain" value={formatWeight(spring.weightGain)} />
            <TableRow label="Gross Revenue" value={formatCurrency(spring.grossRevenue)} />

            {/* Net Income */}
            <TotalRow
              label="Net Income"
              value={formatCurrency(spring.netIncome)}
              positive={spring.netIncome >= 0}
            />
            <TableRow label="Cost of Gain" value={formatCwt(spring.costOfGain * 100)} />
          </div>
        </section>

        {/* ================================================================= */}
        {/* Winter Turn — Per Head Analysis                                 */}
        {/* ================================================================= */}
        <section>
          <h2 className="border-l-4 border-accent pl-4 text-2xl font-bold text-gray-900">
            Winter Turn &mdash; Per Head Analysis
          </h2>

          <div className="mt-4 bg-white shadow-sm rounded-lg overflow-hidden">
            {/* Purchase */}
            <SectionHeading>Purchase</SectionHeading>
            <TableRow label="Purchase Weight" value={formatWeight(config.purchase_weight_lbs)} />
            <TableRow label="Purchase Price" value={formatCwt(config.market_price_500lb)} />
            <TableRow label="Purchase Cost" value={formatCurrency(winter.purchaseCost)} />

            {/* Carrying Costs */}
            <SectionHeading>Carrying Costs</SectionHeading>
            <TableRow label="Interest Cost" value={formatCurrency(winter.interestCost)} indent />
            <TableRow label="Death Loss" value={formatCurrency(winter.deathLoss)} indent />
            <TableRow label="Health" value={formatCurrency(config.winter_health_cost_per_head)} indent />
            <TableRow label="Freight In" value={formatCurrency(config.winter_freight_in_per_head)} indent />
            <TableRow label="Mineral" value={formatCurrency(config.winter_mineral_cost_per_head)} indent />
            <TableRow label="LRP Premium" value={formatCurrency(config.winter_lrp_premium_per_head)} indent />
            <TableRow label="Marketing/Commission" value={formatCurrency(config.winter_marketing_commission_per_head)} indent />
            <TableRow label="Freight Out" value={formatCurrency(config.winter_freight_out_per_head)} indent />
            <TableRow label="Miscellaneous" value={formatCurrency(config.winter_misc_per_head)} indent />

            {/* Feed Costs (winter-specific) */}
            <SectionHeading>Feed Costs</SectionHeading>
            <TableRow
              label={`Hay Cost (${formatNumber(winter.hayConsumed)} lbs consumed)`}
              value={formatCurrency(winter.hayCost)}
              indent
            />
            <TableRow label={`Hay Waste (${formatPercent(config.hay_waste_pct, 0)})`} value={formatCurrency(winter.hayWaste)} indent />
            <TableRow label="Commodity Cost" value={formatCurrency(winter.commodityCost)} indent />
            <SubtotalRow label="Total Feed Cost" value={formatCurrency(winter.totalFeedCost)} />

            <SubtotalRow label="Subtotal Carrying Costs" value={formatCurrency(winter.carryingCosts)} />

            {/* Total Investment */}
            <div className="flex justify-between py-3 px-4 bg-gray-50 border-t border-gray-200 font-bold">
              <span className="text-gray-900">Total Investment</span>
              <span className="text-gray-900">{formatCurrency(winter.totalInvestment)}</span>
            </div>

            {/* Sale */}
            <SectionHeading>Sale</SectionHeading>
            <TableRow label="Sale Weight" value={formatWeight(config.winter_sale_weight_lbs)} />
            <TableRow label="Days on Feed" value={`${winter.daysOnFeed}`} />
            <TableRow label="Weight Gain" value={formatWeight(winter.weightGain)} />
            <TableRow label="Gross Revenue" value={formatCurrency(winter.grossRevenue)} />

            {/* Net Income */}
            <TotalRow
              label="Net Income"
              value={formatCurrency(winter.netIncome)}
              positive={winter.netIncome >= 0}
            />
            <TableRow label="Cost of Gain" value={formatCwt(winter.costOfGain * 100)} />
          </div>
        </section>

        {/* ================================================================= */}
        {/* Annual Projections                                              */}
        {/* ================================================================= */}
        <section>
          <h2 className="border-l-4 border-accent pl-4 text-2xl font-bold text-gray-900">
            Annual Projections
          </h2>

          <div className="mt-4 bg-white shadow-sm rounded-lg p-6">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Spring Net Total */}
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Spring</p>
                <p
                  className={`text-xl font-bold ${
                    annual.springTotal >= 0 ? 'text-green-700' : 'text-red-600'
                  }`}
                >
                  {formatCurrencyWhole(annual.springTotal)}
                </p>
              </div>

              {/* Winter Net Total */}
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Winter</p>
                <p
                  className={`text-xl font-bold ${
                    annual.winterTotal >= 0 ? 'text-green-700' : 'text-red-600'
                  }`}
                >
                  {formatCurrencyWhole(annual.winterTotal)}
                </p>
              </div>

              {/* Annual Net Income */}
              <div className="bg-gray-50 rounded-lg p-4 text-center border-2 border-accent/20">
                <p className="text-sm text-gray-500 mb-1">Annual Net Income</p>
                <p
                  className={`text-2xl font-bold ${
                    annual.annualNetIncome >= 0 ? 'text-accent' : 'text-red-600'
                  }`}
                >
                  {formatCurrencyWhole(annual.annualNetIncome)}
                </p>
              </div>

              {/* Total Revenue */}
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrencyWhole(annual.totalRevenue)}
                </p>
              </div>

              {/* Total Investment */}
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Total Investment</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrencyWhole(annual.totalInvestment)}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-500">
              Based on {formatNumber(config.head_count)} head
            </p>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Credit Structure                                                 */}
        {/* ================================================================= */}
        <section>
          <h2 className="border-l-4 border-accent pl-4 text-2xl font-bold text-gray-900">
            Credit Structure
          </h2>

          <div className="mt-4 bg-white shadow-sm rounded-lg p-6">
            {/* Key Metrics Row */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Line of Credit</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrencyWhole(config.loc_amount)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Interest Rate</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatPercent(config.interest_rate_pct)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Capital Required</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrencyWhole(annual.totalInvestment)}
                </p>
              </div>
            </div>

            {/* LOC Utilization Bar */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                LOC Utilization: {formatPercent(annual.locUtilization)}
              </p>

              {/* Progress bar */}
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-4 rounded-full transition-all ${
                    annual.locUtilization > 100
                      ? 'bg-red-500'
                      : annual.locUtilization >= 80
                        ? 'bg-amber-500'
                        : 'bg-green'
                  }`}
                  style={{ width: `${Math.min(annual.locUtilization, 100)}%` }}
                />
              </div>

              <p className="mt-2 text-sm text-gray-500">
                Remaining Capacity: {formatCurrencyWhole(annual.locCapacityRemaining)}
              </p>

              {annual.locUtilization > 100 && (
                <p className="mt-2 text-sm font-medium text-red-600">
                  Warning: Capital required exceeds line of credit
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Additional sections added by Plan 06-03 */}
      </div>
    </div>
  );
}
