import 'server-only';
import { z } from 'zod';
import {
  AIProviderError,
  type AIProvider,
  type GeneratePostsInput,
  type GeneratedPostDraft,
} from '@/lib/ai/provider';
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/ai/prompt';
import type { ContentCategory } from '@/types/database.types';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

// The model returns free-form JSON; nothing downstream trusts it until
// it has been through this.
const draftSchema = z.object({
  category: z.string(),
  caption: z.string().min(1),
  cta: z.string().nullish(),
  hashtags: z.array(z.string()).nullish(),
  imageIdea: z.string().nullish(),
  imagePrompt: z.string().nullish(),
});

const responseSchema = z.object({ posts: z.array(draftSchema) });

function normaliseHashtag(tag: string): string {
  return tag.replace(/^#/, '').replace(/\s+/g, '').toLowerCase();
}

export class OpenAIProvider implements AIProvider {
  readonly model: string;
  private readonly apiKey: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AIProviderError('OPENAI_API_KEY is not set.');
    }

    this.apiKey = apiKey;
    this.model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  }

  async generatePosts(input: GeneratePostsInput): Promise<GeneratedPostDraft[]> {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.9,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(input) },
        ],
      }),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new AIProviderError(
        body?.error?.message ?? 'The AI provider rejected the request.',
        response.status
      );
    }

    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new AIProviderError('The AI provider returned an empty response.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new AIProviderError('The AI provider returned malformed JSON.');
    }

    const result = responseSchema.safeParse(parsed);
    if (!result.success) {
      throw new AIProviderError('The AI provider returned an unexpected response shape.');
    }

    const allowed = new Set<string>(input.categories);

    return result.data.posts.slice(0, input.categories.length).map((draft, index) => ({
      // Trust our own requested category over the model's echo of it.
      category: (allowed.has(draft.category)
        ? draft.category
        : input.categories[index]) as ContentCategory,
      caption: draft.caption.trim(),
      cta: draft.cta?.trim() || null,
      hashtags: (draft.hashtags ?? []).map(normaliseHashtag).filter(Boolean).slice(0, 6),
      imageIdea: draft.imageIdea?.trim() || null,
      imagePrompt: draft.imagePrompt?.trim() || null,
    }));
  }
}
