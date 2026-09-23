'use client';

import { useFormState } from 'react-dom';
import Link from 'next/link';
import { forgotPasswordAction, type ActionResult } from '@/lib/actions/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';
import { FormMessage } from '@/components/ui/form-message';
import { Card, CardContent } from '@/components/ui/card';

const initialState: ActionResult | null = null;

export default function ForgotPasswordPage() {
  const [state, formAction] = useFormState(forgotPasswordAction, initialState);
  const submitted = state && 'success' in state;

  return (
    <Card>
      <CardContent className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-white">Reset your password</h1>
          <p className="text-sm text-slate-400">We&apos;ll email you a link to reset it.</p>
        </div>

        {submitted ? (
          <FormMessage success="If an account exists for that email, a reset link is on its way." />
        ) : (
          <form action={formAction} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>

            {state && 'error' in state && <FormMessage error={state.error} />}

            <SubmitButton className="w-full" pendingText="Sending…">
              Send reset link
            </SubmitButton>
          </form>
        )}

        <p className="text-center text-sm text-slate-400">
          <Link href="/login" className="font-medium text-indigo-300 hover:underline">
            Back to login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
