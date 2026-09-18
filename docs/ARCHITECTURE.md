# AI Facebook Auto-Posting SaaS — MVP Architecture & Planning

Planning reference for the build. Covers final MVP architecture, user flow,
database schema, folder structure, required services, cost estimate,
Meta/Facebook requirements, and the phased development roadmap.

Phases are built one at a time; each phase starts only when explicitly
requested (e.g. "BUILD PHASE 1").

---

## A. Final MVP Architecture

**Pattern:** Single Next.js app (frontend + backend via Route Handlers/Server
Actions), Supabase as the managed backend (Postgres + Auth + Storage), Vercel
Cron as the scheduling trigger, Meta Graph API for all Facebook I/O, Stripe
for billing, an AI-provider abstraction (OpenAI first) for generation.

```
┌─────────────────────┐        ┌──────────────────────────┐
│   Browser (user)     │◄──────►│  Next.js App (Vercel)     │
│  Dashboard / Landing │        │  - App Router pages       │
└─────────────────────┘        │  - Route Handlers (API)   │
                                 │  - Server Actions         │
                                 └──────────┬────────────────┘
                                            │
              ┌─────────────────────────────┼───────────────────────────┐
              ▼                             ▼                           ▼
    ┌──────────────────┐        ┌───────────────────────┐   ┌────────────────────┐
    │ Supabase          │        │ Meta Graph API         │   │ Stripe              │
    │ - Postgres (RLS)  │        │ - OAuth (Page tokens)  │   │ - Checkout          │
    │ - Auth            │        │ - Publish to Page feed │   │ - Customer Portal   │
    │ - Storage (logos) │        │ - Page Insights        │   │ - Webhooks          │
    └──────────────────┘        └───────────────────────┘   └────────────────────┘
              ▲
              │
    ┌───────────────────────┐        ┌──────────────────────┐
    │ Vercel Cron            │───────►│ /api/cron/publish     │
    │ (every 1–5 min)        │        │ (finds due posts,     │
    │ CRON_SECRET protected  │        │  calls Meta, retries) │
    └───────────────────────┘        └──────────────────────┘
                                                │
                                                ▼
                                      ┌──────────────────────┐
                                      │ AI Provider layer     │
                                      │ (OpenAI now, swap     │
                                      │  later via interface) │
                                      └──────────────────────┘
```

**Key architectural decisions and why:**

1. **Scheduling: Vercel Cron, not frontend timers.** A cron-triggered API
   route runs every 1–5 minutes, queries `posts` where `status = 'scheduled'
   AND scheduled_at <= now()`, and publishes them. This works entirely
   server-side and survives the user closing their browser. For MVP this is
   sufficient; if you outgrow Vercel Cron's granularity or need guaranteed
   exactly-once delivery at scale, the same route can be triggered by
   Supabase `pg_cron` + `pg_net`, or by QStash, without changing the
   publishing logic itself.

2. **Idempotent publishing.** Every scheduled post gets a
   `publish_lock_token` (UUID) set atomically when a cron run picks it up
   (`UPDATE ... WHERE status='scheduled' AND scheduled_at<=now() RETURNING
   ...`), so two concurrent cron invocations can never publish the same post
   twice. Each attempt is logged in `post_publish_attempts`.

3. **AI provider abstraction.** All generation goes through an `AIProvider`
   interface (`generatePosts(input): GeneratedPost[]`) with an
   `OpenAIProvider` implementation. Swapping providers later means writing a
   new class, not touching call sites.

4. **Facebook tokens are encrypted at rest.** Page access tokens are
   AES-256-GCM encrypted with a server-only `TOKEN_ENCRYPTION_KEY` before
   being stored in Postgres, and decrypted only inside server-side code that
   calls the Graph API. They are never sent to the client.

5. **Multi-tenancy via `businesses`.** A user (`profiles`) owns one or more
   `businesses`; each business has its own Facebook connection, brand
   profile, content preferences, and posts. Plan limits (page count,
   posts/day) are enforced per business against the `plans` table.

