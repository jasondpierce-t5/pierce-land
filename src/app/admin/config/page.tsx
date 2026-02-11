'use client';

import { useState, useEffect } from 'react';

interface ConfigData {
  id?: string;
  // Original fields
  market_price_500lb: number;
  market_price_850lb: number;
  hay_price_per_ton: number;
  feed_cost_per_day: number;
  purchase_weight_lbs: number;
  sale_weight_lbs: number;
  avg_daily_gain_lbs: number;
  mortality_rate_pct: number;
  interest_rate_pct: number;
  loc_amount: number;
  head_count: number;
  // Operator info
  operator_name: string;
  operation_location: string;
  acres: number;
  years_experience: number;
  // Sale scenarios
  sale_price_low_per_cwt: number;
  sale_price_high_per_cwt: number;
  // Spring turn
  spring_sale_weight_lbs: number;
  spring_days_on_feed: number;
  spring_health_cost_per_head: number;
  spring_freight_in_per_head: number;
  spring_mineral_cost_per_head: number;
  spring_lrp_premium_per_head: number;
  spring_marketing_commission_per_head: number;
  spring_freight_out_per_head: number;
  spring_death_loss_pct: number;
  spring_misc_per_head: number;
  // Winter turn
  winter_sale_weight_lbs: number;
  winter_days_on_feed: number;
  winter_health_cost_per_head: number;
  winter_freight_in_per_head: number;
  winter_mineral_cost_per_head: number;
  winter_lrp_premium_per_head: number;
  winter_marketing_commission_per_head: number;
  winter_freight_out_per_head: number;
  winter_death_loss_pct: number;
  winter_misc_per_head: number;
  // Winter feed
  hay_price_per_bale: number;
  hay_bale_weight_lbs: number;
  hay_daily_intake_lbs: number;
  hay_waste_pct: number;
  commodity_price_per_ton: number;
  commodity_daily_intake_lbs: number;
}

// Helper type for fields that can be string or number
type ConfigField = keyof ConfigData;

// Section names for accordion state tracking
const SECTION_NAMES = [
  'operator-info',
  'market-prices',
  'feed-costs',
  'operational-params',
  'spring-turn',
  'winter-turn',
  'winter-feed',
  'financial-defaults',
] as const;

type SectionName = typeof SECTION_NAMES[number];

// Default open sections (first 3: most frequently accessed)
const DEFAULT_OPEN_SECTIONS = new Set<SectionName>([
  'operator-info',
  'market-prices',
  'feed-costs',
]);

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function CollapsibleSection({
  name,
  title,
  description,
  isOpen,
  onToggle,
  children,
}: {
  name: SectionName;
  title: string;
  description: string;
  isOpen: boolean;
  onToggle: (name: SectionName) => void;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="mb-2">
      <legend className="sr-only">{title}</legend>
      <button
        type="button"
        onClick={() => onToggle(name)}
        className="w-full flex items-center justify-between py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors duration-150 cursor-pointer group"
      >
        <div className="text-left">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-accent transition-colors duration-150">
            {title}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
        <ChevronIcon isOpen={isOpen} />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pt-4 pb-6">
          <div className="border-t-2 border-accent pt-4">
            {children}
          </div>
        </div>
      </div>
    </fieldset>
  );
}

