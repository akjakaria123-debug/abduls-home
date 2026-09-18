import { z } from 'zod';
import { isSupportedLanguage } from '@/lib/languages';
import { isSupportedTimezone } from '@/lib/timezones';

export const BRAND_TONES = [
  'professional',
  'friendly',
  'casual',
  'funny',
  'luxury',
  'educational',
  'sales_focused',
] as const;

export const businessOnboardingSchema = z.object({
  name: z.string().min(2, 'Business name is required').max(120),
  category: z.string().min(2, 'Category is required').max(80),
  description: z.string().max(1000).optional().or(z.literal('')),
  website: z
    .string()
    .url('Enter a valid URL, e.g. https://example.com.au')
    .optional()
    .or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  contactEmail: z.string().email('Enter a valid email address').optional().or(z.literal('')),
  location: z.string().max(200).optional().or(z.literal('')),
  targetCustomers: z.string().max(500).optional().or(z.literal('')),
  productsServices: z.string().max(1000).optional().or(z.literal('')),
  mainOffers: z.string().max(500).optional().or(z.literal('')),
  brandTone: z.enum(BRAND_TONES),
  // Checked against the catalogue so nothing unrecognised reaches the
  // AI prompt as a language instruction.
  preferredLanguage: z.string().refine(isSupportedLanguage, 'Choose a supported language'),
  timezone: z.string().refine(isSupportedTimezone, 'Choose a supported timezone'),
});
export type BusinessOnboardingInput = z.infer<typeof businessOnboardingSchema>;
