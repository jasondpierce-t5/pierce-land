'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const segmentLabels: Record<string, string> = {
  config: 'Shared Config',
  versions: 'Bank Versions',
  new: 'New Version',
  edit: 'Edit Version',
};

function isUUID(segment: string): boolean {
  return segment.length === 36 && /^[0-9a-f-]+$/i.test(segment);
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  if (pathname === '/admin') return null;

  const segments = pathname.replace(/^\/admin\/?/, '').split('/').filter(Boolean);

  const crumbs: { label: string; href: string }[] = [
    { label: 'Dashboard', href: '/admin' },
  ];

  let currentPath = '/admin';
  for (const segment of segments) {
    if (isUUID(segment)) continue;
    currentPath += `/${segment}`;
    const label = segmentLabels[segment] || segment;
    crumbs.push({ label, href: currentPath });
  }

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <nav className="flex items-center text-sm text-gray-500">
          {crumbs.map((crumb, index) => (
            <span key={crumb.href} className="flex items-center">
              {index > 0 && <span className="mx-2">/</span>}
              {index < crumbs.length - 1 ? (
                <Link href={crumb.href} className="hover:text-primary transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-gray-700 font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', {
        method: 'DELETE',
      });
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navLinks = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/config', label: 'Shared Config' },
    { href: '/admin/versions', label: 'Bank Versions' },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Pierce Land & Cattle Admin</h1>
            </div>

            <div className="flex items-center space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? 'text-accent bg-primary/50'
                      : 'text-white hover:text-accent hover:bg-primary/50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-md text-sm font-medium text-white hover:text-accent hover:bg-primary/50 transition-colors border border-white/20"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Breadcrumbs */}
      {pathname && <Breadcrumbs pathname={pathname} />}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
