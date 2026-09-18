import type { ContentCategory } from '@/types/database.types';

// Categories that read as selling. A feed that's all of these stops
// working — five promotional posts in one day is the failure mode this
// module exists to prevent.
const SALES_CATEGORIES = new Set<ContentCategory>([
  'promotional',
  'special_offer',
  'product_spotlight',
  'service_spotlight',
]);

export const ALL_CONTENT_CATEGORIES: ContentCategory[] = [
  'promotional',
  'educational',
  'tips',
  'engagement',
  'product_spotlight',
  'service_spotlight',
  'customer_testimonial',
  'faq',
  'behind_the_scenes',
  'seasonal',
  'local_business',
  'special_offer',
  'holiday',
  'community',
];

export function salesShareLimit(count: number): number {
  return Math.max(1, Math.ceil(count / 3));
}

/**
 * Picks `count` categories from `enabled`, favouring the ones used least
 * recently and capping how many can be sales-led.
 *
 * @param recentCategories most-recent-last, as stored on existing posts
 */
export function buildCategoryMix(
  enabled: ContentCategory[],
  count: number,
  recentCategories: ContentCategory[] = []
): ContentCategory[] {
  const pool = enabled.length ? enabled : ALL_CONTENT_CATEGORIES;
  if (count <= 0) return [];

  // Lower score = staler = pick sooner. Anything unused is stalest.
  const staleness = new Map<ContentCategory, number>();
  pool.forEach((category) => staleness.set(category, -1));
  recentCategories.forEach((category, index) => {
    if (staleness.has(category)) staleness.set(category, index);
  });

  const usedInBatch = new Map<ContentCategory, number>();
  const everythingSells = pool.every((category) => SALES_CATEGORIES.has(category));
  const maxSales = everythingSells ? count : salesShareLimit(count);

  const mix: ContentCategory[] = [];
  let salesUsed = 0;

  for (let slot = 0; slot < count; slot += 1) {
    const salesBudgetLeft = salesUsed < maxSales;

    const candidates = pool.filter(
      (category) => salesBudgetLeft || !SALES_CATEGORIES.has(category)
    );
    // Only sales categories left and the budget is spent: allow one
    // rather than returning fewer posts than asked for.
    const choices = candidates.length ? candidates : pool;

    const next = choices.reduce((best, category) => {
      const bestUsed = usedInBatch.get(best) ?? 0;
      const categoryUsed = usedInBatch.get(category) ?? 0;
      if (categoryUsed !== bestUsed) return categoryUsed < bestUsed ? category : best;

      const bestStale = staleness.get(best) ?? -1;
      const categoryStale = staleness.get(category) ?? -1;
      return categoryStale < bestStale ? category : best;
    }, choices[0]);

    mix.push(next);
    usedInBatch.set(next, (usedInBatch.get(next) ?? 0) + 1);
    // Push it to the back of the queue so the next slot looks elsewhere.
    staleness.set(next, recentCategories.length + slot);
    if (SALES_CATEGORIES.has(next)) salesUsed += 1;
  }

  return mix;
}
