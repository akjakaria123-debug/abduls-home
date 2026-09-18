'use client';

import { useState } from 'react';
import { Bell, ChevronDown, LogOut } from 'lucide-react';
import { signOutAction } from '@/lib/actions/auth';

export function Topbar({ businessName, userEmail }: { businessName: string; userEmail: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="text-sm font-medium text-slate-900">{businessName}</div>

      <div className="flex items-center gap-4">
        <button type="button" className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {userEmail.charAt(0).toUpperCase()}
            </span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <div className="truncate border-b border-slate-100 px-3 py-2 text-xs text-slate-500">{userEmail}</div>
              <form action={signOutAction}>
                <button type="submit" className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
