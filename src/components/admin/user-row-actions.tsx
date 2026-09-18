'use client';

import { useState, useTransition } from 'react';
import { changeBusinessPlanAction, setUserSuspendedAction } from '@/lib/actions/admin';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

export function UserRowActions({
  userId,
  businessId,
  planId,
  suspended,
  isAdmin,
  plans,
}: {
  userId: string;
  businessId: string | null;
  planId: string | null;
  suspended: boolean;
  isAdmin: boolean;
  plans: { id: string; name: string }[];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ error: string } | { success: true; message: string }>) {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await action();
      if ('error' in result) setError(result.error);
      else setMessage(result.message);
    });
  }

  function handleSuspend() {
    const confirmed = window.confirm(
      suspended
        ? 'Restore this user? Their scheduled posts will start publishing again.'
        : 'Suspend this user? They lose access and their scheduled posts stop publishing.'
    );
    if (!confirmed) return;

    run(() => setUserSuspendedAction(userId, !suspended));
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {businessId && (
          <Select
            aria-label="Plan"
            className="w-36"
            defaultValue={planId ?? ''}
            disabled={isPending}
            onChange={(event) =>
              run(() => changeBusinessPlanAction(businessId, event.target.value || null))
            }
          >
            <option value="">No plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </Select>
        )}

        {!isAdmin && (
          <Button
            type="button"
            size="sm"
            variant={suspended ? 'outline' : 'ghost'}
            onClick={handleSuspend}
            disabled={isPending}
          >
            {suspended ? 'Restore' : 'Suspend'}
          </Button>
        )}
      </div>

      {message && <p className="text-right text-xs text-emerald-600">{message}</p>}
      {error && <p className="text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
