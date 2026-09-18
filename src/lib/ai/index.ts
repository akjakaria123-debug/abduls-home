import 'server-only';
import type { AIProvider } from '@/lib/ai/provider';
import { OpenAIProvider } from '@/lib/ai/openai-provider';

// Single place to swap vendors. Add a case here when a second provider
// lands; nothing that generates content needs to change.
export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER ?? 'openai';

  switch (provider) {
    case 'openai':
      return new OpenAIProvider();
    default:
      throw new Error(`Unknown AI_PROVIDER "${provider}".`);
  }
}