function NumberInput({
  field,
  label,
  step = '0.01',
  unit,
  value,
  onChange,
  error,
  description,
}: {
  field: string;
  label: string;
  step?: string;
  unit?: string;
  value: number;
  onChange: (field: ConfigField, value: string) => void;
  error?: string;
  description?: string;
}) {
  return (
    <div>
      <label htmlFor={field} className="block text-sm font-medium text-gray-700 mb-2">
        {label}{unit ? ` (${unit})` : ''}
      </label>
      <input
        type="number"
        id={field}
        value={value}
        onChange={(e) => onChange(field as ConfigField, e.target.value)}
        step={step}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
      />
      {description && (
        <p className="mt-1 text-xs text-gray-400">{description}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

function TextInput({
  field,
  label,
  value,
  onChange,
  error,
  description,
}: {
  field: string;
  label: string;
  value: string;
  onChange: (field: ConfigField, value: string) => void;
  error?: string;
  description?: string;
}) {
  return (
    <div>
      <label htmlFor={field} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        type="text"
        id={field}
        value={value}
        onChange={(e) => onChange(field as ConfigField, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
      />
      {description && (
        <p className="mt-1 text-xs text-gray-400">{description}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

export default function ConfigPage() {
  const [formData, setFormData] = useState<ConfigData | null>(null);
  const [savedData, setSavedData] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openSections, setOpenSections] = useState<Set<SectionName>>(new Set(DEFAULT_OPEN_SECTIONS));

  // Fetch current config on mount
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/config');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch configuration');
      }

      const data = await response.json();
      setFormData(data);
      setSavedData(data);
      setMessage(null);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to load configuration',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: ConfigField, value: string) => {
    if (!formData) return;

    // Handle string fields
    if (field === 'operator_name' || field === 'operation_location') {
      setFormData({
        ...formData,
        [field]: value,
      });
    } else {
      const numValue = parseFloat(value);
      setFormData({
        ...formData,
        [field]: isNaN(numValue) ? 0 : numValue,
      });
    }

    // Clear error for this field
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const validateForm = (): boolean => {
    if (!formData) return false;

    const newErrors: Record<string, string> = {};

    // Validate string fields
    if (!formData.operator_name || formData.operator_name.trim().length === 0) {
      newErrors.operator_name = 'Operator name is required';
    }
    if (!formData.operation_location || formData.operation_location.trim().length === 0) {
      newErrors.operation_location = 'Operation location is required';
    }

    // Validate operator info integers
    if (!Number.isInteger(formData.acres) || formData.acres <= 0) {
      newErrors.acres = 'Must be a positive whole number';
    }
    if (!Number.isInteger(formData.years_experience) || formData.years_experience < 0) {
      newErrors.years_experience = 'Must be a non-negative whole number';
    }

    // Validate positive numbers (numeric fields that must be >= 0)
    const positiveNumericFields: ConfigField[] = [
      'market_price_500lb',
      'market_price_850lb',
      'hay_price_per_ton',
      'feed_cost_per_day',
      'avg_daily_gain_lbs',
      'mortality_rate_pct',
      'interest_rate_pct',
      'loc_amount',
      'sale_price_low_per_cwt',
      'sale_price_high_per_cwt',
      'spring_health_cost_per_head',
      'spring_freight_in_per_head',
      'spring_mineral_cost_per_head',
      'spring_lrp_premium_per_head',
      'spring_marketing_commission_per_head',
      'spring_freight_out_per_head',
      'spring_death_loss_pct',
      'spring_misc_per_head',
      'winter_health_cost_per_head',
      'winter_freight_in_per_head',
      'winter_mineral_cost_per_head',
      'winter_lrp_premium_per_head',
      'winter_marketing_commission_per_head',
      'winter_freight_out_per_head',
      'winter_death_loss_pct',
      'winter_misc_per_head',
      'hay_price_per_bale',
      'hay_daily_intake_lbs',
      'hay_waste_pct',
      'commodity_price_per_ton',
      'commodity_daily_intake_lbs',
    ];

    for (const field of positiveNumericFields) {
      const value = formData[field] as number;
      if (isNaN(value) || value < 0) {
        newErrors[field] = 'Must be a positive number';
      }
    }

    // Validate integers
    const integerFields: ConfigField[] = [
      'purchase_weight_lbs',
      'sale_weight_lbs',
      'head_count',
      'spring_sale_weight_lbs',
      'spring_days_on_feed',
      'winter_sale_weight_lbs',
      'winter_days_on_feed',
      'hay_bale_weight_lbs',
    ];

    for (const field of integerFields) {
      const value = formData[field] as number;
      if (!Number.isInteger(value) || value <= 0) {
        newErrors[field] = 'Must be a positive whole number';
      }
    }

    // Validate ranges
    if (formData.purchase_weight_lbs < 100 || formData.purchase_weight_lbs > 2000) {
      newErrors.purchase_weight_lbs = 'Must be between 100 and 2000 lbs';
    }

    if (formData.sale_weight_lbs < 100 || formData.sale_weight_lbs > 2000) {
      newErrors.sale_weight_lbs = 'Must be between 100 and 2000 lbs';
    }

    // Validate percentage fields (0-100)
    const percentageFields: ConfigField[] = [
      'mortality_rate_pct',
      'spring_death_loss_pct',
      'winter_death_loss_pct',
      'hay_waste_pct',
    ];

    for (const field of percentageFields) {
      const value = formData[field] as number;
      if (value < 0 || value > 100) {
        newErrors[field] = 'Must be between 0 and 100';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData || !validateForm()) {
      setMessage({
        type: 'error',
        text: 'Please fix validation errors before submitting',
      });
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);

      const response = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update configuration');
      }

      setFormData(data);
      setSavedData(data);
      setMessage({
        type: 'success',
        text: 'Configuration updated successfully',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update configuration',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (savedData) {
      setFormData(savedData);
      setErrors({});
      setMessage(null);
    }
  };

  const toggleSection = (name: SectionName) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Loading configuration...</div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load configuration. Please ensure the database has been seeded.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Shared Configuration</h1>
        <p className="mt-2 text-gray-600">
          Edit operational and financial parameters that apply to all bank-specific plans.
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        {/* Section 1: Operator Information */}
        <CollapsibleSection
          name="operator-info"
          title="Operator Information"
          description="Basic details about your operation that appear on bank plan cover pages"
          isOpen={openSections.has('operator-info')}
          onToggle={toggleSection}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextInput field="operator_name" label="Operator Name" value={formData.operator_name} onChange={handleChange} error={errors.operator_name} />
            <TextInput field="operation_location" label="Operation Location" value={formData.operation_location} onChange={handleChange} error={errors.operation_location} />
            <NumberInput field="acres" label="Acres" step="1" unit="acres" value={formData.acres} onChange={handleChange} error={errors.acres} />
            <NumberInput field="years_experience" label="Years of Experience" step="1" unit="years" value={formData.years_experience} onChange={handleChange} error={errors.years_experience} />
          </div>
        </CollapsibleSection>

        {/* Section 2: Market Prices & Scenarios */}
        <CollapsibleSection
          name="market-prices"
          title="Market Prices & Scenarios"
          description="Current cattle purchase and sale prices used to calculate profitability across low/mid/high scenarios"
          isOpen={openSections.has('market-prices')}
          onToggle={toggleSection}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NumberInput field="market_price_500lb" label="Purchase Price (Mid)" unit="$/cwt" value={formData.market_price_500lb} onChange={handleChange} error={errors.market_price_500lb} />
            <NumberInput field="market_price_850lb" label="Sale Price (Mid)" unit="$/cwt" value={formData.market_price_850lb} onChange={handleChange} error={errors.market_price_850lb} />
            <NumberInput field="sale_price_low_per_cwt" label="Sale Price Low" unit="$/cwt" value={formData.sale_price_low_per_cwt} onChange={handleChange} error={errors.sale_price_low_per_cwt} />
            <NumberInput field="sale_price_high_per_cwt" label="Sale Price High" unit="$/cwt" value={formData.sale_price_high_per_cwt} onChange={handleChange} error={errors.sale_price_high_per_cwt} />
          </div>
        </CollapsibleSection>

        {/* Section 3: Feed Costs */}
        <CollapsibleSection
          name="feed-costs"
          title="Feed Costs"
          description="General feed costs used in spring turn calculations"
          isOpen={openSections.has('feed-costs')}
          onToggle={toggleSection}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NumberInput field="hay_price_per_ton" label="Hay Price" unit="$/ton" value={formData.hay_price_per_ton} onChange={handleChange} error={errors.hay_price_per_ton} />
            <NumberInput field="feed_cost_per_day" label="Feed Cost" unit="$/head/day" value={formData.feed_cost_per_day} onChange={handleChange} error={errors.feed_cost_per_day} />
          </div>
        </CollapsibleSection>

        {/* Section 4: Operational Parameters */}
        <CollapsibleSection
          name="operational-params"
          title="Operational Parameters"
          description="Purchase and sale weights, daily gain, and mortality assumptions for projections"
          isOpen={openSections.has('operational-params')}
          onToggle={toggleSection}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NumberInput field="purchase_weight_lbs" label="Purchase Weight" step="1" unit="lbs" value={formData.purchase_weight_lbs} onChange={handleChange} error={errors.purchase_weight_lbs} />
            <NumberInput field="sale_weight_lbs" label="Sale Weight" step="1" unit="lbs" value={formData.sale_weight_lbs} onChange={handleChange} error={errors.sale_weight_lbs} />
            <NumberInput field="avg_daily_gain_lbs" label="Average Daily Gain" unit="lbs/day" value={formData.avg_daily_gain_lbs} onChange={handleChange} error={errors.avg_daily_gain_lbs} description="Expected average daily weight gain per head" />
            <NumberInput field="mortality_rate_pct" label="Mortality Rate" unit="%" value={formData.mortality_rate_pct} onChange={handleChange} error={errors.mortality_rate_pct} description="Expected annual death loss across all causes" />
          </div>
        </CollapsibleSection>

        {/* Section 5: Spring Turn Costs */}
        <CollapsibleSection
          name="spring-turn"
          title="Spring Turn Costs"
          description="Per-head costs for the spring grazing turn (typically March-September)"
          isOpen={openSections.has('spring-turn')}
          onToggle={toggleSection}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NumberInput field="spring_sale_weight_lbs" label="Sale Weight" step="1" unit="lbs" value={formData.spring_sale_weight_lbs} onChange={handleChange} error={errors.spring_sale_weight_lbs} />
            <NumberInput field="spring_days_on_feed" label="Days on Feed" step="1" unit="days" value={formData.spring_days_on_feed} onChange={handleChange} error={errors.spring_days_on_feed} />
            <NumberInput field="spring_health_cost_per_head" label="Health Cost" unit="$/head" value={formData.spring_health_cost_per_head} onChange={handleChange} error={errors.spring_health_cost_per_head} />
            <NumberInput field="spring_freight_in_per_head" label="Freight In" unit="$/head" value={formData.spring_freight_in_per_head} onChange={handleChange} error={errors.spring_freight_in_per_head} />
            <NumberInput field="spring_mineral_cost_per_head" label="Mineral Cost" unit="$/head" value={formData.spring_mineral_cost_per_head} onChange={handleChange} error={errors.spring_mineral_cost_per_head} />
            <NumberInput field="spring_lrp_premium_per_head" label="LRP Premium" unit="$/head" value={formData.spring_lrp_premium_per_head} onChange={handleChange} error={errors.spring_lrp_premium_per_head} description="Livestock Risk Protection insurance premium" />
            <NumberInput field="spring_marketing_commission_per_head" label="Marketing Commission" unit="$/head" value={formData.spring_marketing_commission_per_head} onChange={handleChange} error={errors.spring_marketing_commission_per_head} description="Sale barn or auction commission fee" />
            <NumberInput field="spring_freight_out_per_head" label="Freight Out" unit="$/head" value={formData.spring_freight_out_per_head} onChange={handleChange} error={errors.spring_freight_out_per_head} />
            <NumberInput field="spring_death_loss_pct" label="Death Loss" unit="%" value={formData.spring_death_loss_pct} onChange={handleChange} error={errors.spring_death_loss_pct} />
            <NumberInput field="spring_misc_per_head" label="Miscellaneous" unit="$/head" value={formData.spring_misc_per_head} onChange={handleChange} error={errors.spring_misc_per_head} />
          </div>
        </CollapsibleSection>

        {/* Section 6: Winter Turn Costs */}
        <CollapsibleSection
          name="winter-turn"
          title="Winter Turn Costs"
          description="Per-head costs for the winter feeding turn (typically October-February)"
          isOpen={openSections.has('winter-turn')}
          onToggle={toggleSection}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NumberInput field="winter_sale_weight_lbs" label="Sale Weight" step="1" unit="lbs" value={formData.winter_sale_weight_lbs} onChange={handleChange} error={errors.winter_sale_weight_lbs} />
            <NumberInput field="winter_days_on_feed" label="Days on Feed" step="1" unit="days" value={formData.winter_days_on_feed} onChange={handleChange} error={errors.winter_days_on_feed} />
            <NumberInput field="winter_health_cost_per_head" label="Health Cost" unit="$/head" value={formData.winter_health_cost_per_head} onChange={handleChange} error={errors.winter_health_cost_per_head} />
            <NumberInput field="winter_freight_in_per_head" label="Freight In" unit="$/head" value={formData.winter_freight_in_per_head} onChange={handleChange} error={errors.winter_freight_in_per_head} />
            <NumberInput field="winter_mineral_cost_per_head" label="Mineral Cost" unit="$/head" value={formData.winter_mineral_cost_per_head} onChange={handleChange} error={errors.winter_mineral_cost_per_head} />
            <NumberInput field="winter_lrp_premium_per_head" label="LRP Premium" unit="$/head" value={formData.winter_lrp_premium_per_head} onChange={handleChange} error={errors.winter_lrp_premium_per_head} description="Livestock Risk Protection insurance premium" />
            <NumberInput field="winter_marketing_commission_per_head" label="Marketing Commission" unit="$/head" value={formData.winter_marketing_commission_per_head} onChange={handleChange} error={errors.winter_marketing_commission_per_head} description="Sale barn or auction commission fee" />
            <NumberInput field="winter_freight_out_per_head" label="Freight Out" unit="$/head" value={formData.winter_freight_out_per_head} onChange={handleChange} error={errors.winter_freight_out_per_head} />
            <NumberInput field="winter_death_loss_pct" label="Death Loss" unit="%" value={formData.winter_death_loss_pct} onChange={handleChange} error={errors.winter_death_loss_pct} />
            <NumberInput field="winter_misc_per_head" label="Miscellaneous" unit="$/head" value={formData.winter_misc_per_head} onChange={handleChange} error={errors.winter_misc_per_head} />
          </div>
        </CollapsibleSection>

        {/* Section 7: Winter Feed Details */}
        <CollapsibleSection
          name="winter-feed"
          title="Winter Feed Details"
          description="Hay and commodity feed pricing, intake rates, and waste factors for winter cost calculations"
          isOpen={openSections.has('winter-feed')}
          onToggle={toggleSection}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NumberInput field="hay_price_per_bale" label="Hay Price" unit="$/bale" value={formData.hay_price_per_bale} onChange={handleChange} error={errors.hay_price_per_bale} />
            <NumberInput field="hay_bale_weight_lbs" label="Bale Weight" step="1" unit="lbs" value={formData.hay_bale_weight_lbs} onChange={handleChange} error={errors.hay_bale_weight_lbs} />
            <NumberInput field="hay_daily_intake_lbs" label="Daily Hay Intake" step="0.1" unit="lbs/day" value={formData.hay_daily_intake_lbs} onChange={handleChange} error={errors.hay_daily_intake_lbs} />
            <NumberInput field="hay_waste_pct" label="Hay Waste" unit="%" value={formData.hay_waste_pct} onChange={handleChange} error={errors.hay_waste_pct} description="Percentage lost to weather, trampling, spoilage" />
            <NumberInput field="commodity_price_per_ton" label="Commodity Price" unit="$/ton" value={formData.commodity_price_per_ton} onChange={handleChange} error={errors.commodity_price_per_ton} description="Supplemental feed (grain/pellets) price" />
            <NumberInput field="commodity_daily_intake_lbs" label="Daily Commodity Intake" step="0.1" unit="lbs/day" value={formData.commodity_daily_intake_lbs} onChange={handleChange} error={errors.commodity_daily_intake_lbs} description="Pounds of supplement fed per head per day" />
          </div>
        </CollapsibleSection>

        {/* Section 8: Financial Defaults */}
        <CollapsibleSection
          name="financial-defaults"
          title="Financial Defaults"
          description="Default interest rate, line of credit, and head count — bank versions can override these"
          isOpen={openSections.has('financial-defaults')}
          onToggle={toggleSection}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NumberInput field="interest_rate_pct" label="Interest Rate" unit="%" value={formData.interest_rate_pct} onChange={handleChange} error={errors.interest_rate_pct} />
            <NumberInput field="loc_amount" label="Line of Credit" unit="$" value={formData.loc_amount} onChange={handleChange} error={errors.loc_amount} />
            <NumberInput field="head_count" label="Head Count" step="1" value={formData.head_count} onChange={handleChange} error={errors.head_count} />
          </div>
        </CollapsibleSection>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            disabled={submitting}
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || Object.keys(errors).length > 0}
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
