import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  Clock,
  Facebook,
  MessageSquareQuote,
  Shield,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Aurora } from '@/components/marketing/aurora';
import { Reveal } from '@/components/marketing/reveal';
import type { Json } from '@/types/database.types';

const STEPS = [
  {
    icon: Facebook,
    title: 'Connect your Page',
    body: 'Official Facebook login. No passwords shared, revoke any time.',
  },
  {
    icon: MessageSquareQuote,
    title: 'Describe your business',
    body: 'What you do, who you serve, the tone you want. A few minutes, once.',
  },
  {
    icon: Wand2,
    title: 'AI writes the posts',
    body: 'A balanced mix of promos, tips and questions — never the same thing twice.',
  },
  {
    icon: Clock,
    title: 'They publish themselves',
    body: 'On your days, at your times, whether or not you remember.',
  },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Captions that sound like you',
    body: 'Tone, language and words to avoid are yours to set. It writes in 67 languages, in the local idiom — not translated English.',
  },
  {
    icon: CalendarDays,
    title: 'A month at a glance',
    body: 'Every scheduled post on a calendar. Drag, edit, rewrite or delete before anything goes out.',
  },
  {
    icon: Shield,
    title: 'Approve first, or don’t',
    body: 'Review every post while you are getting comfortable, then switch to auto-pilot when you trust it.',
  },
  {
    icon: BarChart3,
    title: 'What actually worked',
    body: 'Reach, reactions, comments and shares pulled straight from Facebook — so the next month is better than the last.',
  },
];

