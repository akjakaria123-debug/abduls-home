'use client';

import { useFormState } from 'react-dom';
import Link from 'next/link';
import { loginAction, signInWithGoogleAction, type ActionResult } from '@/lib/actions/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';
import { FormMessage } from '@/components/ui/form-message';
import { Card, CardContent } from '@/components/ui/card';

const initialState: ActionResult | null = null;

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, initialState);

  return (
    <Card>
      <CardContent className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-white">Log in</h1>
          <p className="text-sm text-slate-400">Welcome back. Enter your details below.</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-sm text-indigo-300 hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>

          {state && 'error' in state && <FormMessage error={state.error} />}

          <SubmitButton className="w-full" pendingText="Logging in…">
            Log in
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
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-indigo-300 hover:underline">
            Start free trial
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
