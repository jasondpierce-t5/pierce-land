'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { generateSlug } from '@/lib/utils';

interface ConfigData {
  interest_rate_pct: number;
  loc_amount: number;
  head_count: number;
}

interface BankVersion {
  id: string;
  bank_name: string;
  slug: string;
  is_active: boolean;
  line_of_credit_override: number | null;
  interest_rate_pct_override: number | null;
  total_head_override: number | null;
}

interface FormData {
  bank_name: string;
  slug: string;
  use_custom_loc: boolean;
  line_of_credit_override: number;
  use_custom_interest: boolean;
  interest_rate_pct_override: number;
  use_custom_head: boolean;
  total_head_override: number;
}

export default function EditBankVersionPage() {
  const router = useRouter();
  const params = useParams();
  const versionId = params?.id as string;

  const [defaults, setDefaults] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    bank_name: '',
    slug: '',
    use_custom_loc: false,
    line_of_credit_override: 500000,
    use_custom_interest: false,
    interest_rate_pct_override: 7.5,
    use_custom_head: false,
    total_head_override: 250,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch defaults and version data on mount
  useEffect(() => {
    fetchDefaults();
    fetchVersion();
  }, [versionId]);

  const fetchDefaults = async () => {
    try {
      const response = await fetch('/api/admin/config');
      if (response.ok) {
        const data = await response.json();
        setDefaults(data);
      }
    } catch (error) {
      console.error('Failed to fetch defaults:', error);
    }
  };

  const fetchVersion = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/versions');

      if (!response.ok) {
        throw new Error('Failed to fetch version');
      }

      const versions: BankVersion[] = await response.json();
      const version = versions.find((v) => v.id === versionId);

      if (!version) {
        throw new Error('Version not found');
      }

      // Pre-fill form with existing data
      setFormData({
        bank_name: version.bank_name,
        slug: version.slug,
        use_custom_loc: version.line_of_credit_override !== null,
        line_of_credit_override: version.line_of_credit_override || 500000,
        use_custom_interest: version.interest_rate_pct_override !== null,
        interest_rate_pct_override: version.interest_rate_pct_override || 7.5,
        use_custom_head: version.total_head_override !== null,
        total_head_override: version.total_head_override || 250,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to load version',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBankNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      bank_name: value,
    }));

    if (errors.bank_name) {
      const newErrors = { ...errors };
      delete newErrors.bank_name;
      setErrors(newErrors);
    }
  };

  const handleSlugChange = (value: string) => {
    setFormData((prev) => ({ ...prev, slug: value }));

    if (errors.slug) {
      const newErrors = { ...errors };
      delete newErrors.slug;
      setErrors(newErrors);
    }
  };

  const handleNumberChange = (field: keyof FormData, value: string) => {
    const numValue = parseFloat(value);
    setFormData((prev) => ({ ...prev, [field]: numValue }));

    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const handleCheckboxChange = (field: keyof FormData, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [field]: checked }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate bank_name
    if (!formData.bank_name.trim()) {
      newErrors.bank_name = 'Bank name is required';
    } else if (formData.bank_name.length > 255) {
      newErrors.bank_name = 'Bank name must not exceed 255 characters';
    }

    // Validate slug
    if (!formData.slug.trim()) {
      newErrors.slug = 'URL slug is required';
    } else {
      const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugPattern.test(formData.slug)) {
        newErrors.slug = 'Slug must be lowercase alphanumeric with hyphens only (e.g., "first-national-bank")';
      }
    }

    // Validate overrides if enabled
    if (formData.use_custom_loc) {
      if (isNaN(formData.line_of_credit_override) || formData.line_of_credit_override <= 0) {
        newErrors.line_of_credit_override = 'Line of credit must be a positive number';
      }
    }

    if (formData.use_custom_interest) {
      if (
        isNaN(formData.interest_rate_pct_override) ||
        formData.interest_rate_pct_override < 0 ||
        formData.interest_rate_pct_override > 100
      ) {
        newErrors.interest_rate_pct_override = 'Interest rate must be between 0 and 100';
      }
    }

    if (formData.use_custom_head) {
      if (
        !Number.isInteger(formData.total_head_override) ||
        formData.total_head_override <= 0
      ) {
        newErrors.total_head_override = 'Total head must be a positive whole number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setMessage({
        type: 'error',
        text: 'Please fix validation errors before submitting',
      });
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);

      const payload = {
        bank_name: formData.bank_name.trim(),
        slug: formData.slug,
        line_of_credit_override: formData.use_custom_loc ? formData.line_of_credit_override : null,
        interest_rate_pct_override: formData.use_custom_interest ? formData.interest_rate_pct_override : null,
        total_head_override: formData.use_custom_head ? formData.total_head_override : null,
      };

      const response = await fetch(`/api/admin/versions/${versionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update bank version');
      }

      // Redirect to list with success message
      router.push('/admin/versions?success=updated');
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update bank version',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/versions');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Loading version...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Edit Bank Version</h1>
        <p className="mt-2 text-gray-600">
          Update bank-specific plan version with custom financial parameters.
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
        {/* Bank Information Section */}
        <fieldset className="mb-8">
          <legend className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-accent">
            Bank Information
          </legend>
          <div className="space-y-6">
            <div>
              <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700 mb-2">
                Bank Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="bank_name"
                value={formData.bank_name}
                onChange={(e) => handleBankNameChange(e.target.value)}
                placeholder="e.g., First National Bank"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
              {errors.bank_name && (
                <p className="mt-1 text-sm text-red-600">{errors.bank_name}</p>
              )}
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
                URL Slug <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="slug"
                value={formData.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">
                Edit slug if needed (use lowercase letters, numbers, and hyphens only).
              </p>
              {errors.slug && (
                <p className="mt-1 text-sm text-red-600">{errors.slug}</p>
              )}
            </div>
          </div>
        </fieldset>

        {/* Custom Values Section */}
        <fieldset className="mb-8">
          <legend className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-accent">
            Custom Values (Optional - leave blank to use defaults)
          </legend>
          <div className="space-y-6">
            {/* Line of Credit */}
            <div>
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="use_custom_loc"
                  checked={formData.use_custom_loc}
                  onChange={(e) => handleCheckboxChange('use_custom_loc', e.target.checked)}
                  className="h-4 w-4 text-accent focus:ring-accent border-gray-300 rounded"
                />
                <label htmlFor="use_custom_loc" className="ml-2 text-sm font-medium text-gray-700">
                  Use custom line of credit
                </label>
              </div>
              {formData.use_custom_loc ? (
                <>
                  <input
                    type="number"
                    id="line_of_credit_override"
                    value={formData.line_of_credit_override}
                    onChange={(e) => handleNumberChange('line_of_credit_override', e.target.value)}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                  {errors.line_of_credit_override && (
                    <p className="mt-1 text-sm text-red-600">{errors.line_of_credit_override}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  Using default: ${defaults?.loc_amount?.toLocaleString() || '500,000'}
                </p>
              )}
            </div>

            {/* Interest Rate */}
            <div>
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="use_custom_interest"
                  checked={formData.use_custom_interest}
                  onChange={(e) => handleCheckboxChange('use_custom_interest', e.target.checked)}
                  className="h-4 w-4 text-accent focus:ring-accent border-gray-300 rounded"
                />
                <label htmlFor="use_custom_interest" className="ml-2 text-sm font-medium text-gray-700">
                  Use custom interest rate
                </label>
              </div>
              {formData.use_custom_interest ? (
                <>
                  <input
                    type="number"
                    id="interest_rate_pct_override"
                    value={formData.interest_rate_pct_override}
                    onChange={(e) => handleNumberChange('interest_rate_pct_override', e.target.value)}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                  {errors.interest_rate_pct_override && (
                    <p className="mt-1 text-sm text-red-600">{errors.interest_rate_pct_override}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  Using default: {defaults?.interest_rate_pct || '7.5'}%
                </p>
              )}
            </div>

            {/* Total Head Count */}
            <div>
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="use_custom_head"
                  checked={formData.use_custom_head}
                  onChange={(e) => handleCheckboxChange('use_custom_head', e.target.checked)}
                  className="h-4 w-4 text-accent focus:ring-accent border-gray-300 rounded"
                />
                <label htmlFor="use_custom_head" className="ml-2 text-sm font-medium text-gray-700">
                  Use custom head count
                </label>
              </div>
              {formData.use_custom_head ? (
                <>
                  <input
                    type="number"
                    id="total_head_override"
                    value={formData.total_head_override}
                    onChange={(e) => handleNumberChange('total_head_override', e.target.value)}
                    step="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                  {errors.total_head_override && (
                    <p className="mt-1 text-sm text-red-600">{errors.total_head_override}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  Using default: {defaults?.head_count || '250'} head
                </p>
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
            {submitting ? 'Updating...' : 'Update Bank Version'}
          </button>
        </div>
      </form>
    </div>
  );
}
