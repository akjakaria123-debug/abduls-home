import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPostsPerDayLimit } from '@/lib/plans';
import { BusinessSettingsForm } from '@/components/settings/business-settings-form';
import { ContentPreferencesForm } from '@/components/settings/content-preferences-form';
import { BrandProfileForm } from '@/components/settings/brand-profile-form';

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: business } = await supabase
    .from('businesses')
    .select(
      'id, name, category, description, website, phone, contact_email, location, target_customers, products_services, main_offers, brand_tone, preferred_language, timezone'
    )
    .eq('owner_id', user.id)
    .maybeSingle();
  if (!business) redirect('/onboarding');

  const [{ data: preferences }, { data: brand }] = await Promise.all([
    supabase
      .from('content_preferences')
      .select('enabled_categories, posts_per_day, posting_days, posting_times, approval_mode')
      .eq('business_id', business.id)
      .maybeSingle(),
    supabase
      .from('brand_profiles')
      .select('preferred_cta, brand_voice, words_to_avoid')
      .eq('business_id', business.id)
      .maybeSingle(),
  ]);

  const maxPostsPerDay = await getPostsPerDayLimit(supabase, business.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          {business.name} · times shown in {business.timezone}
        </p>
      </div>

      <BusinessSettingsForm
        business={{
          name: business.name,
          category: business.category ?? '',
          description: business.description ?? '',
          website: business.website ?? '',
          phone: business.phone ?? '',
          contactEmail: business.contact_email ?? '',
          location: business.location ?? '',
          targetCustomers: business.target_customers ?? '',
          productsServices: business.products_services ?? '',
          mainOffers: business.main_offers ?? '',
          brandTone: business.brand_tone,
          preferredLanguage: business.preferred_language,
          timezone: business.timezone,
        }}
      />

      <ContentPreferencesForm
        enabledCategories={preferences?.enabled_categories ?? []}
        postsPerDay={preferences?.posts_per_day ?? 1}
        postingDays={preferences?.posting_days ?? [1, 2, 3, 4, 5]}
        postingTimes={preferences?.posting_times ?? ['09:00']}
        approvalMode={preferences?.approval_mode ?? 'manual'}
        maxPostsPerDay={maxPostsPerDay}
      />

      <BrandProfileForm
        preferredCta={brand?.preferred_cta ?? ''}
        brandVoice={brand?.brand_voice ?? ''}
        wordsToAvoid={brand?.words_to_avoid ?? []}
      />
    </div>
  );
}
