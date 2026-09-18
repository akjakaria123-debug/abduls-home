'use client';

import { useFormState } from 'react-dom';
import { saveBusinessSettingsAction, type ContentActionResult } from '@/lib/actions/content';
import { BRAND_TONES } from '@/lib/validations/onboarding';
import {
  ENGLISH_VARIANTS,
  OTHER_LANGUAGES,
  isRtlLanguage,
  type Language,
} from '@/lib/languages';
import { TIMEZONES } from '@/lib/timezones';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { SubmitButton } from '@/components/ui/submit-button';
import { FormMessage } from '@/components/ui/form-message';

const initialState: ContentActionResult | null = null;

function languageOption(language: Language) {
  return (
    <option key={language.code} value={language.code}>
      {language.nativeName === language.label
        ? language.label
        : `${language.label} — ${language.nativeName}`}
    </option>
  );
}

function formatTone(tone: string) {
  return tone.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export interface BusinessSettings {
  name: string;
  category: string;
  description: string;
  website: string;
  phone: string;
  contactEmail: string;
  location: string;
  targetCustomers: string;
  productsServices: string;
  mainOffers: string;
  brandTone: string;
  preferredLanguage: string;
  timezone: string;
}

export function BusinessSettingsForm({ business }: { business: BusinessSettings }) {
  const [state, formAction] = useFormState(saveBusinessSettingsAction, initialState);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-slate-900">Business & language</h2>
        <p className="text-xs text-slate-500">
          Everything the AI knows about you. The more accurate, the better the posts.
        </p>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Business name</Label>
              <Input id="name" name="name" defaultValue={business.name} required />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" defaultValue={business.category} required />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={2} defaultValue={business.description} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" type="url" defaultValue={business.website} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" defaultValue={business.phone} />
            </div>
            <div>
              <Label htmlFor="contactEmail">Contact email</Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                defaultValue={business.contactEmail}
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" defaultValue={business.location} />
            </div>
          </div>

          <div>
            <Label htmlFor="targetCustomers">Target customers</Label>
            <Textarea
              id="targetCustomers"
              name="targetCustomers"
              rows={2}
              defaultValue={business.targetCustomers}
            />
          </div>

          <div>
            <Label htmlFor="productsServices">Products / services</Label>
            <Textarea
              id="productsServices"
              name="productsServices"
              rows={2}
              defaultValue={business.productsServices}
            />
          </div>

          <div>
            <Label htmlFor="mainOffers">Main offers / promotions</Label>
            <Input id="mainOffers" name="mainOffers" defaultValue={business.mainOffers} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="brandTone">Brand tone</Label>
              <Select id="brandTone" name="brandTone" defaultValue={business.brandTone}>
                {BRAND_TONES.map((tone) => (
                  <option key={tone} value={tone}>
                    {formatTone(tone)}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="preferredLanguage">Post language</Label>
              <Select
                id="preferredLanguage"
                name="preferredLanguage"
                defaultValue={business.preferredLanguage}
              >
                <optgroup label="English">{ENGLISH_VARIANTS.map(languageOption)}</optgroup>
                <optgroup label="Other languages">{OTHER_LANGUAGES.map(languageOption)}</optgroup>
              </Select>
              {isRtlLanguage(business.preferredLanguage) && (
                <p className="mt-1 text-xs text-slate-400">
                  Right-to-left language — Facebook renders this correctly.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select id="timezone" name="timezone" defaultValue={business.timezone}>
                {TIMEZONES.map((timezone) => (
                  <option key={timezone} value={timezone}>
                    {timezone.replace(/_/g, ' ')}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {state && 'error' in state && <FormMessage error={state.error} />}
          {state && 'success' in state && <FormMessage success={state.message} />}

          <SubmitButton pendingText="Saving…">Save business details</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
