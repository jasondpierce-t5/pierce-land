export default function AdminDashboardPage() {
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-accent">
          <h2 className="text-xl font-semibold text-primary mb-2">
            Shared Config
          </h2>
          <p className="text-gray-600 mb-4">
            Manage shared financial configurations that apply across all bank versions, including income projections, operating expenses, and depreciation schedules.
          </p>
          <a
            href="/admin/config"
            className="text-accent hover:text-accent/80 font-medium"
          >
            Configure →
          </a>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green">
          <h2 className="text-xl font-semibold text-primary mb-2">
            Bank Versions
          </h2>
          <p className="text-gray-600 mb-4">
            Create and manage bank-specific plan versions with custom loan structures, terms, and approval requirements.
          </p>
          <a
            href="/admin/banks"
            className="text-green hover:text-green/80 font-medium"
          >
            Manage Versions →
          </a>
        </div>
      </div>
    </div>
  );
}
