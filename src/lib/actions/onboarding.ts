'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { businessOnboardingSchema } from '@/lib/validations/onboarding';

export type OnboardingActionResult = { error: string } | { success: true };

export async function completeOnboardingAction(
  _prevState: OnboardingActionResult | null,
  formData: FormData
): Promise<OnboardingActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Your session expired. Please log in again.' };
  }

  const parsed = businessOnboardingSchema.safeParse({
    name: formData.get('name'),
    category: formData.get('category'),
    description: formData.get('description'),
    website: formData.get('website'),
    phone: formData.get('phone'),
    contactEmail: formData.get('contactEmail'),
    location: formData.get('location'),
    targetCustomers: formData.get('targetCustomers'),
    productsServices: formData.get('productsServices'),
    mainOffers: formData.get('mainOffers'),
    brandTone: formData.get('brandTone'),
    preferredLanguage: formData.get('preferredLanguage'),
    timezone: formData.get('timezone'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form for errors.' };
  }

  // Idempotency guard: if a business already exists for this user (e.g. a
  // double submit), don't create a second one — just move on.
  const { data: existing } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (existing) {
    redirect('/dashboard');
  }

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .insert({
      owner_id: user.id,
      name: parsed.data.name,
      category: parsed.data.category,
      description: parsed.data.description || null,
      website: parsed.data.website || null,
      phone: parsed.data.phone || null,
      contact_email: parsed.data.contactEmail || null,
      location: parsed.data.location || null,
      target_customers: parsed.data.targetCustomers || null,
      products_services: parsed.data.productsServices || null,
      main_offers: parsed.data.mainOffers || null,
      brand_tone: parsed.data.brandTone,
      preferred_language: parsed.data.preferredLanguage,
      timezone: parsed.data.timezone,
    })
    .select('id')
    .single();

  if (businessError || !business) {
    return { error: 'Could not save your business. Please try again.' };
  }

  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ error: brandError }, { error: prefsError }, { error: subError }] = await Promise.all([
    supabase.from('brand_profiles').insert({ business_id: business.id }),
    supabase.from('content_preferences').insert({ business_id: business.id }),
    supabase
      .from('subscriptions')
      .insert({ business_id: business.id, status: 'trialing', trial_ends_at: trialEndsAt }),
  ]);

  if (brandError || prefsError || subError) {
    return {
      error:
        'Your business was saved, but some setup steps failed. You can finish them in Settings.',
    };
  }

  redirect('/dashboard');
}
