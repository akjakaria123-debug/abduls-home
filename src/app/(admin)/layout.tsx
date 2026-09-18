import type { ReactNode } from 'react';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/admin';

const ADMIN_NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/pricing', label: 'Pricing & limits' },
  { href: '/admin/logs', label: 'Logs' },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-900">Admin</span>
            <nav className="flex flex-wrap gap-1">
              {ADMIN_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">
            Back to app
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
