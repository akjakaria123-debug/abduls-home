'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Facebook,
  BarChart3,
  CreditCard,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/content', label: 'Content', icon: FileText },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/facebook-pages', label: 'Facebook Pages', icon: Facebook },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="flex h-16 items-center px-6">
        <Link href="/dashboard" className="text-lg font-bold text-slate-900">
          PostPilot<span className="text-brand-600">.ai</span>
        </Link>
      </div>
      <nav className="space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            href="/admin"
            className="mt-4 flex items-center gap-3 rounded-lg border-t border-slate-100 px-3 pb-2 pt-4 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ShieldCheck className="h-4 w-4" />
            Admin
          </Link>
        )}
      </nav>
    </aside>
  );
}