6. **Admin-editable pricing.** Plans live in a `plans` table, not hardcoded
   constants, so the admin dashboard can edit price/limits without a deploy.

---

## B. User Flow

```
Landing Page
   │
   ▼
Sign Up (email+password or Google) ──► Email verification
   │
   ▼
Onboarding wizard
   ├─ Business info (name, category, description, website, phone, email,
   │   location, target customers, products/services, offers,
   │   brand tone, language, timezone)
   ▼
Connect Facebook (Meta OAuth)
   ├─ Select Page(s) — count limited by plan
   ▼
Brand Profile (logo, colors, voice, CTA, words to avoid)
   ▼
Content Preferences
   ├─ Content categories to include
   ├─ Posts per day (1–5, plan-limited)
   ├─ Posting days
   ├─ Posting times (per business timezone)
   ▼
AI generates first batch of posts (status = draft)
   │
   ▼
Approval mode choice
   ├─ MODE 1: Approve before publishing → user reviews in Calendar,
   │   clicks Approve → status = scheduled
   └─ MODE 2: Full auto-pilot → generated posts go straight to
       status = scheduled (skips manual approval)
   │
   ▼
Cron job publishes due posts → status = published (or failed + retry)
   │
   ▼
Dashboard shows stats + "Next Scheduled Posts"
Analytics page shows per-post reach/reactions/comments/shares (where Graph API allows)
   │
   ▼
Subscription: 7-day trial → Stripe Checkout → active subscription
   (upgrade/downgrade/cancel via Stripe Customer Portal)
```

Mode can be switched at any time in Settings; switching to auto-pilot only
affects future generations, not posts already in `draft`.

---

## C. Database Schema

Design notes before the DDL:

- The requested `generated_posts` / `scheduled_posts` / `published_posts`
  are consolidated into **one `posts` table** with a `status` lifecycle
  (`draft → approved → scheduled → published / failed`). A post is one row
  throughout its life — splitting it into three tables would mean copying
  the same 10+ columns three times and doing lifecycle-moving `INSERT`s
  instead of a status `UPDATE`, for no benefit at this scale. Retry/audit
  history and analytics get their own tables instead, since those genuinely
  are separate, append-only concerns:
  - `post_publish_attempts` — one row per publish attempt (retry logic +
    audit trail, prevents duplicate publishes)
  - `post_insights` — snapshots of reach/reactions/comments/shares/clicks
    pulled from the Graph API Insights endpoint, refreshable over time
- `users` is Supabase's built-in `auth.users` — `profiles` is the 1:1
  app-level extension of it.
- `plans` is new (not in the original table list) — required so pricing is
  admin-editable instead of hardcoded.
- All tenant tables carry `business_id` (directly or transitively) for RLS
  scoping.

