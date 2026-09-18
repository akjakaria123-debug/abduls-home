'use client';

import { useFormState } from 'react-dom';
import { Check } from 'lucide-react';
import { createCheckoutSessionAction, type BillingActionResult } from '@/lib/actions/billing';
import { SubmitButton } from '@/components/ui/submit-button';
import { FormMessage } from '@/components/ui/form-message';
import { cn } from '@/lib/utils';

const initialState: BillingActionResult | null = null;

export function PlanCard({
  planKey,
  name,
  priceAud,
  maxPages,
  maxPostsPerDay,
  features,
  isCurrent,
  isConfigured,
}: {
  planKey: string;
  name: string;
  priceAud: number;
  maxPages: number;
  maxPostsPerDay: number;
  features: string[];
  isCurrent: boolean;
  isConfigured: boolean;
}) {
  const [state, formAction] = useFormState(createCheckoutSessionAction, initialState);

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border p-5',
        isCurrent ? 'border-brand-400 bg-brand-50/40' : 'border-slate-200 bg-white'
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{name}</h3>
        {isCurrent && (
          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
            Current
          </span>
        )}
      </div>

      <p className="mt-2 text-3xl font-bold text-slate-900">
        ${priceAud}
        <span className="text-sm font-normal text-slate-500">/mo AUD</span>
      </p>

      <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          {maxPages} Facebook Page{maxPages === 1 ? '' : 's'}
        </li>
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          Up to {maxPostsPerDay} posts/day
        </li>
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            {feature}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <p className="mt-5 text-center text-sm text-slate-500">Your current plan</p>
      ) : isConfigured ? (
        <form action={formAction} className="mt-5">
          <input type="hidden" name="planKey" value={planKey} />
          <SubmitButton className="w-full" variant="outline" pendingText="Opening checkout…">
            Choose {name}
          </SubmitButton>
          {state && 'error' in state && (
            <div className="mt-2">
              <FormMessage error={state.error} />
            </div>
          )}
        </form>
      ) : (
        <p className="mt-5 text-center text-xs text-slate-400">
          Not available yet — no Stripe price configured.
        </p>
      )}
    </div>
  );
}
