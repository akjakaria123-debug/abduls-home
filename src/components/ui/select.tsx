import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      // The option list is painted by the OS, so it needs its own colours —
      // white-on-white options are otherwise unreadable on some platforms.
      className={cn('block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 [&>option]:bg-[#131a33] [&>option]:text-white', className)}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = 'Select';
