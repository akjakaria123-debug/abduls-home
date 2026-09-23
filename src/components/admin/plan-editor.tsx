'use client';

import { useFormState } from 'react-dom';
import { updatePlanAction, type AdminActionResult } from '@/lib/actions/admin';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';
import { FormMessage } from '@/components/ui/form-message';

const initialState: AdminActionResult | null = null;

export function PlanEditor({
  planId,
  planKey,
  name,
  priceAud,
  maxPages,
  maxPostsPerDay,
  stripePriceId,
  isActive,
}: {
  planId: string;
  planKey: string;
  name: string;
  priceAud: number;
  maxPages: number;
  maxPostsPerDay: number;
  stripePriceId: string | null;
  isActive: boolean;
}) {
  const [state, formAction] = useFormState(updatePlanAction, initialState);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-white">{name}</h2>
        <p className="text-xs text-slate-400">key: {planKey}</p>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="planId" value={planId} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`name-${planId}`}>Display name</Label>
              <Input id={`name-${planId}`} name="name" defaultValue={name} required />
            </div>
            <div>
              <Label htmlFor={`price-${planId}`}>Price (AUD/month)</Label>
              <Input
                id={`price-${planId}`}
                name="priceAud"
                type="number"
                step="0.01"
                min="0"
                defaultValue={priceAud}
                required
              />
            </div>
            <div>
              <Label htmlFor={`pages-${planId}`}>Max Pages</Label>
              <Input
                id={`pages-${planId}`}
                name="maxPages"
                type="number"
                min="0"
                max="100"
                defaultValue={maxPages}
                required
              />
            </div>
            <div>
              <Label htmlFor={`posts-${planId}`}>Max posts/day</Label>
              <Input
                id={`posts-${planId}`}
                name="maxPostsPerDay"
                type="number"
                min="0"
                max="5"
                defaultValue={maxPostsPerDay}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor={`stripe-${planId}`}>Stripe price ID</Label>
            <Input
              id={`stripe-${planId}`}
              name="stripePriceId"
              defaultValue={stripePriceId ?? ''}
              placeholder="price_..."
            />
            <p className="mt-1 text-xs text-slate-400">
              Without this, the plan can&apos;t be bought.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={isActive}
              className="h-4 w-4 rounded border-white/15 text-indigo-300 focus:ring-brand-500"
            />
            Show this plan publicly
          </label>

          {state && 'error' in state && <FormMessage error={state.error} />}
          {state && 'success' in state && <FormMessage success={state.message} />}

          <SubmitButton size="sm" pendingText="Saving…">
            Save plan
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
