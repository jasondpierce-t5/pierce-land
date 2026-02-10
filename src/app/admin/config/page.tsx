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

export default function ConfigPage() {
  const [formData, setFormData] = useState<ConfigData | null>(null);
  const [savedData, setSavedData] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  // Reusable input component for numeric fields
  const NumberInput = ({
    field,
    label,
    step = '0.01',
    unit,
  }: {
    field: ConfigField;
    label: string;
    step?: string;
    unit?: string;
  }) => (
    <div>
      <label htmlFor={field} className="block text-sm font-medium text-gray-700 mb-2">
        {label}{unit ? ` (${unit})` : ''}
      </label>
      <input
        type="number"
        id={field}
        value={formData![field] as number}
        onChange={(e) => handleChange(field, e.target.value)}
        step={step}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
      />
      {errors[field] && (
        <p className="mt-1 text-sm text-red-600">{errors[field]}</p>
      )}
    </div>
  );

  // Reusable input component for text fields
  const TextInput = ({
    field,
    label,
  }: {
    field: ConfigField;
    label: string;
  }) => (
    <div>
      <label htmlFor={field} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        type="text"
        id={field}
        value={formData![field] as string}
        onChange={(e) => handleChange(field, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
      />
      {errors[field] && (
        <p className="mt-1 text-sm text-red-600">{errors[field]}</p>
      )}
    </div>
  );

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
        <fieldset className="mb-8">
          <legend className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-accent">
            Operator Information
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextInput field="operator_name" label="Operator Name" />
            <TextInput field="operation_location" label="Operation Location" />
            <NumberInput field="acres" label="Acres" step="1" unit="acres" />
            <NumberInput field="years_experience" label="Years of Experience" step="1" unit="years" />
          </div>
        </fieldset>

        {/* Section 2: Market Prices & Scenarios */}
        <fieldset className="mb-8">
          <legend className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-accent">
            Market Prices & Scenarios
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NumberInput field="market_price_500lb" label="500 lb Market Price" unit="$/cwt" />
            <NumberInput field="market_price_850lb" label="850 lb Market Price" unit="$/cwt" />
            <NumberInput field="sale_price_low_per_cwt" label="Sale Price Low" unit="$/cwt" />
            <NumberInput field="sale_price_high_per_cwt" label="Sale Price High" unit="$/cwt" />
          </div>
        </fieldset>

        {/* Section 3: Feed Costs */}
        <fieldset className="mb-8">
          <legend className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-accent">
            Feed Costs
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NumberInput field="hay_price_per_ton" label="Hay Price" unit="$/ton" />
            <NumberInput field="feed_cost_per_day" label="Feed Cost" unit="$/head/day" />
          </div>
        </fieldset>

        {/* Section 4: Operational Parameters */}
        <fieldset className="mb-8">
          <legend className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-accent">
            Operational Parameters
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NumberInput field="purchase_weight_lbs" label="Purchase Weight" step="1" unit="lbs" />
            <NumberInput field="sale_weight_lbs" label="Sale Weight" step="1" unit="lbs" />
            <NumberInput field="avg_daily_gain_lbs" label="Average Daily Gain" unit="lbs/day" />
            <NumberInput field="mortality_rate_pct" label="Mortality Rate" unit="%" />
          </div>
        </fieldset>

        {/* Section 5: Spring Turn Costs */}
        <fieldset className="mb-8">
          <legend className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-accent">
            Spring Turn Costs
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NumberInput field="spring_sale_weight_lbs" label="Sale Weight" step="1" unit="lbs" />
            <NumberInput field="spring_days_on_feed" label="Days on Feed" step="1" unit="days" />
            <NumberInput field="spring_health_cost_per_head" label="Health Cost" unit="$/head" />
            <NumberInput field="spring_freight_in_per_head" label="Freight In" unit="$/head" />
            <NumberInput field="spring_mineral_cost_per_head" label="Mineral Cost" unit="$/head" />
            <NumberInput field="spring_lrp_premium_per_head" label="LRP Premium" unit="$/head" />
            <NumberInput field="spring_marketing_commission_per_head" label="Marketing Commission" unit="$/head" />
            <NumberInput field="spring_freight_out_per_head" label="Freight Out" unit="$/head" />
            <NumberInput field="spring_death_loss_pct" label="Death Loss" unit="%" />
            <NumberInput field="spring_misc_per_head" label="Miscellaneous" unit="$/head" />
          </div>
        </fieldset>

        {/* Section 6: Winter Turn Costs */}
        <fieldset className="mb-8">
          <legend className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-accent">
            Winter Turn Costs
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NumberInput field="winter_sale_weight_lbs" label="Sale Weight" step="1" unit="lbs" />
            <NumberInput field="winter_days_on_feed" label="Days on Feed" step="1" unit="days" />
            <NumberInput field="winter_health_cost_per_head" label="Health Cost" unit="$/head" />
            <NumberInput field="winter_freight_in_per_head" label="Freight In" unit="$/head" />
            <NumberInput field="winter_mineral_cost_per_head" label="Mineral Cost" unit="$/head" />
            <NumberInput field="winter_lrp_premium_per_head" label="LRP Premium" unit="$/head" />
            <NumberInput field="winter_marketing_commission_per_head" label="Marketing Commission" unit="$/head" />
            <NumberInput field="winter_freight_out_per_head" label="Freight Out" unit="$/head" />
            <NumberInput field="winter_death_loss_pct" label="Death Loss" unit="%" />
            <NumberInput field="winter_misc_per_head" label="Miscellaneous" unit="$/head" />
          </div>
        </fieldset>

        {/* Section 7: Winter Feed Details */}
        <fieldset className="mb-8">
          <legend className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-accent">
            Winter Feed Details
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NumberInput field="hay_price_per_bale" label="Hay Price" unit="$/bale" />
            <NumberInput field="hay_bale_weight_lbs" label="Bale Weight" step="1" unit="lbs" />
            <NumberInput field="hay_daily_intake_lbs" label="Daily Hay Intake" step="0.1" unit="lbs/day" />
            <NumberInput field="hay_waste_pct" label="Hay Waste" unit="%" />
            <NumberInput field="commodity_price_per_ton" label="Commodity Price" unit="$/ton" />
            <NumberInput field="commodity_daily_intake_lbs" label="Daily Commodity Intake" step="0.1" unit="lbs/day" />
          </div>
        </fieldset>

        {/* Section 8: Financial Defaults */}
        <fieldset className="mb-8">
          <legend className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-accent">
            Financial Defaults
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NumberInput field="interest_rate_pct" label="Interest Rate" unit="%" />
            <NumberInput field="loc_amount" label="Line of Credit" unit="$" />
            <NumberInput field="head_count" label="Head Count" step="1" />
          </div>
        </fieldset>

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
