'use client';

import { useState, useTransition } from 'react';
import { disconnectFacebookAction } from '@/lib/actions/facebook';
import { Button } from '@/components/ui/button';

export function DisconnectButton() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(
      'Disconnect Facebook? Your Pages will stop publishing until you reconnect.'
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await disconnectFacebookAction();
      if ('error' in result) setError(result.error);
    });
  }

  return (
    <div>
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
        {isPending ? 'Disconnecting…' : 'Disconnect'}
      </Button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
