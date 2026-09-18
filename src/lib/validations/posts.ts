import { z } from 'zod';

export const updatePostSchema = z.object({
  postId: z.string().uuid(),
  caption: z.string().trim().min(1, 'Caption cannot be empty').max(2000),
  cta: z.string().trim().max(200).optional().or(z.literal('')),
  hashtags: z.string().max(500).optional().or(z.literal('')),
});

export const reschedulePostSchema = z.object({
  postId: z.string().uuid(),
  // Wall-clock time in the business's timezone, from <input type="datetime-local">.
  scheduledLocal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Pick a date and time'),
});

/** Accepts "#one, two three" and yields ["one","two","three"]. */
export function parseHashtagInput(value: string): string[] {
  return value
    .split(/[\s,]+/)
    .map((tag) => tag.replace(/^#+/, '').trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 10);
}
