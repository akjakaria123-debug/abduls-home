import 'server-only';
import { z } from 'zod';
import {
  AIProviderError,
  type AIProvider,
  type ChatMessage,
  type GeneratePostsInput,
  type GeneratedPostDraft,
} from '@/lib/ai/provider';
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/ai/prompt';
import type { ContentCategory } from '@/types/database.types';

// One implementation for every vendor that speaks OpenAI's
// /chat/completions dialect — OpenAI itself, and Google's Gemini through
// its OpenAI-compatibility endpoint. Swapping vendors is a base URL, a
// key and a model name, which is what makes a free tier a config change
// rather than a rewrite.
export interface ChatCompletionsConfig {
  /** Origin plus version prefix, no trailing slash, e.g. https://api.openai.com/v1 */
  baseUrl: string;
  apiKey: string;
  model: string;
}

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

// Models outside OpenAI's own line often return the JSON wrapped in a
// markdown fence despite being asked for raw JSON. Unwrap it rather than
// failing the whole generation over punctuation.
function stripCodeFence(content: string): string {
  const trimmed = content.trim();
  if (!trimmed.startsWith('```')) return trimmed;

  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/, '')
    .trim();
}

export class ChatCompletionsProvider implements AIProvider {
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: ChatCompletionsConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  private async send(messages: unknown, useJsonMode: boolean, temperature: number) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature,
        ...(useJsonMode ? { response_format: { type: 'json_object' } } : {}),
        messages,
      }),
    });

    // Not every vendor answers an error with JSON, and one that does may
    // not use OpenAI's envelope. Keep the raw text so the message we
    // raise names the actual complaint rather than the fact that one
    // occurred.
    const text = await response.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* left as null; `text` still carries the answer */
    }

    return { ok: response.ok, status: response.status, body: parsed, text };
  }

  /**
   * Sends the request, retrying the failures that are about the vendor's
   * moment rather than our request.
   *
   * A free tier answers 503 "experiencing high demand" often enough that
   * giving up on the first one would make the product look broken when
   * nothing is wrong. Rate limits and gateway errors are the same kind
   * of no. A 400 or a 401 is about what we sent and will fail again, so
   * those return immediately.
   *
   * Two short waits, bounded well inside a serverless function's budget.
   */
  private async post(messages: unknown, useJsonMode: boolean, temperature: number) {
    const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
    const BACKOFF_MS = [800, 2000];

    let attempt = await this.send(messages, useJsonMode, temperature);

    for (const wait of BACKOFF_MS) {
      if (attempt.ok || !RETRY_STATUSES.has(attempt.status)) break;
      await new Promise((resolve) => setTimeout(resolve, wait));
      attempt = await this.send(messages, useJsonMode, temperature);
    }

    return attempt;
  }

  async generatePosts(input: GeneratePostsInput): Promise<GeneratedPostDraft[]> {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(input) },
    ];

    let attempt = await this.post(messages, true, 0.9);

    // JSON mode is an optimisation, not a requirement: the prompt already
    // specifies the exact shape and the reply is validated either way.
    // Vendors that do not accept response_format reject the whole request
    // over it, so drop it and ask again rather than failing outright.
    if (!attempt.ok && attempt.status === 400 && /response_format/i.test(attempt.text)) {
      attempt = await this.post(messages, false, 0.9);
    }

    const { ok, status, body, text } = attempt;

    if (!ok) {
      const reported = body?.error?.message ?? body?.message;
      throw new AIProviderError(
        reported
          ? `${reported} (HTTP ${status}, model ${this.model})`
          : `The AI provider rejected the request: HTTP ${status}, model ${this.model}. ${text.slice(0, 300)}`,
        status
      );
    }

    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new AIProviderError('The AI provider returned an empty response.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripCodeFence(content));
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

  /**
   * A plain conversational reply.
   *
   * No JSON mode and a lower temperature than post generation: the
   * assistant is answering questions about someone's own account, where
   * being consistent matters more than being surprising.
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    const { ok, status, body } = await this.post(messages, false, 0.4);

    if (!ok) {
      const reported = body?.error?.message ?? body?.message;
      throw new AIProviderError(
        reported
          ? `${reported} (HTTP ${status}, model ${this.model})`
          : `The AI provider rejected the request: HTTP ${status}, model ${this.model}.`,
        status
      );
    }

    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new AIProviderError('The AI provider returned an empty response.');
    }

    return content.trim();
  }

}
