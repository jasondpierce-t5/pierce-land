'use client';

import { useState, useEffect } from 'react';

interface ConfigData {
  id?: string;
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
}

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

  const handleChange = (field: keyof ConfigData, value: string) => {
    if (!formData) return;

    const numValue = parseFloat(value);
    setFormData({
      ...formData,
      [field]: numValue,
    });

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

    // Validate positive numbers
    const numericFields: (keyof ConfigData)[] = [
      'market_price_500lb',
      'market_price_850lb',
      'hay_price_per_ton',
      'feed_cost_per_day',
      'avg_daily_gain_lbs',
      'mortality_rate_pct',
      'interest_rate_pct',
      'loc_amount',
    ];

    for (const field of numericFields) {
      const value = formData[field];
      if (isNaN(value) || value < 0) {
        newErrors[field] = 'Must be a positive number';
      }
    }

    // Validate integers
    const integerFields: (keyof ConfigData)[] = [
      'purchase_weight_lbs',
      'sale_weight_lbs',
      'head_count',
    ];

    for (const field of integerFields) {
      const value = formData[field];
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

    if (formData.mortality_rate_pct < 0 || formData.mortality_rate_pct > 100) {
      newErrors.mortality_rate_pct = 'Must be between 0 and 100';
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
        {/* Market Prices Section */}
        <fieldset className="mb-8">
          <legend className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-accent">
            Market Prices (per cwt)
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="market_price_500lb" className="block text-sm font-medium text-gray-700 mb-2">
                500 lb Market Price ($/cwt)
              </label>
              <input
                type="number"
                id="market_price_500lb"
                value={formData.market_price_500lb}
                onChange={(e) => handleChange('market_price_500lb', e.target.value)}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
              {errors.market_price_500lb && (
                <p className="mt-1 text-sm text-red-600">{errors.market_price_500lb}</p>
              )}
            </div>

            <div>
              <label htmlFor="market_price_850lb" className="block text-sm font-medium text-gray-700 mb-2">
                850 lb Market Price ($/cwt)
              </label>
              <input
                type="number"
                id="market_price_850lb"
                value={formData.market_price_850lb}
                onChange={(e) => handleChange('market_price_850lb', e.target.value)}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
              {errors.market_price_850lb && (
                <p className="mt-1 text-sm text-red-600">{errors.market_price_850lb}</p>
              )}
            </div>
          </div>
        </fieldset>

        {/* Feed Costs Section */}
        <fieldset className="mb-8">
          <legend className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-accent">
            Feed Costs
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="hay_price_per_ton" className="block text-sm font-medium text-gray-700 mb-2">
                Hay Price ($/ton)
              </label>
              <input
                type="number"
                id="hay_price_per_ton"
                value={formData.hay_price_per_ton}
                onChange={(e) => handleChange('hay_price_per_ton', e.target.value)}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
              {errors.hay_price_per_ton && (
                <p className="mt-1 text-sm text-red-600">{errors.hay_price_per_ton}</p>
              )}
            </div>

            <div>
              <label htmlFor="feed_cost_per_day" className="block text-sm font-medium text-gray-700 mb-2">
                Feed Cost ($/head/day)
              </label>
              <input
                type="number"
                id="feed_cost_per_day"
                value={formData.feed_cost_per_day}
                onChange={(e) => handleChange('feed_cost_per_day', e.target.value)}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
              {errors.feed_cost_per_day && (
                <p className="mt-1 text-sm text-red-600">{errors.feed_cost_per_day}</p>
              )}
            </div>
          </div>
        </fieldset>

        {/* Operational Parameters Section */}
        <fieldset className="mb-8">
          <legend className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-accent">
            Operational Parameters
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="purchase_weight_lbs" className="block text-sm font-medium text-gray-700 mb-2">
                Purchase Weight (lbs)
              </label>
              <input
                type="number"
                id="purchase_weight_lbs"
                value={formData.purchase_weight_lbs}
                onChange={(e) => handleChange('purchase_weight_lbs', e.target.value)}
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
              {errors.purchase_weight_lbs && (
                <p className="mt-1 text-sm text-red-600">{errors.purchase_weight_lbs}</p>
              )}
            </div>

            <div>
              <label htmlFor="sale_weight_lbs" className="block text-sm font-medium text-gray-700 mb-2">
                Sale Weight (lbs)
              </label>
              <input
                type="number"
                id="sale_weight_lbs"
                value={formData.sale_weight_lbs}
                onChange={(e) => handleChange('sale_weight_lbs', e.target.value)}
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
              {errors.sale_weight_lbs && (
                <p className="mt-1 text-sm text-red-600">{errors.sale_weight_lbs}</p>
              )}
            </div>

            <div>
              <label htmlFor="avg_daily_gain_lbs" className="block text-sm font-medium text-gray-700 mb-2">
                Average Daily Gain (lbs/day)
              </label>
              <input
                type="number"
                id="avg_daily_gain_lbs"
                value={formData.avg_daily_gain_lbs}
                onChange={(e) => handleChange('avg_daily_gain_lbs', e.target.value)}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
              {errors.avg_daily_gain_lbs && (
                <p className="mt-1 text-sm text-red-600">{errors.avg_daily_gain_lbs}</p>
              )}
            </div>

            <div>
              <label htmlFor="mortality_rate_pct" className="block text-sm font-medium text-gray-700 mb-2">
                Mortality Rate (%)
              </label>
              <input
                type="number"
                id="mortality_rate_pct"
                value={formData.mortality_rate_pct}
                onChange={(e) => handleChange('mortality_rate_pct', e.target.value)}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
              {errors.mortality_rate_pct && (
                <p className="mt-1 text-sm text-red-600">{errors.mortality_rate_pct}</p>
              )}
            </div>
          </div>
        </fieldset>

        {/* Financial Defaults Section */}
        <fieldset className="mb-8">
          <legend className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-accent">
            Financial Defaults
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="interest_rate_pct" className="block text-sm font-medium text-gray-700 mb-2">
                Interest Rate (%)
              </label>
              <input
                type="number"
                id="interest_rate_pct"
                value={formData.interest_rate_pct}
                onChange={(e) => handleChange('interest_rate_pct', e.target.value)}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
              {errors.interest_rate_pct && (
                <p className="mt-1 text-sm text-red-600">{errors.interest_rate_pct}</p>
              )}
            </div>

            <div>
              <label htmlFor="loc_amount" className="block text-sm font-medium text-gray-700 mb-2">
                Line of Credit ($)
              </label>
              <input
                type="number"
                id="loc_amount"
                value={formData.loc_amount}
                onChange={(e) => handleChange('loc_amount', e.target.value)}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
              {errors.loc_amount && (
                <p className="mt-1 text-sm text-red-600">{errors.loc_amount}</p>
              )}
            </div>

            <div>
              <label htmlFor="head_count" className="block text-sm font-medium text-gray-700 mb-2">
                Head Count
              </label>
              <input
                type="number"
                id="head_count"
                value={formData.head_count}
                onChange={(e) => handleChange('head_count', e.target.value)}
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
              {errors.head_count && (
                <p className="mt-1 text-sm text-red-600">{errors.head_count}</p>
              )}
            </div>
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
