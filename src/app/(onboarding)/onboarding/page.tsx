'use client';

import { useFormState } from 'react-dom';
import { completeOnboardingAction, type OnboardingActionResult } from '@/lib/actions/onboarding';
import { BRAND_TONES } from '@/lib/validations/onboarding';
import { DEFAULT_LANGUAGE, ENGLISH_VARIANTS, OTHER_LANGUAGES } from '@/lib/languages';
import { AUSTRALIAN_TIMEZONES, DEFAULT_TIMEZONE, OTHER_TIMEZONES } from '@/lib/timezones';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { SubmitButton } from '@/components/ui/submit-button';
import { FormMessage } from '@/components/ui/form-message';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const initialState: OnboardingActionResult | null = null;


function languageOption(language: { code: string; label: string; nativeName: string }) {
  return (
    <option key={language.code} value={language.code}>
      {language.nativeName === language.label
        ? language.label
        : `${language.label} — ${language.nativeName}`}
    </option>
  );
}

function formatTone(tone: string) {
  return tone.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export default function OnboardingPage() {
  const [state, formAction] = useFormState(completeOnboardingAction, initialState);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Tell us about your business</h1>
        <p className="mt-1 text-sm text-slate-500">
          This powers every post the AI writes for you — the more accurate, the better the content.
        </p>
      </div>

      <form action={formAction} className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Business basics</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Business name</Label>
              <Input id="name" name="name" required placeholder="e.g. Bondi Clean Co." />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" required placeholder="e.g. Cleaning service" />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={3} placeholder="What does your business do?" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Contact & location</h2>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" type="url" placeholder="https://example.com.au" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" placeholder="04xx xxx xxx" />
            </div>
            <div>
              <Label htmlFor="contactEmail">Contact email</Label>
              <Input id="contactEmail" name="contactEmail" type="email" placeholder="hello@example.com.au" />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" placeholder="e.g. Bondi Beach, NSW" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Audience & offers</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="targetCustomers">Target customers</Label>
              <Textarea id="targetCustomers" name="targetCustomers" rows={2} placeholder="Who are your ideal customers?" />
            </div>
            <div>
              <Label htmlFor="productsServices">Products / services</Label>
              <Textarea id="productsServices" name="productsServices" rows={2} placeholder="What do you offer?" />
            </div>
            <div>
              <Label htmlFor="mainOffers">Main offers / promotions</Label>
              <Input id="mainOffers" name="mainOffers" placeholder="e.g. 10% off first booking" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Brand & preferences</h2>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="brandTone">Brand tone</Label>
              <Select id="brandTone" name="brandTone" defaultValue="professional">
                {BRAND_TONES.map((tone) => (
                  <option key={tone} value={tone}>
                    {formatTone(tone)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="preferredLanguage">Language</Label>
              <Select
                id="preferredLanguage"
                name="preferredLanguage"
                defaultValue={DEFAULT_LANGUAGE}
              >
                <optgroup label="English">{ENGLISH_VARIANTS.map(languageOption)}</optgroup>
                <optgroup label="Other languages">{OTHER_LANGUAGES.map(languageOption)}</optgroup>
              </Select>
              <p className="mt-1 text-xs text-slate-400">Your posts are written in this language.</p>
            </div>
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select id="timezone" name="timezone" defaultValue={DEFAULT_TIMEZONE}>
                <optgroup label="Australia">
                  {AUSTRALIAN_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Elsewhere">
                  {OTHER_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}
                    </option>
                  ))}
                </optgroup>
              </Select>
            </div>
          </CardContent>
        </Card>

        {state && 'error' in state && <FormMessage error={state.error} />}

        <SubmitButton className="w-full" size="lg" pendingText="Saving…">
          Continue to dashboard
        </SubmitButton>
      </form>
    </div>
  );
}