```sql
-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ============================================================
-- ENUMS
-- ============================================================
create type brand_tone as enum (
  'professional','friendly','casual','funny','luxury','educational','sales_focused'
);

create type content_category as enum (
  'promotional','educational','tips','engagement','product_spotlight',
  'service_spotlight','customer_testimonial','faq','behind_the_scenes',
  'seasonal','local_business','special_offer','holiday','community'
);

create type approval_mode as enum ('manual','auto_pilot');

create type post_status as enum ('draft','approved','scheduled','published','failed');

create type subscription_status as enum (
  'trialing','active','past_due','canceled','incomplete','incomplete_expired','unpaid'
);

create type user_role as enum ('user','admin');

-- ============================================================
-- PROFILES (1:1 with auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- BUSINESSES
-- ============================================================
create table businesses (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  category text,
  description text,
  website text,
  phone text,
  contact_email text,
  location text,
  target_customers text,
  products_services text,
  main_offers text,
  brand_tone brand_tone not null default 'professional',
  preferred_language text not null default 'en-AU',
  timezone text not null default 'Australia/Sydney',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_businesses_owner on businesses(owner_id);

-- ============================================================
-- FACEBOOK CONNECTIONS (one Meta OAuth login per business)
-- ============================================================
create table facebook_connections (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  meta_user_id text not null,
  long_lived_user_token_encrypted text not null,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'active', -- active | expired | revoked
  connected_at timestamptz not null default now(),
  disconnected_at timestamptz
);
create index idx_fb_connections_business on facebook_connections(business_id);

-- ============================================================
-- FACEBOOK PAGES (pages available/selected under a connection)
-- ============================================================
create table facebook_pages (
  id uuid primary key default uuid_generate_v4(),
  connection_id uuid not null references facebook_connections(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  page_id text not null,                -- Facebook Page ID
  page_name text not null,
  page_access_token_encrypted text not null,
  is_selected boolean not null default false,
  permissions text[] not null default '{}',
  last_token_check_at timestamptz,
  token_status text not null default 'valid', -- valid | invalid | needs_reauth
  created_at timestamptz not null default now(),
  unique(connection_id, page_id)
);
create index idx_fb_pages_business on facebook_pages(business_id);

-- ============================================================
-- BRAND PROFILES (1:1 with business)
-- ============================================================
create table brand_profiles (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null unique references businesses(id) on delete cascade,
  logo_url text,
  brand_colors jsonb not null default '[]', -- ["#111111","#F0A63C"]
  preferred_cta text,
  brand_voice text,
  words_to_avoid text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CONTENT PREFERENCES (1:1 with business)
-- ============================================================
create table content_preferences (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null unique references businesses(id) on delete cascade,
  enabled_categories content_category[] not null default '{}',
  posts_per_day int not null default 1 check (posts_per_day between 1 and 5),
  posting_days int[] not null default '{1,2,3,4,5,6,7}', -- 1=Mon..7=Sun
  posting_times time[] not null default '{09:00}',
  approval_mode approval_mode not null default 'manual',
  updated_at timestamptz not null default now()
);

-- ============================================================
-- POSTS (generated → approved → scheduled → published/failed)
-- ============================================================
create table posts (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  facebook_page_id uuid references facebook_pages(id) on delete set null,
  category content_category not null,
  caption text not null,
  cta text,
  hashtags text[] not null default '{}',
  image_idea text,
  image_prompt text,
  image_url text,
  status post_status not null default 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  facebook_post_id text,
  error_message text,
  retry_count int not null default 0,
  publish_lock_token uuid,
  ai_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_posts_business on posts(business_id);
create index idx_posts_status_scheduled on posts(status, scheduled_at);
create index idx_posts_page on posts(facebook_page_id);

-- ============================================================
-- POST PUBLISH ATTEMPTS (retry + audit log, prevents dupes)
-- ============================================================
create table post_publish_attempts (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references posts(id) on delete cascade,
  attempted_at timestamptz not null default now(),
  success boolean not null,
  http_status int,
  error_message text,
  facebook_post_id text
);
create index idx_publish_attempts_post on post_publish_attempts(post_id);

-- ============================================================
-- POST INSIGHTS (analytics snapshots)
-- ============================================================
create table post_insights (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references posts(id) on delete cascade,
  reach int,
  reactions int,
  comments int,
  shares int,
  clicks int,
  fetched_at timestamptz not null default now()
);
create index idx_post_insights_post on post_insights(post_id);

-- ============================================================
-- PLANS (admin-editable pricing/limits)
-- ============================================================
create table plans (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,          -- 'starter' | 'pro' | 'business'
  name text not null,
  price_aud numeric(10,2) not null,
  stripe_price_id text,
  max_pages int not null,
  max_posts_per_day int not null,
  features jsonb not null default '[]',
  is_active boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null unique references businesses(id) on delete cascade,
  plan_id uuid references plans(id),
  stripe_customer_id text,
  stripe_subscription_id text,
  status subscription_status not null default 'trialing',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_subscriptions_business on subscriptions(business_id);
create index idx_subscriptions_stripe_customer on subscriptions(stripe_customer_id);

-- ============================================================
-- USAGE (per business per billing period, for limit enforcement)
-- ============================================================
create table usage (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  posts_generated int not null default 0,
  posts_published int not null default 0,
  posts_failed int not null default 0,
  unique(business_id, period_start)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,   -- 'publish_failed' | 'token_expired' | 'trial_ending' | ...
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on notifications(user_id, read);

-- ============================================================
-- API LOGS (Meta / Stripe / OpenAI calls, for admin monitoring)
-- ============================================================
create table api_logs (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete set null,
  service text not null,   -- 'meta' | 'stripe' | 'openai'
  endpoint text not null,
  status_code int,
  success boolean not null,
  error_message text,
  created_at timestamptz not null default now()
);
create index idx_api_logs_service on api_logs(service, created_at desc);

-- ============================================================
-- ADMIN LOGS
-- ============================================================
create table admin_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid not null references profiles(id),
  action text not null,          -- 'suspend_user' | 'edit_pricing' | ...
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ============================================================
-- updated_at trigger (reused on every table with updated_at)
-- ============================================================
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_businesses_updated before update on businesses
  for each row execute function set_updated_at();
create trigger trg_posts_updated before update on posts
  for each row execute function set_updated_at();
-- (repeat for brand_profiles, subscriptions, profiles as needed)

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table businesses enable row level security;
alter table facebook_connections enable row level security;
alter table facebook_pages enable row level security;
alter table brand_profiles enable row level security;
alter table content_preferences enable row level security;
alter table posts enable row level security;
alter table post_publish_attempts enable row level security;
alter table post_insights enable row level security;
alter table subscriptions enable row level security;
alter table usage enable row level security;
alter table notifications enable row level security;

-- Owner-scoped access pattern (repeat shape per table)
create policy "owner can access own businesses"
  on businesses for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owner can access own posts"
  on posts for all
  using (business_id in (select id from businesses where owner_id = auth.uid()))
  with check (business_id in (select id from businesses where owner_id = auth.uid()));

-- Same pattern applied to facebook_connections, facebook_pages, brand_profiles,
-- content_preferences, post_publish_attempts, post_insights, subscriptions, usage
-- (all scoped through business_id -> businesses.owner_id = auth.uid()).

create policy "user can access own notifications"
  on notifications for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- api_logs and admin_logs have NO client-facing policy — only the
-- service-role key (used server-side in admin routes) can read/write them.
```

