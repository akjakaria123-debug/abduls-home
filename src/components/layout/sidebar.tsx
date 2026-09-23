'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
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
  { href: '/assistant', label: 'Assistant', icon: Sparkles },
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
    <aside className="hidden w-60 shrink-0 border-r border-white/5 bg-[#0A0E22] lg:block">
      <div className="flex h-16 items-center px-6">
        <Link href="/dashboard" className="text-lg font-bold text-white">
          PostPilot
          <span className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
            .ai
          </span>
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
                active
                  ? 'bg-indigo-500/15 text-white ring-1 ring-inset ring-indigo-400/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
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
            className="mt-4 flex items-center gap-3 rounded-lg border-t border-white/5 px-3 pb-2 pt-4 text-sm font-medium text-slate-400 hover:text-white"
          >
            <ShieldCheck className="h-4 w-4" />
            Admin
          </Link>
        )}
      </nav>
    </aside>
  );
}
