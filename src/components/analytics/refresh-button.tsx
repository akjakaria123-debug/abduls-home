'use client';

import { useState, useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { refreshInsightsAction } from '@/lib/actions/analytics';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function RefreshInsightsButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await refreshInsightsAction();
      if ('error' in result) setError(result.error);
      else setMessage(result.message);
    });
  }

  return (
    <div className="text-right">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
        <RefreshCw className={cn('h-4 w-4', isPending && 'animate-spin')} />
        {isPending ? 'Checking…' : 'Refresh'}
      </Button>
      {message && <p className="mt-1 text-xs text-emerald-600">{message}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
