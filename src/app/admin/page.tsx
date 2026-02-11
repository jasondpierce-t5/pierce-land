'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface BankVersion {
  id: string;
  bank_name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminDashboardPage() {
  const [versions, setVersions] = useState<BankVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVersions() {
      try {
        const res = await fetch('/api/admin/versions');
        if (res.ok) {
          const data = await res.json();
          setVersions(data);
        }
      } catch (error) {
        console.error('Failed to fetch versions:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchVersions();
  }, []);

  const activeVersions = versions.filter((v) => v.is_active);
  const totalVersions = versions.length;
  const activeCount = activeVersions.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-2">
          Pierce Land & Cattle Admin Dashboard
        </h1>
        <p className="text-gray-600">
          Welcome to the admin dashboard. Manage your business plan configurations and bank versions.
        </p>
      </div>

      {/* Summary Stats Row */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-green"></span>
              Active Versions
            </div>
            <div className="text-2xl font-bold text-primary">{activeCount}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-accent"></span>
              Total Versions
            </div>
            <div className="text-2xl font-bold text-primary">{totalVersions}</div>
          </div>
        </div>
      )}

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/admin/config"
          className="bg-white p-6 rounded-lg shadow-md border-l-4 border-accent transition-transform duration-150 hover:scale-[1.02]"
        >
          <h2 className="text-xl font-semibold text-primary mb-2">
            Shared Config
          </h2>
          <p className="text-gray-600 mb-4">
            Manage shared financial configurations that apply across all bank versions, including income projections, operating expenses, and depreciation schedules.
          </p>
          <span className="text-accent hover:text-accent/80 font-medium">
            Configure →
          </span>
        </Link>

        <Link
          href="/admin/versions"
          className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green transition-transform duration-150 hover:scale-[1.02]"
        >
          <h2 className="text-xl font-semibold text-primary mb-2">
            Bank Versions
          </h2>
          <p className="text-gray-600 mb-4">
            Create and manage bank-specific plan versions with custom loan structures, terms, and approval requirements.
          </p>
          <span className="text-green hover:text-green/80 font-medium">
            Manage Versions →
          </span>
        </Link>
      </div>

      {/* Active Versions Quick Links */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-primary mb-4">Active Versions</h2>
        {loading ? (
          <div className="space-y-3">
            <div className="animate-pulse h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="animate-pulse h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="animate-pulse h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ) : activeVersions.length === 0 ? (
          <p className="text-gray-500 text-sm">No active versions</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {activeVersions.map((version) => (
              <li key={version.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-green"></span>
                  <span className="text-sm font-medium text-primary">{version.bank_name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <Link
                    href={`/plan/${version.slug}`}
                    className="text-sm text-accent hover:text-accent/80 font-medium"
                  >
                    View Plan
                  </Link>
                  <Link
                    href={`/admin/versions/${version.id}/edit`}
                    className="text-sm text-green hover:text-green/80 font-medium"
                  >
                    Edit
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
