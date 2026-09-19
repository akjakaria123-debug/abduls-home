import Link from 'next/link';
import { Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import type { Json } from '@/types/database.types';

const BENEFITS = [
  {
    title: 'Never run out of content',
    body: 'AI writes on-brand Facebook posts every single day, so your page never goes quiet.',
  },
  {
    title: 'Built for busy owners',
    body: 'No marketing team needed. Set it up once in minutes, then let it run.',
  },
  {
    title: 'You stay in control',
    body: 'Review and approve before anything goes live — or switch to full auto-pilot when you trust it.',
  },
];

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Connect your Facebook Page',
    body: 'Securely link your Page with official Facebook login — no passwords shared.',
  },
  {
    step: '2',
    title: 'Tell us about your business',
    body: 'A few details about what you do, your tone, and your offers.',
  },
  {
    step: '3',
    title: 'AI creates your posts',
    body: 'A balanced mix of promos, tips, and engagement content — never repetitive.',
  },
  {
    step: '4',
    title: 'Posts publish automatically',
    body: 'On your schedule, every day, without you lifting a finger.',
  },
];

const FEATURES = [
  'AI-generated captions, hashtags & CTAs',
  'Balanced content mix — not just promos',
  'Custom posting days & times',
  'Approve-first or full auto-pilot',
  'Visual content calendar',
  'Facebook Page analytics',
];

const FAQ = [
  {
    q: 'Does this use official Facebook tools?',
    a: 'Yes. We connect through the official Meta Graph API — no browser automation, scraping, or unofficial tools.',
  },
  {
    q: 'Can I review posts before they go live?',
    a: 'Yes. Approval mode lets you review every post before it publishes. Switch to auto-pilot any time.',
  },
  {
    q: 'What happens after my free trial?',
    a: 'You can choose a plan that fits your business. No auto-charge without your confirmation.',
  },
  {
    q: 'Which businesses is this built for?',
    a: 'Small local businesses — cleaners, cafes, tradies, salons, real estate agents, freelancers, and more.',
  },
];

interface LandingPlan {
  key: string;
  name: string;
  price_aud: number;
  max_pages: number;
  max_posts_per_day: number;
  features: Json;
}

/**
 * The marketing page is the one page that must never go down. Pricing
 * comes from the database, but a database that is unreachable — or not
 * configured yet — should cost us the pricing table, not the whole page.
 */
async function loadPlans(): Promise<LandingPlan[]> {
  try {
    const { data } = await createClient()
      .from('plans')
      .select('key, name, price_aud, max_pages, max_posts_per_day, features')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    return data ?? [];
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const plans = await loadPlans();

  return (
    <div className="bg-white">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <span className="text-lg font-bold text-slate-900">
            PostPilot<span className="text-brand-600">.ai</span>
          </span>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-700 hover:text-slate-900">
              Log in
            </Link>
            <Link href="/signup">
              <Button size="sm">Start free trial</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Create and Publish Your Facebook Content Automatically.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Let AI create, schedule, and publish your business Facebook posts every day.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/signup">
            <Button size="lg">Start Free Trial</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              Log in
            </Button>
          </Link>
        </div>
        <p className="mt-3 text-sm text-slate-400">7-day free trial · No credit card required to start</p>
      </section>

      {/* Benefits */}
      <section className="border-t border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.title}>
                <h3 className="text-base font-semibold text-slate-900">{b.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-slate-900">How it works</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {s.step}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-slate-900">Everything you need</h2>
          <ul className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-slate-900">Simple, transparent pricing</h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            All plans start with a 7-day free trial. Prices in AUD.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {plans.map((plan) => {
              const features = Array.isArray(plan.features) ? (plan.features as Json[]) : [];
              return (
                <div key={plan.key} className="rounded-2xl border border-slate-200 p-6">
                  <h3 className="text-base font-semibold text-slate-900">{plan.name}</h3>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    ${plan.price_aud}
                    <span className="text-sm font-normal text-slate-500">/mo</span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-600">
                    <li>
                      {plan.max_pages} Facebook Page{plan.max_pages > 1 ? 's' : ''}
                    </li>
                    <li>Up to {plan.max_posts_per_day} posts/day</li>
                    {features.map((f, i) => (
                      <li key={i}>{String(f)}</li>
                    ))}
                  </ul>
                  <Link href="/signup" className="mt-6 block">
                    <Button className="w-full" variant="outline">
                      Start free trial
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
          {plans.length === 0 && (
            <p className="mt-6 text-center text-sm text-slate-400">
              Pricing plans will appear here once the database migrations have been run.
            </p>
          )}
        </div>
      </section>

      {/* Testimonials placeholder */}
      <section className="border-t border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900">Loved by small business owners</h2>
          <p className="mt-2 text-sm text-slate-500">Customer stories coming soon.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-slate-900">Frequently asked questions</h2>
          <div className="mt-8 space-y-6">
            {FAQ.map((f) => (
              <div key={f.q}>
                <h3 className="text-sm font-semibold text-slate-900">{f.q}</h3>
                <p className="mt-1 text-sm text-slate-600">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-slate-100 bg-brand-600 py-16 text-center">
        <h2 className="text-2xl font-bold text-white">Ready to put your Facebook page on autopilot?</h2>
        <Link href="/signup" className="mt-6 inline-block">
          <Button size="lg" variant="secondary" className="bg-white text-brand-600 hover:bg-slate-100">
            Start Free Trial
          </Button>
        </Link>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400">
        <nav className="mb-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link href="/privacy" className="hover:text-slate-600 hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-slate-600 hover:underline">
            Terms of Service
          </Link>
          <Link href="/data-deletion" className="hover:text-slate-600 hover:underline">
            Data Deletion
          </Link>
        </nav>
        <p>© {new Date().getFullYear()} PostPilot.ai · Built for Australian small businesses</p>
      </footer>
    </div>
  );
}
