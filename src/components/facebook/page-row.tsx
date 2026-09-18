'use client';

import { useState, useTransition } from 'react';
import { togglePageSelectionAction } from '@/lib/actions/facebook';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  valid: 'Ready to post',
  needs_reauth: 'Needs reconnect',
  invalid: 'Disconnected',
};

export function PageRow({
  id,
  name,
  isSelected,
  tokenStatus,
  atLimit,
}: {
  id: string;
  name: string;
  isSelected: boolean;
  tokenStatus: string;
  atLimit: boolean;
}) {
  const [selected, setSelected] = useState(isSelected);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !selected;
    setError(null);

    startTransition(async () => {
      const result = await togglePageSelectionAction(id, next);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setSelected(next);
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{name}</p>
        <p className={cn('text-xs', tokenStatus === 'valid' ? 'text-emerald-600' : 'text-amber-600')}>
          {STATUS_LABELS[tokenStatus] ?? tokenStatus}
        </p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>

      <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={selected}
          disabled={isPending || (!selected && atLimit)}
          onChange={toggle}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed"
        />
        Active
      </label>
    </div>
  );
}
