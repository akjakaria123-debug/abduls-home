'use client';

import { useFormState } from 'react-dom';
import { createPortalSessionAction, type BillingActionResult } from '@/lib/actions/billing';
import { SubmitButton } from '@/components/ui/submit-button';
import { FormMessage } from '@/components/ui/form-message';

const initialState: BillingActionResult | null = null;

export function ManageBillingButton() {
  const [state, formAction] = useFormState(createPortalSessionAction, initialState);

  return (
    <div>
      <form action={formAction}>
        <SubmitButton size="sm" variant="outline" pendingText="Opening…">
          Manage billing
        </SubmitButton>
      </form>
      {state && 'error' in state && (
        <div className="mt-2">
          <FormMessage error={state.error} />
        </div>
      )}
    </div>
  );
}
