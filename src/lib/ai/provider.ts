import type { ContentCategory } from '@/types/database.types';

// The seam that keeps the app from being married to one AI vendor.
// Swapping providers means writing a new class, not touching call sites.

export interface BusinessContext {
  name: string;
  category: string | null;
  description: string | null;
  location: string | null;
  website: string | null;
  targetCustomers: string | null;
  productsServices: string | null;
  mainOffers: string | null;
  brandTone: string;
  language: string;
}

export interface BrandContext {
  preferredCta: string | null;
  brandVoice: string | null;
  wordsToAvoid: string[];
}

export interface GeneratePostsInput {
  business: BusinessContext;
  brand: BrandContext;
  /** One entry per post to generate, in order. Already balanced upstream. */
  categories: ContentCategory[];
  /** Recent captions, so the model can avoid repeating itself. */
  recentCaptions: string[];
}

export interface GeneratedPostDraft {
  category: ContentCategory;
  caption: string;
  cta: string | null;
  hashtags: string[];
  imageIdea: string | null;
  imagePrompt: string | null;
}

export class AIProviderError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AIProviderError';
    this.status = status;
  }
}

export interface AIProvider {
  /** Recorded on each post so you can trace which model wrote what. */
  readonly model: string;
  generatePosts(input: GeneratePostsInput): Promise<GeneratedPostDraft[]>;
}