const FAQ = [
  {
    q: 'Does this use official Facebook tools?',
    a: 'Yes — the official Meta Graph API, the same one Facebook offers every approved app. No browser automation, no scraping, nothing that puts your Page at risk.',
  },
  {
    q: 'Can I read posts before they go live?',
    a: 'Yes. Approval mode holds every post for you to read, edit or reject. Auto-pilot is there when you want it, and you can switch back whenever you like.',
  },
  {
    q: 'What if the AI writes something wrong?',
    a: 'It is told never to invent prices, discounts, reviews or opening hours. Anything it is unsure of it leaves for you to fill in — and in approval mode nothing publishes unread.',
  },
  {
    q: 'Who is this built for?',
    a: 'Small local businesses that know they should post and never find the time: cleaners, cafés, tradies, salons, agents, freelancers.',
  },
  {
    q: 'What happens after the free trial?',
    a: 'You pick a plan, or you don’t. Nothing is charged without you confirming it first, and you can cancel from inside the app in two clicks.',
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
  // The middle plan carries the emphasis when there are three.
  const featuredIndex = plans.length === 3 ? 1 : -1;

  return (
    <div className="min-h-screen bg-[#070A1A] text-slate-100 antialiased">
      {/* Scroll reveal hides content until JavaScript shows it again.
          With scripts off, nothing would ever show it, so undo it. */}
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#070A1A]/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <span className="text-lg font-bold tracking-tight">
            PostPilot
            <span className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
              .ai
            </span>
          </span>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="#pricing"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 sm:block"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#070A1A] transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Start free
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden px-5 pb-28 pt-20 sm:px-6 sm:pt-28 lg:px-8">
        <Aurora />

        <div className="relative mx-auto max-w-4xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
              Built for Australian small business
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-7 text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
              Your Facebook Page,
              <br />
              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                posting without you.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              AI writes, schedules and publishes your posts every single day — in your voice, on
              your schedule. You get your evenings back.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 sm:w-auto"
              >
                Start your free trial
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 sm:w-auto"
              >
                Log in
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              7 days free · No credit card to start · Cancel in two clicks
            </p>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section className="relative border-t border-white/5 px-5 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
              Four steps. Then it runs itself.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 90}>
                <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur transition-colors hover:border-white/20">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/25 to-fuchsia-500/25 ring-1 ring-inset ring-white/10">
                      <step.icon className="h-5 w-5 text-indigo-200" aria-hidden="true" />
                    </span>
                    <span className="text-xs font-semibold tracking-widest text-slate-500">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative isolate overflow-hidden border-t border-white/5 px-5 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
              Everything the job actually needs
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-slate-400">
              Not a content calendar you still have to fill in yourself.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 90}>
                <div className="h-full rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-7 backdrop-blur transition-colors hover:border-indigo-400/30">
                  <feature.icon className="h-6 w-6 text-indigo-300" aria-hidden="true" />
                  <h3 className="mt-5 text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-400">{feature.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        className="relative border-t border-white/5 px-5 py-24 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
              Simple pricing
            </h2>
            <p className="mt-4 text-center text-slate-400">
              Every plan starts with 7 days free. Prices in AUD, per month.
            </p>
          </Reveal>

          {plans.length > 0 ? (
            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {plans.map((plan, i) => {
                const features = Array.isArray(plan.features) ? (plan.features as Json[]) : [];
                const featured = i === featuredIndex;

                return (
                  <Reveal key={plan.key} delay={i * 90}>
                    <div
                      className={`relative flex h-full flex-col rounded-2xl border p-7 backdrop-blur ${
                        featured
                          ? 'border-indigo-400/40 bg-gradient-to-b from-indigo-500/15 to-fuchsia-500/[0.06] shadow-2xl shadow-indigo-500/10'
                          : 'border-white/10 bg-white/[0.03]'
                      }`}
                    >
                      {featured && (
                        <span className="absolute -top-3 left-7 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-3 py-1 text-xs font-semibold text-white">
                          Most popular
                        </span>
                      )}

                      <h3 className="text-base font-semibold text-white">{plan.name}</h3>

                      <p className="mt-4 flex items-baseline gap-1">
                        <span className="text-4xl font-bold tracking-tight text-white">
                          ${plan.price_aud}
                        </span>
                        <span className="text-sm text-slate-400">/month</span>
                      </p>

                      <ul className="mt-7 space-y-3 text-sm text-slate-300">
                        <li className="flex gap-2.5">
                          <Check
                            className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300"
                            aria-hidden="true"
                          />
                          {plan.max_pages} Facebook Page{plan.max_pages > 1 ? 's' : ''}
                        </li>
                        <li className="flex gap-2.5">
                          <Check
                            className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300"
                            aria-hidden="true"
                          />
                          Up to {plan.max_posts_per_day} posts a day
                        </li>
                        {features.map((f, index) => (
                          <li key={index} className="flex gap-2.5">
                            <Check
                              className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300"
                              aria-hidden="true"
                            />
                            {String(f)}
                          </li>
                        ))}
                      </ul>

                      <Link
                        href="/signup"
                        className={`mt-8 inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 ${
                          featured
                            ? 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-500/25'
                            : 'border border-white/15 bg-white/5 text-white hover:bg-white/10'
                        }`}
                      >
                        Start free trial
                      </Link>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          ) : (
            <p className="mt-12 text-center text-sm text-slate-500">
              Pricing plans will appear here once the database migrations have been run.
            </p>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="relative border-t border-white/5 px-5 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
              Questions people ask
            </h2>
          </Reveal>

          <div className="mt-12 space-y-3">
            {FAQ.map((item, i) => (
              <Reveal key={item.q} delay={i * 60}>
                <details className="group rounded-2xl border border-white/10 bg-white/[0.03] px-6 backdrop-blur transition-colors open:border-white/20 hover:border-white/20">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-base font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400">
                    {item.q}
                    <span
                      className="shrink-0 text-2xl font-light leading-none text-slate-500 transition-transform duration-300 group-open:rotate-45"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="pb-5 text-sm leading-relaxed text-slate-400">{item.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative isolate overflow-hidden border-t border-white/5 px-5 py-28 sm:px-6 lg:px-8">
        <Aurora />
        <Reveal className="relative mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Stop writing posts at 11pm.
          </h2>
          <p className="mt-5 text-lg text-slate-300">
            Set it up once tonight. It posts for you tomorrow.
          </p>
          <Link
            href="/signup"
            className="group mt-10 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-[#070A1A] shadow-xl transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
          >
            Start your free trial
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-5 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <span className="text-sm font-bold">
            PostPilot
            <span className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
              .ai
            </span>
          </span>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link
              href="/privacy"
              className="text-sm text-slate-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-slate-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Terms
            </Link>
            <Link
              href="/data-deletion"
              className="text-sm text-slate-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Data deletion
            </Link>
          </nav>

          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} PostPilot.ai
          </p>
        </div>
      </footer>
    </div>
  );
}
