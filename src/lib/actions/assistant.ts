'use server';

import { createClient } from '@/lib/supabase/server';
import { getAIProvider } from '@/lib/ai';
import { AIProviderError, type ChatMessage } from '@/lib/ai/provider';
import { loadGenerationContext } from '@/lib/ai/context';
import { logApiCall } from '@/lib/api-logs';
import { describeLanguage } from '@/lib/languages';

export type AssistantResult = { error: string } | { reply: string };

/** What the browser is allowed to send, before we trust any of it. */
const MAX_MESSAGE_LENGTH = 2000;
/** Turns kept as context. Older ones are dropped, oldest first. */
const MAX_HISTORY = 12;

export interface AssistantTurn {
  role: 'user' | 'assistant';
  content: string;
}

function buildSystemPrompt(context: {
  businessName: string;
  category: string | null;
  location: string | null;
  description: string | null;
  offers: string | null;
  tone: string;
  language: string;
  pageNames: string[];
  postsThisMonth: number;
  scheduledCount: number;
}): string {
  const pages = context.pageNames.length
    ? context.pageNames.join(', ')
    : 'none connected yet';

  return `You are the assistant inside PostPilot, an app that writes and publishes Facebook posts for small businesses. You are talking to the owner, inside their own account.

What you know about them:
- Business: ${context.businessName}${context.category ? ` (${context.category})` : ''}
- Location: ${context.location ?? 'not given'}
- What they do: ${context.description ?? 'not given'}
- Current offers: ${context.offers ?? 'none given'}
- Brand tone: ${context.tone}
- Posts are written in: ${describeLanguage(context.language)}
- Facebook Pages connected: ${pages}
- Posts created this month: ${context.postsThisMonth}, currently scheduled: ${context.scheduledCount}

How to help:
- Write and rewrite post captions on request, in their tone and language, ready to paste.
- Explain what the app does and where to click. The screens are Dashboard, Content (generate a run of posts), Calendar (see and edit what is scheduled), Facebook Pages (connect a Page), Analytics, Billing and Settings (tone, language, posting days and times, approval mode).
- Suggest what to post about, based on what they actually sell.

Hard rules you never break:
- Never invent facts about this business: no prices, discounts, opening hours, reviews or awards they have not told you. If you need one, ask.
- Never claim to have done something in the app. You cannot publish, schedule, delete or change settings — say where they can do it themselves.
- If you do not know, say so plainly.

Reply in the language the owner writes to you in. Keep it short and practical — a couple of short paragraphs at most, unless they ask for a full post. Plain text, no markdown headings.`;
}

export async function assistantAction(history: AssistantTurn[]): Promise<AssistantResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Please log in again.' };

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (!business) return { error: 'Finish setting up your business first.' };

  // The client sends the whole thread back each turn, so nothing here is
  // trusted: cap the length, keep only the most recent turns, and drop
  // anything empty.
  const turns = history
    .filter((turn) => typeof turn.content === 'string' && turn.content.trim())
    .slice(-MAX_HISTORY)
    .map((turn) => ({
      role: turn.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: turn.content.trim().slice(0, MAX_MESSAGE_LENGTH),
    }));

  if (!turns.length) return { error: 'Type a message first.' };

  const [context, { data: pages }, { count: postsThisMonth }, { count: scheduledCount }] =
    await Promise.all([
      loadGenerationContext(supabase, business.id),
      supabase
        .from('facebook_pages')
        .select('page_name')
        .eq('business_id', business.id)
        .eq('is_selected', true),
      supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .gte('created_at', new Date(new Date().setDate(1)).toISOString()),
      supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('status', 'scheduled'),
    ]);

  if (!context) return { error: 'Finish setting up your business first.' };

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: buildSystemPrompt({
        businessName: context.business.name,
        category: context.business.category,
        location: context.business.location,
        description: context.business.description,
        offers: context.business.mainOffers,
        tone: context.business.brandTone,
        language: context.business.language,
        pageNames: (pages ?? []).map((page) => page.page_name),
        postsThisMonth: postsThisMonth ?? 0,
        scheduledCount: scheduledCount ?? 0,
      }),
    },
    ...turns,
  ];

  try {
    const reply = await getAIProvider().chat(messages);

    await logApiCall({
      businessId: business.id,
      service: 'openai',
      endpoint: '/chat/completions',
      success: true,
    });

    return { reply };
  } catch (error) {
    const message =
      error instanceof AIProviderError
        ? error.message
        : 'Could not reach the AI provider. Please try again.';

    await logApiCall({
      businessId: business.id,
      service: 'openai',
      endpoint: '/chat/completions',
      success: false,
      statusCode: error instanceof AIProviderError ? error.status ?? null : null,
      errorMessage: message,
    });

    return { error: message };
  }
}
