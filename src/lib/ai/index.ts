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
    defaultModel: 'gemini-2.5-flash',
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