---

## D. Recommended Folder Structure

```
/
├── docs/
│   └── ARCHITECTURE.md            # this document
├── supabase/
│   └── migrations/
│       └── 0001_init.sql          # the DDL above
├── src/
│   ├── app/
│   │   ├── (marketing)/
│   │   │   ├── page.tsx           # Landing page
│   │   │   ├── pricing/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── verify-email/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   ├── (onboarding)/
│   │   │   └── onboarding/page.tsx  # multi-step wizard
│   │   ├── (app)/                  # authenticated dashboard area
│   │   │   ├── layout.tsx          # sidebar + topbar shell
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── content/page.tsx
│   │   │   ├── calendar/page.tsx
│   │   │   ├── facebook-pages/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   ├── billing/page.tsx
│   │   │   └── settings/
│   │   │       ├── business/page.tsx
│   │   │       ├── brand/page.tsx
│   │   │       └── content-preferences/page.tsx
│   │   ├── (admin)/
│   │   │   ├── layout.tsx
│   │   │   ├── admin/page.tsx
│   │   │   ├── admin/users/page.tsx
│   │   │   ├── admin/pricing/page.tsx
│   │   │   └── admin/logs/page.tsx
│   │   └── api/
│   │       ├── auth/callback/route.ts
│   │       ├── facebook/
│   │       │   ├── connect/route.ts     # start OAuth
│   │       │   ├── callback/route.ts    # OAuth callback
│   │       │   └── disconnect/route.ts
│   │       ├── posts/
│   │       │   ├── generate/route.ts
│   │       │   ├── [id]/approve/route.ts
│   │       │   ├── [id]/regenerate/route.ts
│   │       │   └── [id]/route.ts        # edit/delete/duplicate
│   │       ├── stripe/
│   │       │   ├── checkout/route.ts
│   │       │   ├── portal/route.ts
│   │       │   └── webhook/route.ts
│   │       └── cron/
│   │           ├── publish/route.ts     # scheduled Graph API publishing
│   │           └── refresh-tokens/route.ts
│   ├── components/
│   │   ├── ui/                     # shadcn/ui primitives
│   │   ├── landing/
│   │   ├── onboarding/
│   │   ├── calendar/
│   │   ├── dashboard/
│   │   └── admin/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           # browser client
│   │   │   ├── server.ts           # server client (cookies)
│   │   │   └── admin.ts            # service-role client (server-only)
│   │   ├── meta/
│   │   │   ├── oauth.ts
│   │   │   ├── graph-client.ts
│   │   │   └── publish.ts
│   │   ├── ai/
│   │   │   ├── provider.ts         # AIProvider interface
│   │   │   ├── openai-provider.ts
│   │   │   └── prompt-templates.ts
│   │   ├── stripe/
│   │   │   └── client.ts
│   │   ├── crypto/
│   │   │   └── token-encryption.ts # AES-256-GCM helpers
│   │   └── rate-limit.ts
│   ├── types/
│   │   └── database.types.ts       # generated from Supabase schema
│   └── middleware.ts                # auth guard for (app)/(admin) routes
├── vercel.json                     # cron schedule config
├── .env.example
└── package.json
```

