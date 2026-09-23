'use client';

import { useFormState } from 'react-dom';
import Link from 'next/link';
import { signUpAction, signInWithGoogleAction, type ActionResult } from '@/lib/actions/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';
import { FormMessage } from '@/components/ui/form-message';
import { Card, CardContent } from '@/components/ui/card';

const initialState: ActionResult | null = null;

export default function SignUpPage() {
  const [state, formAction] = useFormState(signUpAction, initialState);

  return (
    <Card>
      <CardContent className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-white">Start your free trial</h1>
          <p className="text-sm text-slate-400">7 days free. No credit card required.</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" name="fullName" autoComplete="name" required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
            <p className="mt-1 text-xs text-slate-400">At least 8 characters.</p>
          </div>

          {state && 'error' in state && <FormMessage error={state.error} />}

          <SubmitButton className="w-full" pendingText="Creating account…">
            Start free trial
          </SubmitButton>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#12162a] px-2 text-slate-400">or</span>
          </div>
        </div>

        <form action={signInWithGoogleAction}>
          <SubmitButton variant="outline" className="w-full" pendingText="Redirecting…">
            Continue with Google
          </SubmitButton>
        </form>

        <p className="text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-indigo-300 hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
