import 'server-only';
import type { AIProvider } from '@/lib/ai/provider';
import { AIProviderError } from '@/lib/ai/provider';
import { ChatCompletionsProvider } from '@/lib/ai/chat-completions-provider';

// Vendors that speak OpenAI's /chat/completions dialect. Gemini is here
// because it has a free tier that needs no card, which is the difference
// between being able to try this and not.
const VENDORS = {
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    keyVar: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o-mini',
  },
  gemini: {
    label: 'Google Gemini',
    // Google's OpenAI-compatibility endpoint.
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    keyVar: 'GEMINI_API_KEY',
    // Google retires model names and refuses the old one outright for
    // accounts that never used it, so this goes stale on its own
    // schedule. The refusal names the replacement; AI_MODEL overrides
    // this without a deploy when it happens again.
    defaultModel: 'gemini-3.6-flash',
  },
  groq: {
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    keyVar: 'GROQ_API_KEY',
    // Free tier, no card. Runs open models on Groq's own hardware rather
    // than reselling capacity on someone else's, which is why it does
    // not share Gemini's free-tier "experiencing high demand" 503s.
    //
    // Groq decommissions models on a schedule of its own — the previous
    // default here, llama-3.3-70b-versatile, was retired on the free
    // tier on 2026-08-16 and now answers 404 "does not exist or you do
    // not have access to it". gpt-oss-120b is its recommended
    // replacement. When this happens again, AI_MODEL overrides it
    // without a deploy.
    defaultModel: 'openai/gpt-oss-120b',
  },
} as const;

export type VendorName = keyof typeof VENDORS;

// Single place to swap vendors. Nothing that generates content changes.
export function getAIProvider(): AIProvider {
  const name = (process.env.AI_PROVIDER ?? 'openai').trim().toLowerCase();

  if (!(name in VENDORS)) {
    throw new AIProviderError(
      `Unknown AI_PROVIDER "${name}". Set it to one of: ${Object.keys(VENDORS).join(', ')}.`
    );
  }

  const vendor = VENDORS[name as VendorName];
  const apiKey = process.env[vendor.keyVar]?.trim();

  if (!apiKey) {
    throw new AIProviderError(`${vendor.keyVar} is not set, so ${vendor.label} cannot be used.`);
  }

  return new ChatCompletionsProvider({
    baseUrl: vendor.baseUrl,
    apiKey,
    model: process.env.AI_MODEL?.trim() || vendor.defaultModel,
  });
}
