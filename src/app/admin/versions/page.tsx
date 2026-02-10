'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface BankVersion {
  id: string;
  bank_name: string;
  slug: string;
  is_active: boolean;
  line_of_credit_override: number | null;
  interest_rate_pct_override: number | null;
  total_head_override: number | null;
  created_at: string;
  updated_at: string;
}

export default function BankVersionsListPage() {
  const [versions, setVersions] = useState<BankVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deactivating, setDeactivating] = useState<string | null>(null);

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/versions');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch versions');
      }

      const data = await response.json();
      setVersions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  };

  const countOverrides = (version: BankVersion): number => {
    let count = 0;
    if (version.line_of_credit_override !== null) count++;
    if (version.interest_rate_pct_override !== null) count++;
    if (version.total_head_override !== null) count++;
    return count;
  };

  const handleDeactivate = async (version: BankVersion) => {
    const confirmed = window.confirm(
      `Deactivate ${version.bank_name}? This will make the plan unavailable publicly.`
    );

    if (!confirmed) return;

    try {
      setDeactivating(version.id);
      setMessage(null);

      const response = await fetch(`/api/admin/versions/${version.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to deactivate version');
      }

      setMessage({
        type: 'success',
        text: 'Version deactivated successfully',
      });

      // Refresh list
      await fetchVersions();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to deactivate version',
      });
    } finally {
      setDeactivating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Loading versions...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bank Versions</h1>
          <p className="mt-2 text-gray-600">
            Manage bank-specific plan versions with custom financial parameters.
          </p>
        </div>
        <Link
          href="/admin/versions/new"
          className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          Create New Bank Version
        </Link>
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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {versions.length === 0 ? (
        <div className="bg-white shadow-md rounded-lg p-8 text-center">
          <p className="text-gray-600">
            No bank versions yet. Create your first one to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bank Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overrides
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {versions.map((version) => {
                const overrideCount = countOverrides(version);
                return (
                  <tr key={version.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {version.bank_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                      {version.slug}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {version.is_active ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {overrideCount > 0
                        ? `${overrideCount} custom value${overrideCount > 1 ? 's' : ''}`
                        : 'Using defaults'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-4">
                      <Link
                        href={`/admin/versions/${version.id}/edit`}
                        className="text-accent hover:underline"
                      >
                        Edit
                      </Link>
                      {version.is_active && (
                        <button
                          onClick={() => handleDeactivate(version)}
                          disabled={deactivating === version.id}
                          className="text-red-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deactivating === version.id ? 'Deactivating...' : 'Deactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
