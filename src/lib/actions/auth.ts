'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { signUpSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@/lib/validations/auth';

export type ActionResult = { error: string } | { success: true };

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

export async function signUpAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form for errors.' };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${siteUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/verify-email');
}

export async function loginAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form for errors.' };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      error:
        error.message === 'Invalid login credentials'
          ? 'Incorrect email or password.'
          : error.message,
    };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signOutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function forgotPasswordAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form for errors.' };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function resetPasswordAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form for errors.' };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { error: error.message };
  }

  redirect('/dashboard');
}

export async function signInWithGoogleAction() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${siteUrl()}/auth/callback` },
  });

  if (error || !data.url) {
    redirect('/login?error=google_oauth_failed');
  }

  redirect(data.url);
}