---

## E. Required Services / APIs

| Service | Purpose | Account needed |
|---|---|---|
| **Supabase** | Postgres, Auth, Storage | Yes — free tier to start, Pro likely needed by ~100 users |
| **Vercel** | Hosting + Cron | Yes — Pro plan needed for reliable Cron on multiple schedules |
| **Meta for Developers** | Graph API app, Facebook Login, Page permissions | Yes — Business-type app, business verification required for Live mode |
| **Stripe** | Subscriptions, Checkout, Customer Portal, webhooks | Yes |
| **OpenAI API** (or swappable provider) | Post generation | Yes — API key |
| **Transactional email** (Resend or Postmark) | Verification, password reset, notifications | Yes |
| **Domain + DNS** | e.g. yourapp.com.au | Yes |
| Optional: **Upstash Redis** | Rate limiting, distributed lock backup for cron | Recommended, not required for MVP |

---

## F. Estimated Monthly Running Costs (first ~100 users)

Assumes a mix of trial + paying users, average 3 posts/day/business, AI
generation batched (not per-post calls).

| Item | Estimate (USD/mo) | Notes |
|---|---|---|
| Vercel Pro | $20 | Needed for reliable Cron + team features |
| Supabase Pro | $25 | Free tier likely too tight on DB size/auth MAUs by 100 users |
| OpenAI API (gpt-4o-mini class model) | $15–40 | ~100 businesses × ~3 posts/day × ~30 days × short prompts; scales with model choice |
| Resend (email) | $0–20 | Free tier covers low volume |
| Domain | ~$1–2 | Amortized annual cost |
| Upstash Redis (optional) | $0–10 | Free tier usually sufficient at this scale |
| Meta Graph API | $0 | Free — no cost, just review/verification requirements |
| **Stripe** | 2.9% + $0.30 AUD per transaction | Not a fixed cost — scales with revenue, not user count |
| **Total (fixed infra)** | **≈ $60–115/month** | Before Stripe's per-transaction fee |

This is a rough planning number, not a quote — actual OpenAI cost depends
heavily on which model is chosen and prompt length. Recommend starting with
a cheaper model for generation and only upgrading if quality demands it.

