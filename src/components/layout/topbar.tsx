'use client';

import { useState, useTransition } from 'react';
import { Bell, ChevronDown, LogOut } from 'lucide-react';
import { signOutAction } from '@/lib/actions/auth';
import { markNotificationsReadAction } from '@/lib/actions/notifications';

export interface TopbarNotification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export function Topbar({
  businessName,
  userEmail,
  notifications,
  unreadCount,
}: {
  businessName: string;
  userEmail: string;
  notifications: TopbarNotification[];
  unreadCount: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function toggleBell() {
    const opening = !bellOpen;
    setBellOpen(opening);
    setMenuOpen(false);

    // Opening the panel is the read receipt.
    if (opening && unreadCount > 0) {
      startTransition(async () => {
        await markNotificationsReadAction();
      });
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/5 bg-[#0A0E22] px-4 sm:px-6 lg:px-8">
      <div className="text-sm font-medium text-white">{businessName}</div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            type="button"
            onClick={toggleBell}
            className="relative cursor-pointer rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500/100 px-1 text-[10px] font-semibold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-white/10 bg-[#111634] py-1 shadow-xl">
              <div className="border-b border-white/5 px-3 py-2 text-xs font-semibold text-slate-200">
                Notifications
              </div>

              {notifications.length ? (
                <ul className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <li
                      key={notification.id}
                      className="border-b border-white/5 px-3 py-2 last:border-0"
                    >
                      <p className="text-xs text-slate-300">{notification.message}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {new Date(notification.createdAt).toLocaleString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-6 text-center text-xs text-slate-400">
                  {isPending ? 'Loading…' : 'Nothing to report.'}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setMenuOpen((open) => !open);
              setBellOpen(false);
            }}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-300 hover:bg-white/5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-semibold text-white">
              {userEmail.charAt(0).toUpperCase()}
            </span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-white/10 bg-[#111634] py-1 shadow-xl">
              <div className="truncate border-b border-white/5 px-3 py-2 text-xs text-slate-400">
                {userEmail}
              </div>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                >
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
