import { z } from 'zod';
import { ALL_CONTENT_CATEGORIES } from '@/lib/ai/category-mix';

const categoryEnum = z.enum(ALL_CONTENT_CATEGORIES as [string, ...string[]]);

export const contentPreferencesSchema = z
  .object({
    enabledCategories: z.array(categoryEnum).min(1, 'Choose at least one content type'),
    postsPerDay: z.coerce.number().int().min(1).max(5),
    postingDays: z.array(z.coerce.number().int().min(1).max(7)).min(1, 'Choose at least one posting day'),
    postingTimes: z
      .array(z.string().regex(/^\d{2}:\d{2}$/, 'Times must look like 09:00'))
      .min(1, 'Add at least one posting time'),
    approvalMode: z.enum(['manual', 'auto_pilot']),
  })
  .refine((data) => data.postingTimes.length >= data.postsPerDay, {
    message: 'Add at least as many posting times as posts per day',
    path: ['postingTimes'],
  });

export type ContentPreferencesInput = z.infer<typeof contentPreferencesSchema>;

export const brandProfileSchema = z.object({
  preferredCta: z.string().max(120).optional().or(z.literal('')),
  brandVoice: z.string().max(500).optional().or(z.literal('')),
  wordsToAvoid: z.string().max(500).optional().or(z.literal('')),
});

export type BrandProfileInput = z.infer<typeof brandProfileSchema>;

export const GENERATION_DAY_OPTIONS = [3, 7, 14] as const;

export const generatePostsSchema = z.object({
  days: z.coerce.number().int().refine((value) => GENERATION_DAY_OPTIONS.includes(value as 3 | 7 | 14), {
    message: 'Choose 3, 7, or 14 days',
  }),
  facebookPageId: z.string().uuid('Select a Facebook Page'),
});
