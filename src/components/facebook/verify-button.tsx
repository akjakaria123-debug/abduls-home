'use client';

import { useTransition } from 'react';
import { verifyConnectionAction } from '@/lib/actions/facebook';
import { Button } from '@/components/ui/button';

export function VerifyConnectionButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(async () => void (await verifyConnectionAction()))}
    >
      {isPending ? 'Checking…' : 'Check connection'}
    </Button>
  );
}
