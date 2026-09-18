import type { GeneratePostsInput } from '@/lib/ai/provider';
import { describeLanguage } from '@/lib/languages';

const CATEGORY_BRIEFS: Record<string, string> = {
  promotional: 'Promote a service or offer. Lead with the customer benefit, not the sales pitch.',
  educational: 'Teach one genuinely useful thing related to this industry.',
  tips: 'Give one specific, practical tip a customer can act on today.',
  engagement: 'Ask a question or invite a reply. Aim for comments, not sales.',
  product_spotlight: 'Feature one product and what makes it worth buying.',
  service_spotlight: 'Feature one service and the problem it solves.',
  customer_testimonial:
    'Invite customers to share their experience, or leave an obvious placeholder for the owner to paste a real review into.',
  faq: 'Answer one question this business actually gets asked.',
  behind_the_scenes: 'Show the day-to-day of running this business. Human, not polished.',
  seasonal: 'Tie the post to the current season or time of year.',
  local_business: 'Connect the business to its local area and community.',
  special_offer: 'Highlight a specific offer the business has told us about. Create urgency honestly.',
  holiday: 'Tie the post to an upcoming public holiday or observance relevant to the audience.',
  community: 'Support or acknowledge the local community, customers, or other local businesses.',
};

export const SYSTEM_PROMPT = `You are a senior social media copywriter who writes Facebook posts for small local businesses.

You write like a real person who knows the business, not like a marketing brochure. Short sentences. Concrete details. No corporate filler, no "elevate your experience", no "we are thrilled to announce".

Hard rules you never break:
- Never invent facts. No made-up prices, discounts, statistics, awards, opening hours, or events that the business did not give you.
- Never fabricate a customer review, quote, or name. Not even a plausible one. For testimonial-style posts, either invite real customers to share their experience, or write the post around a clearly marked placeholder like [paste a real review here] for the owner to fill in.
- Never promise outcomes the business cannot control.
- Plain text captions only. No markdown, no headings, no bullet characters.
- Emojis: at most one or two, and only where the tone genuinely calls for it.

Language:
- Write every post entirely in the requested language, as a native speaker of it would write for a local audience. Use that language's own idiom, rhythm and punctuation conventions. A post must never read like English that has been translated.
- Match the regional variety asked for, including its spelling (Australian English writes "organise" and "centre", not "organize" and "center").
- Leave the business name, product names, website and any brand terms exactly as given. Do not translate or transliterate them.
- Write hashtags in the same language as the post. Lowercase them only where that language's script has upper and lower case.
- For right-to-left languages, write normally. Do not insert direction marks or reorder anything yourself.

Return strict JSON only.`;

export function buildUserPrompt(input: GeneratePostsInput): string {
  const { business, brand, categories, recentCaptions } = input;

  const lines: string[] = [];

  lines.push('BUSINESS');
  lines.push(`Name: ${business.name}`);
  if (business.category) lines.push(`Type: ${business.category}`);
  if (business.description) lines.push(`About: ${business.description}`);
  if (business.location) lines.push(`Location: ${business.location}`);
  if (business.website) lines.push(`Website: ${business.website}`);
  if (business.targetCustomers) lines.push(`Target customers: ${business.targetCustomers}`);
  if (business.productsServices) lines.push(`Products/services: ${business.productsServices}`);
  if (business.mainOffers) lines.push(`Current offers: ${business.mainOffers}`);
  lines.push(`Tone: ${business.brandTone.replace(/_/g, ' ')}`);
  // The human-readable name beats the raw code — "Vietnamese (Tiếng Việt)"
  // is unambiguous in a way that "vi" is not.
  lines.push(`Language: write every post in ${describeLanguage(business.language)}.`);

  if (brand.brandVoice || brand.preferredCta || brand.wordsToAvoid.length) {
    lines.push('');
    lines.push('BRAND');
    if (brand.brandVoice) lines.push(`Voice: ${brand.brandVoice}`);
    if (brand.preferredCta) lines.push(`Preferred call to action: ${brand.preferredCta}`);
    if (brand.wordsToAvoid.length) {
      lines.push(`Never use these words or phrases: ${brand.wordsToAvoid.join(', ')}`);
    }
  }

  if (recentCaptions.length) {
    lines.push('');
    lines.push('ALREADY POSTED — do not repeat these angles, openings, or phrasing:');
    for (const caption of recentCaptions) {
      lines.push(`- ${caption.slice(0, 160)}`);
    }
  }

  lines.push('');
  lines.push(`Write ${categories.length} Facebook post${categories.length === 1 ? '' : 's'}, one per brief below, in this exact order:`);
  categories.forEach((category, index) => {
    lines.push(`${index + 1}. [${category}] ${CATEGORY_BRIEFS[category] ?? ''}`);
  });

  lines.push('');
  lines.push(`Each post must open differently from the others and from anything listed above.

For each post return:
- "category": exactly the category string given for that post
- "caption": 30-80 words, plain text
- "cta": one short call to action (under 12 words), or null
- "hashtags": 3 to 6 relevant hashtags in the post's language, no "#" prefix
- "imageIdea": one sentence describing a photo this business could realistically take
- "imagePrompt": a detailed prompt for an AI image generator to produce that image

Respond with JSON in exactly this shape:
{"posts": [{"category": "...", "caption": "...", "cta": "...", "hashtags": ["..."], "imageIdea": "...", "imagePrompt": "..."}]}`);

  return lines.join('\n');
}
