import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchPlanData } from '@/lib/plan-data';

// Disable Next.js data cache — always fetch fresh config from Supabase
export const revalidate = 0;
import {
  formatCurrency,
  formatCurrencyWhole,
  formatPercent,
  formatNumber,
  formatWeight,
  formatCwt,
} from '@/lib/formatters';
import ScenarioChart from '@/components/charts/ScenarioChart';
import BreakevenChart from '@/components/charts/BreakevenChart';
import CostBreakdownChart from '@/components/charts/CostBreakdownChart';
import HaySensitivityChart from '@/components/charts/HaySensitivityChart';
import PurchaseSensitivityChart from '@/components/charts/PurchaseSensitivityChart';
import PrintButton from '@/components/PrintButton';

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
    <div className={`flex justify-between py-2.5 px-4 even:bg-gray-50 ${indent ? 'pl-8' : ''}`}>
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
    <div className="px-4 py-2.5 bg-gray-100 font-semibold text-gray-700 text-sm uppercase tracking-wide">
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

  const { version, config, spring, winter, annual, scenarios, breakeven, worstCase, haySensitivity, purchaseSensitivity } = data;

  // Format the current date as "Month Year"
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Print Button */}
      <div className="no-print flex justify-end max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <PrintButton />
      </div>

      {/* Cover Header */}
      <div className="w-full bg-primary text-white py-14 px-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold tracking-wide">
            PIERCE LAND &amp; CATTLE
          </h1>
          <p className="text-xl mt-2 font-light text-white/80">
            Stocker Heifer Business Plan
          </p>

          <div className="border-t border-white/20 my-6" />

          <div className="flex justify-between items-center">
            <span className="text-lg">
              Prepared for: {version.bank_name}
            </span>
            <span className="text-lg text-white/80">
              {currentDate}
            </span>
          </div>

          <p className="mt-3 text-sm text-white/60">
            {config.operator_name} | {config.operation_location}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* KPI Summary Row */}
        <div className="print-no-break grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
          {/* Annual Net Income */}
          <div className="bg-white shadow-md rounded-lg p-4 border-l-4 border-accent ring-1 ring-accent/20">
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

          <div className="print-no-break mt-6 bg-white shadow-sm rounded-lg border border-gray-100 p-6">
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
        <section className="print-break-before">
          <h2 className="border-l-4 border-accent pl-4 text-2xl font-bold text-gray-900">
            Spring Turn &mdash; Per Head Analysis
          </h2>

          <div className="mt-6 bg-white shadow-sm rounded-lg border border-gray-100 overflow-hidden">
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

            {/* Feed Costs (spring-specific) */}
            <SectionHeading>Feed Costs</SectionHeading>
            <TableRow
              label={`Hay Cost (${formatNumber(spring.hayConsumed)} lbs consumed)`}
              value={formatCurrency(spring.hayCost)}
              indent
            />
            <TableRow label={`Hay Waste (${formatPercent(config.hay_waste_pct, 0)})`} value={formatCurrency(spring.hayWaste)} indent />
            <TableRow label="Commodity Cost" value={formatCurrency(spring.commodityCost)} indent />
            <SubtotalRow label="Total Feed Cost" value={formatCurrency(spring.totalFeedCost)} />

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
            <TableRow label="Cost of Gain" value={`${formatCurrency(spring.costOfGain)}/lb`} />
          </div>

          {/* Spring Cost Breakdown Chart */}
          <div className="print-no-break mt-6 bg-white shadow-sm rounded-lg border border-gray-100 p-6">
            <h4 className="text-base font-semibold text-gray-700 mb-4">Spring Turn Cost Breakdown</h4>
            <CostBreakdownChart
              title="Spring Turn Cost Breakdown"
              segments={[
                { label: 'Purchase Cost', value: spring.purchaseCost },
                { label: 'Interest', value: spring.interestCost },
                { label: 'Death Loss', value: spring.deathLoss },
                { label: 'Feed Costs', value: spring.totalFeedCost },
                { label: 'Health', value: config.spring_health_cost_per_head },
                { label: 'Freight', value: config.spring_freight_in_per_head + config.spring_freight_out_per_head },
                { label: 'Other', value: config.spring_mineral_cost_per_head + config.spring_lrp_premium_per_head + config.spring_marketing_commission_per_head + config.spring_misc_per_head },
              ]}
            />
          </div>
        </section>

        {/* ================================================================= */}
        {/* Winter Turn — Per Head Analysis                                 */}
        {/* ================================================================= */}
        <section>
          <h2 className="border-l-4 border-accent pl-4 text-2xl font-bold text-gray-900">
            Winter Turn &mdash; Per Head Analysis
          </h2>

          <div className="mt-6 bg-white shadow-sm rounded-lg border border-gray-100 overflow-hidden">
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
            <TableRow label="Cost of Gain" value={`${formatCurrency(winter.costOfGain)}/lb`} />
          </div>

          {/* Winter Cost Breakdown Chart */}
          <div className="print-no-break mt-6 bg-white shadow-sm rounded-lg border border-gray-100 p-6">
            <h4 className="text-base font-semibold text-gray-700 mb-4">Winter Turn Cost Breakdown</h4>
            <CostBreakdownChart
              title="Winter Turn Cost Breakdown"
              segments={[
                { label: 'Purchase Cost', value: winter.purchaseCost },
                { label: 'Interest', value: winter.interestCost },
                { label: 'Death Loss', value: winter.deathLoss },
                { label: 'Feed Costs', value: winter.totalFeedCost },
                { label: 'Health', value: config.winter_health_cost_per_head },
                { label: 'Freight', value: config.winter_freight_in_per_head + config.winter_freight_out_per_head },
                { label: 'Other', value: config.winter_mineral_cost_per_head + config.winter_lrp_premium_per_head + config.winter_marketing_commission_per_head + config.winter_misc_per_head },
              ]}
            />
          </div>
        </section>

        {/* ================================================================= */}
        {/* Annual Projections                                              */}
        {/* ================================================================= */}
        <section>
          <h2 className="border-l-4 border-accent pl-4 text-2xl font-bold text-gray-900">
            Annual Projections
          </h2>

          <div className="print-no-break mt-6 bg-white shadow-sm rounded-lg border border-gray-100 p-6">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Spring Net Total */}
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Spring ({formatNumber(annual.springHeadCount)} head)</p>
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
                <p className="text-sm text-gray-500 mb-1">Winter ({formatNumber(annual.winterHeadCount)} head)</p>
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

              {/* Total Investment (Spring Only) */}
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Initial Capital (Spring)</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrencyWhole(annual.totalInvestment)}
                </p>
              </div>

              {/* Protected Margin */}
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Total Protected Margin</p>
                <p className="text-xl font-bold text-green-700">
                  {formatCurrencyWhole(annual.totalProtectedMargin)}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-500">
              Spring: {formatNumber(annual.springHeadCount)} head | Winter: {formatNumber(annual.winterHeadCount)} head (derived from sell/buy)
            </p>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Sell/Buy Marketing                                               */}
        {/* ================================================================= */}
        <section>
          <h2 className="border-l-4 border-accent pl-4 text-2xl font-bold text-gray-900">
            Sell/Buy Marketing
          </h2>

          <div className="print-no-break mt-6 bg-white shadow-sm rounded-lg border border-gray-100 p-6">
            <p className="text-sm text-gray-500 mb-4">
              At each sale, {formatPercent(config.sell_buy_margin_pct)} of gross revenue is kept as protected margin.
              The remaining {formatPercent(100 - config.sell_buy_margin_pct)} is reinvested into lighter replacement cattle.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {/* After Spring Sale */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-700 mb-3">After Spring Sale</h4>
                <div className="space-y-0">
                  <div className="flex justify-between border-b border-gray-200 py-2">
                    <span className="text-gray-600">Head Sold</span>
                    <span className="font-medium text-gray-900">{formatNumber(annual.springSellBuy.headCount)}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 py-2">
                    <span className="text-gray-600">Gross Revenue</span>
                    <span className="font-medium text-gray-900">{formatCurrencyWhole(annual.springSellBuy.totalGrossRevenue)}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 py-2">
                    <span className="text-gray-600">Protected Margin</span>
                    <span className="font-medium text-green-700">{formatCurrencyWhole(annual.springSellBuy.protectedMargin)}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 py-2">
                    <span className="text-gray-600">Reinvestment Pool</span>
                    <span className="font-medium text-gray-900">{formatCurrencyWhole(annual.springSellBuy.reinvestmentPool)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Winter Head Count</span>
                    <span className="font-bold text-accent">{formatNumber(annual.springSellBuy.nextHeadCount)}</span>
                  </div>
                </div>
              </div>

              {/* After Winter Sale */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-700 mb-3">After Winter Sale</h4>
                <div className="space-y-0">
                  <div className="flex justify-between border-b border-gray-200 py-2">
                    <span className="text-gray-600">Head Sold</span>
                    <span className="font-medium text-gray-900">{formatNumber(annual.winterSellBuy.headCount)}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 py-2">
                    <span className="text-gray-600">Gross Revenue</span>
                    <span className="font-medium text-gray-900">{formatCurrencyWhole(annual.winterSellBuy.totalGrossRevenue)}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 py-2">
                    <span className="text-gray-600">Protected Margin</span>
                    <span className="font-medium text-green-700">{formatCurrencyWhole(annual.winterSellBuy.protectedMargin)}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 py-2">
                    <span className="text-gray-600">Reinvestment Pool</span>
                    <span className="font-medium text-gray-900">{formatCurrencyWhole(annual.winterSellBuy.reinvestmentPool)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Next Spring Capacity</span>
                    <span className="font-bold text-accent">{formatNumber(annual.winterSellBuy.nextHeadCount)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500">Total Protected Margin (Annual)</p>
              <p className="text-2xl font-bold text-green-700">
                {formatCurrencyWhole(annual.totalProtectedMargin)}
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Credit Structure                                                 */}
        {/* ================================================================= */}
        <section>
          <h2 className="border-l-4 border-accent pl-4 text-2xl font-bold text-gray-900">
            Credit Structure
          </h2>

          <div className="print-no-break mt-6 bg-white shadow-sm rounded-lg border border-gray-100 p-6">
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
                <p className="text-sm text-gray-500 mb-1">Initial Capital (Spring)</p>
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

        {/* ================================================================= */}
        {/* Scenario Analysis                                              */}
        {/* ================================================================= */}
        <section className="print-break-before">
          <h2 className="border-l-4 border-accent pl-4 text-2xl font-bold text-gray-900">
            Scenario Analysis
          </h2>

          <div className="print-no-break mt-6 bg-white shadow-sm rounded-lg border border-gray-100 p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Metric</th>
                    <th className="text-right py-3 px-4 font-semibold bg-red-50 text-red-700">Low</th>
                    <th className="text-right py-3 px-4 font-semibold bg-gray-50 text-gray-700">Mid</th>
                    <th className="text-right py-3 px-4 font-semibold bg-green-50 text-green-700">High</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-100">
                    <td className="py-3 px-4 text-gray-600">Sale Price</td>
                    <td className="py-3 px-4 text-right text-red-600">{formatCwt(scenarios.low.salePriceCwt)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{formatCwt(scenarios.mid.salePriceCwt)}</td>
                    <td className="py-3 px-4 text-right text-green-600">{formatCwt(scenarios.high.salePriceCwt)}</td>
                  </tr>
                  <tr className="border-t border-gray-100 bg-gray-50/50">
                    <td className="py-3 px-4 text-gray-600">Spring Net/Head</td>
                    <td className="py-3 px-4 text-right text-red-600">{formatCurrency(scenarios.low.springNet)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{formatCurrency(scenarios.mid.springNet)}</td>
                    <td className="py-3 px-4 text-right text-green-600">{formatCurrency(scenarios.high.springNet)}</td>
                  </tr>
                  <tr className="border-t border-gray-100">
                    <td className="py-3 px-4 text-gray-600">Winter Head Count</td>
                    <td className="py-3 px-4 text-right text-red-600">{formatNumber(scenarios.low.winterHeadCount)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{formatNumber(scenarios.mid.winterHeadCount)}</td>
                    <td className="py-3 px-4 text-right text-green-600">{formatNumber(scenarios.high.winterHeadCount)}</td>
                  </tr>
                  <tr className="border-t border-gray-100 bg-gray-50/50">
                    <td className="py-3 px-4 text-gray-600">Winter Net/Head</td>
                    <td className="py-3 px-4 text-right text-red-600">{formatCurrency(scenarios.low.winterNet)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{formatCurrency(scenarios.mid.winterNet)}</td>
                    <td className="py-3 px-4 text-right text-green-600">{formatCurrency(scenarios.high.winterNet)}</td>
                  </tr>
                  <tr className="border-t-2 border-gray-300 font-bold">
                    <td className="py-3 px-4 text-gray-900">Annual Net Income</td>
                    <td className="py-3 px-4 text-right text-red-600">{formatCurrencyWhole(scenarios.low.annualNet)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{formatCurrencyWhole(scenarios.mid.annualNet)}</td>
                    <td className="py-3 px-4 text-right text-green-600">{formatCurrencyWhole(scenarios.high.annualNet)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-sm text-gray-500">
              Spring: {formatNumber(config.head_count)} head | Winter head count varies by scenario (derived from sell/buy)
            </p>
          </div>

          {/* Scenario Chart */}
          <div className="print-no-break mt-6 bg-white shadow-sm rounded-lg border border-gray-100 p-6">
            <h4 className="text-base font-semibold text-gray-700 mb-4">Scenario Comparison</h4>
            <ScenarioChart scenarios={scenarios} />
          </div>
        </section>

        {/* ================================================================= */}
        {/* Breakeven Analysis                                               */}
        {/* ================================================================= */}
        <section>
          <h2 className="border-l-4 border-accent pl-4 text-2xl font-bold text-gray-900">
            Breakeven Analysis
          </h2>

          <div className="print-no-break mt-6 grid md:grid-cols-2 gap-4">
            <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-6 text-center">
              <p className="text-sm text-gray-500">Spring Turn Breakeven</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCwt(breakeven.springBreakeven)}
              </p>
            </div>
            <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-6 text-center">
              <p className="text-sm text-gray-500">Winter Turn Breakeven</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCwt(breakeven.winterBreakeven)}
              </p>
            </div>
          </div>

          <p className="mt-3 text-sm text-gray-500 italic">
            Minimum sale price per cwt required to cover all costs
          </p>

          {/* Breakeven Chart */}
          <div className="print-no-break mt-6 bg-white shadow-sm rounded-lg border border-gray-100 p-6">
            <h4 className="text-base font-semibold text-gray-700 mb-4">Breakeven vs Market Price</h4>
            <BreakevenChart
              springBreakeven={breakeven.springBreakeven}
              winterBreakeven={breakeven.winterBreakeven}
              currentMarketPrice={config.market_price_850lb}
            />
          </div>
        </section>

        {/* ================================================================= */}
        {/* Worst-Case Scenario                                              */}
        {/* ================================================================= */}
        <section>
          <h2 className="border-l-4 border-accent pl-4 text-2xl font-bold text-gray-900">
            Worst-Case Scenario
          </h2>

          <div className="print-no-break mt-6 bg-amber-50 border border-amber-200 rounded-lg p-6">
            <p className="text-gray-700">{worstCase.description}</p>

            <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 mt-4">
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Purchase Price</span>
                <span className="font-medium text-gray-900">{formatCwt(worstCase.purchasePriceCwt)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Sale Price</span>
                <span className="font-medium text-gray-900">{formatCwt(worstCase.salePriceCwt)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Spring Net/Head</span>
                <span className={`font-medium ${worstCase.springNet >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatCurrency(worstCase.springNet)}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Winter Net/Head</span>
                <span className={`font-medium ${worstCase.winterNet >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatCurrency(worstCase.winterNet)}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-amber-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-900 font-bold text-xl">Annual Net Impact</span>
                <span className={`text-xl font-bold ${worstCase.annualNet >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatCurrencyWhole(worstCase.annualNet)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Hay Price Sensitivity                                           */}
        {/* ================================================================= */}
        <section>
          <h2 className="border-l-4 border-accent pl-4 text-2xl font-bold text-gray-900">
            Hay Price Sensitivity
          </h2>

          <div className="print-no-break mt-6 bg-white shadow-sm rounded-lg border border-gray-100 p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Hay Price/Bale</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Feed Cost</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Winter Net/Head</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Winter Net Total</th>
                  </tr>
                </thead>
                <tbody>
                  {haySensitivity.map((point, idx) => {
                    const isCurrentConfig = point.hayPricePerBale === config.hay_price_per_bale;
                    return (
                      <tr
                        key={idx}
                        className={
                          isCurrentConfig
                            ? 'bg-accent/10 border-l-2 border-accent'
                            : idx % 2 === 0
                              ? 'bg-gray-50'
                              : ''
                        }
                      >
                        <td className="py-3 px-4 text-gray-900">
                          {formatCurrency(point.hayPricePerBale)}
                          {isCurrentConfig && (
                            <span className="ml-2 text-xs font-medium text-accent">(current)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900">
                          {formatCurrency(point.totalFeedCost)}
                        </td>
                        <td className={`py-3 px-4 text-right ${point.winterNetPerHead >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {formatCurrency(point.winterNetPerHead)}
                        </td>
                        <td className={`py-3 px-4 text-right font-medium ${point.winterNetTotal >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {formatCurrencyWhole(point.winterNetTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hay Sensitivity Chart */}
          <div className="print-no-break mt-6 bg-white shadow-sm rounded-lg border border-gray-100 p-6">
            <h4 className="text-base font-semibold text-gray-700 mb-4">Hay Price Impact on Winter Net</h4>
            <HaySensitivityChart
              data={haySensitivity}
              currentHayPrice={config.hay_price_per_bale}
            />
          </div>
        </section>

        {/* ================================================================= */}
        {/* Purchase Price Sensitivity                                       */}
        {/* ================================================================= */}
        <section>
          <h2 className="border-l-4 border-accent pl-4 text-2xl font-bold text-gray-900">
            Purchase Price Sensitivity
          </h2>

          <div className="print-no-break mt-6 bg-white shadow-sm rounded-lg border border-gray-100 p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Purchase Price/CWT</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Spring Net/Head</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Winter Net/Head</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Annual Net</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseSensitivity.map((point, idx) => {
                    const isCurrentConfig = point.purchasePriceCwt === config.market_price_500lb;
                    return (
                      <tr
                        key={idx}
                        className={
                          isCurrentConfig
                            ? 'bg-accent/10 border-l-2 border-accent'
                            : idx % 2 === 0
                              ? 'bg-gray-50'
                              : ''
                        }
                      >
                        <td className="py-3 px-4 text-gray-900">
                          {formatCwt(point.purchasePriceCwt)}
                          {isCurrentConfig && (
                            <span className="ml-2 text-xs font-medium text-accent">(current)</span>
                          )}
                        </td>
                        <td className={`py-3 px-4 text-right ${point.springNetPerHead >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {formatCurrency(point.springNetPerHead)}
                        </td>
                        <td className={`py-3 px-4 text-right ${point.winterNetPerHead >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {formatCurrency(point.winterNetPerHead)}
                        </td>
                        <td className={`py-3 px-4 text-right font-medium ${point.annualNetTotal >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {formatCurrencyWhole(point.annualNetTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Purchase Sensitivity Chart */}
          <div className="print-no-break mt-6 bg-white shadow-sm rounded-lg border border-gray-100 p-6">
            <h4 className="text-base font-semibold text-gray-700 mb-4">Purchase Price Impact on Annual Net</h4>
            <PurchaseSensitivityChart
              data={purchaseSensitivity}
              currentPurchasePrice={config.market_price_500lb}
            />
          </div>
        </section>

        {/* ================================================================= */}
        {/* Disclaimer                                                       */}
        {/* ================================================================= */}
        <div className="mt-12 bg-gray-50 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-400">
            This business plan contains forward-looking financial projections based on current market
            conditions and operational assumptions. Actual results may vary based on market
            fluctuations, weather conditions, animal health, and other factors beyond the
            operator&apos;s control. All figures are estimates and should not be construed as
            guarantees of future performance.
          </p>
          <p className="mt-2 text-xs text-gray-300">
            Generated by Pierce Land &amp; Cattle Business Plan System
          </p>
        </div>
      </div>
    </div>
  );
}