---

## G. Meta/Facebook Requirements & App Review

**Setup steps:**
1. Create a **Meta Developer account** and a **Business-type app** at
   developers.facebook.com.
2. Add the **Facebook Login** product for OAuth.
3. Request these permissions (the actual minimum set for this product):
   - `pages_show_list` — list the Pages a user manages
   - `pages_manage_posts` — publish posts to a Page
   - `pages_read_engagement` — read engagement data needed for Insights
   - `pages_read_user_content` — if reading existing Page content/comments is
     needed later
   - `business_management` — only if working through a Business Manager
     rather than direct personal Page admin access
4. Complete **Business Verification** in Meta Business Manager — required
   before most of the above permissions can go to **Advanced Access**
   (public use). Without it, the app is stuck at Standard Access, which is
   unusable for real customers beyond a handful of test users.
5. Submit for **App Review**: Meta requires a screencast demonstrating the
   exact use of each requested permission, a live privacy policy URL, a live
   terms of service URL, and a **data deletion instructions URL/callback**
   (required by Meta Platform Terms for any app handling user data).
6. Until approved, the app runs in **Development mode** — only users added
   as Admins/Developers/Testers on the app can connect their Pages. Plan for
   **1–4 weeks** of review turnaround, and expect at least one
   rejection-and-resubmit cycle; this is the single biggest external
   bottleneck in the whole project, so this process should start as soon as
   OAuth is wired up in Phase 2, not wait for the rest of the app to be
   built.

**Technical realities to design around (no invented capabilities):**
- Only **feed/Page posts** are reliably supported via `pages_manage_posts`
  for a standard app — Reels/Stories publishing requires separate,
  harder-to-get permissions and isn't in MVP scope.
- **Long-lived Page access tokens** don't have a fixed short expiry, but
  they *can* be invalidated — by the user removing the app, changing their
  Facebook password, Meta security actions, or the Page losing the
  connected user as admin. Always handle a publish call failing with an
  auth error by marking the page `token_status = 'needs_reauth'` and
  notifying the user — never assume tokens are permanent.
- **Insights metrics** (reach, reactions, comments, shares) require
  `pages_read_engagement` and are only available for Pages the connected
  user actually administers; some metrics have minimum audience-size
  thresholds before Meta returns non-null data. Don't promise metrics the
  API won't return for a small/new Page — show "Not enough data yet"
  instead of a fabricated number.
- Publish endpoint is `POST /{page-id}/feed` with the Page access token
  (not the user token) — this is what
  `facebook_pages.page_access_token_encrypted` is for.
- Standard Graph API rate limits apply per app and per Page; at MVP scale
  (100 businesses × 5 posts/day) this is nowhere near the ceiling, but the
  retry logic in `post_publish_attempts` should still back off on a 429
  rather than hammering it.

---

## H. Development Roadmap

| Phase | Scope | Rough duration | Key external dependency |
|---|---|---|---|
| **1** | Auth, business onboarding, dashboard shell, full DB schema + RLS | 1–1.5 weeks | Supabase project created |
| **2** | Facebook OAuth connect flow, Page selection, token storage | 1 week | **Submit Meta App Review here** — don't wait |
| **3** | AI content generation (provider abstraction, category mix logic) | 1 week | OpenAI API key |
| **4** | Content calendar (day/week/month views), approve/edit/regenerate/reschedule | 1–1.5 weeks | — |
| **5** | Automatic publishing via cron, retry logic, failure notifications | 1 week | Meta App Review ideally approved by now |
| **6** | Stripe subscriptions, trial, Customer Portal, plan-limit enforcement | 1 week | Stripe account |
| **7** | Analytics (Insights integration) + Admin dashboard | 1–1.5 weeks | — |

Total: roughly **7–9 weeks** for one developer at a steady pace, dominated
less by coding time than by the Meta App Review turnaround in the middle.
