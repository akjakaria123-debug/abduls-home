'use client';

import { useFormState } from 'react-dom';
import { resetPasswordAction, type ActionResult } from '@/lib/actions/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';
import { FormMessage } from '@/components/ui/form-message';
import { Card, CardContent } from '@/components/ui/card';

const initialState: ActionResult | null = null;

export default function ResetPasswordPage() {
  const [state, formAction] = useFormState(resetPasswordAction, initialState);

  return (
    <Card>
      <CardContent className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Set a new password</h1>
          <p className="text-sm text-slate-500">Choose a new password for your account.</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="password">New password</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} />
          </div>

          {state && 'error' in state && <FormMessage error={state.error} />}

          <SubmitButton className="w-full" pendingText="Saving…">
            Update password
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
