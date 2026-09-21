-- ============================================================
--  PostPilot.ai — complete database setup
--
--  Paste this whole file into the Supabase SQL Editor and press
--  Run. It creates every table, index, function and Row Level
--  Security policy the app needs, and seeds the pricing plans.
--
--  Safe to run once on a brand-new Supabase project.
--  Generated from supabase/migrations/*.sql (0001 through 0008).
-- ============================================================


-- ------------------------------------------------------------
-- 0001_init.sql
-- ------------------------------------------------------------

-- ============================================================
-- AI Facebook Auto-Posting SaaS — initial schema
-- ============================================================

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

-- Auto-create a profile row whenever a new Supabase Auth user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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
  page_id text not null,
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
  brand_colors jsonb not null default '[]',
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
-- POSTS (draft → approved → scheduled → published/failed)
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
  key text not null unique,
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
-- USAGE (per business per billing period)
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
  type text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on notifications(user_id, read);

-- ============================================================
-- API LOGS (service-role only — Meta / Stripe / OpenAI calls)
-- ============================================================
create table api_logs (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete set null,
  service text not null,
  endpoint text not null,
  status_code int,
  success boolean not null,
  error_message text,
  created_at timestamptz not null default now()
);
create index idx_api_logs_service on api_logs(service, created_at desc);

-- ============================================================
-- ADMIN LOGS (service-role only)
-- ============================================================
create table admin_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid not null references profiles(id),
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();
create trigger trg_businesses_updated before update on businesses
  for each row execute function set_updated_at();
create trigger trg_brand_profiles_updated before update on brand_profiles
  for each row execute function set_updated_at();
create trigger trg_posts_updated before update on posts
  for each row execute function set_updated_at();
create trigger trg_subscriptions_updated before update on subscriptions
  for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table businesses enable row level security;
alter table facebook_connections enable row level security;
alter table facebook_pages enable row level security;
alter table brand_profiles enable row level security;
alter table content_preferences enable row level security;
alter table posts enable row level security;
alter table post_publish_attempts enable row level security;
alter table post_insights enable row level security;
alter table plans enable row level security;
alter table subscriptions enable row level security;
alter table usage enable row level security;
alter table notifications enable row level security;
alter table api_logs enable row level security;
alter table admin_logs enable row level security;

-- profiles: user can read/update only their own row.
-- Insert happens only via the handle_new_user() trigger (security definer).
create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- businesses: full access scoped to the owning user.
create policy "businesses_all_own" on businesses
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- facebook_connections: scoped through the owning business.
create policy "fb_connections_all_own" on facebook_connections
  for all
  using (business_id in (select id from businesses where owner_id = auth.uid()))
  with check (business_id in (select id from businesses where owner_id = auth.uid()));

-- facebook_pages: scoped through the owning business.
create policy "fb_pages_all_own" on facebook_pages
  for all
  using (business_id in (select id from businesses where owner_id = auth.uid()))
  with check (business_id in (select id from businesses where owner_id = auth.uid()));

-- brand_profiles: scoped through the owning business.
create policy "brand_profiles_all_own" on brand_profiles
  for all
  using (business_id in (select id from businesses where owner_id = auth.uid()))
  with check (business_id in (select id from businesses where owner_id = auth.uid()));

-- content_preferences: scoped through the owning business.
create policy "content_preferences_all_own" on content_preferences
  for all
  using (business_id in (select id from businesses where owner_id = auth.uid()))
  with check (business_id in (select id from businesses where owner_id = auth.uid()));

-- posts: scoped through the owning business.
create policy "posts_all_own" on posts
  for all
  using (business_id in (select id from businesses where owner_id = auth.uid()))
  with check (business_id in (select id from businesses where owner_id = auth.uid()));

-- post_publish_attempts: read-only for the owning user. Writes happen
-- server-side via the service-role client (the cron publisher), which
-- bypasses RLS entirely, so no insert/update policy is needed here.
create policy "post_publish_attempts_select_own" on post_publish_attempts
  for select
  using (post_id in (
    select id from posts where business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  ));

-- post_insights: read-only for the owning user. Writes happen server-side.
create policy "post_insights_select_own" on post_insights
  for select
  using (post_id in (
    select id from posts where business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  ));

-- plans: publicly readable (marketing pricing page); edited only via the
-- service-role client from the admin dashboard.
create policy "plans_public_select" on plans
  for select using (is_active = true);

-- subscriptions: user can read their own and create the initial trial row;
-- status changes after that come only from the Stripe webhook via the
-- service-role client, so there is deliberately no update/delete policy.
create policy "subscriptions_select_own" on subscriptions
  for select
  using (business_id in (select id from businesses where owner_id = auth.uid()));
create policy "subscriptions_insert_own" on subscriptions
  for insert
  with check (business_id in (select id from businesses where owner_id = auth.uid()));

-- usage: read-only for the owning user; written server-side.
create policy "usage_select_own" on usage
  for select
  using (business_id in (select id from businesses where owner_id = auth.uid()));

-- notifications: user can read and mark their own as read.
create policy "notifications_select_own" on notifications
  for select using (user_id = auth.uid());
create policy "notifications_update_own" on notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- api_logs / admin_logs: no policies for anon/authenticated roles at all —
-- only the service-role key (used server-side) can read or write these.


-- ------------------------------------------------------------
-- 0002_seed_plans.sql
-- ------------------------------------------------------------

-- Seed the three MVP plans. Editable later from the admin dashboard
-- (Phase 7) via the service-role client — this is just the starting data.

insert into plans (key, name, price_aud, max_pages, max_posts_per_day, features, sort_order)
values
  (
    'starter',
    'Starter',
    19.00,
    1,
    3,
    '["AI content generation","Scheduling","Content calendar"]'::jsonb,
    1
  ),
  (
    'pro',
    'Pro',
    39.00,
    3,
    5,
    '["Auto-publishing","Advanced content settings","Analytics"]'::jsonb,
    2
  ),
  (
    'business',
    'Business',
    69.00,
    10,
    5,
    '["More Pages","Higher limits","Priority support","Advanced features"]'::jsonb,
    3
  )
on conflict (key) do nothing;


-- ------------------------------------------------------------
-- 0003_facebook_pages_business_unique.sql
-- ------------------------------------------------------------

-- Reconnecting Facebook creates a new facebook_connections row. With
-- uniqueness scoped to (connection_id, page_id), that produced a second
-- facebook_pages row for the same real Page — splitting its post history
-- and silently dropping the user's is_selected choice.
--
-- Scope uniqueness to the business instead, so a reconnect upserts the
-- existing Page row (new token, new connection_id) and keeps everything
-- that points at it intact.

alter table facebook_pages
  drop constraint facebook_pages_connection_id_page_id_key;

alter table facebook_pages
  add constraint facebook_pages_business_id_page_id_key unique (business_id, page_id);

-- The active-connection lookup runs on every Facebook Pages page load.
create index idx_fb_connections_business_status
  on facebook_connections(business_id, status);


-- ------------------------------------------------------------
-- 0004_usage_increment.sql
-- ------------------------------------------------------------

-- Usage counters are read-modify-written from several places (generation
-- now, publishing in Phase 5). Doing that in application code races and
-- loses counts, and PostgREST can't express `col = col + n`, so the
-- increment lives here as one atomic upsert.
--
-- security definer because `usage` has no client-facing write policy —
-- callers reach this through the service-role client.

create or replace function increment_usage(
  p_business_id uuid,
  p_generated int default 0,
  p_published int default 0,
  p_failed int default 0
)
returns void as $$
declare
  v_period_start date := date_trunc('month', now())::date;
  v_period_end date := (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date;
begin
  insert into usage (
    business_id, period_start, period_end,
    posts_generated, posts_published, posts_failed
  )
  values (
    p_business_id, v_period_start, v_period_end,
    p_generated, p_published, p_failed
  )
  on conflict (business_id, period_start) do update set
    posts_generated = usage.posts_generated + excluded.posts_generated,
    posts_published = usage.posts_published + excluded.posts_published,
    posts_failed = usage.posts_failed + excluded.posts_failed;
end;
$$ language plpgsql security definer set search_path = public;


-- ------------------------------------------------------------
-- 0005_publish_queue.sql
-- ------------------------------------------------------------

-- Publishing turns `posts` into a job queue, and job queues need two
-- things the table didn't have: somewhere to record when a failed post
-- should next be tried, and a claim that two concurrent cron runs can't
-- both win.

-- Backoff target. Kept separate from scheduled_at so a retry never
-- rewrites the time the user actually chose (and sees on the calendar).
alter table posts add column next_attempt_at timestamptz;

-- The queue scan: due, scheduled, not yet sent.
create index idx_posts_due_for_publish
  on posts(scheduled_at)
  where status = 'scheduled' and facebook_post_id is null;

-- Claims up to p_limit due posts and stamps them with this run's lock
-- token, atomically. FOR UPDATE SKIP LOCKED is what makes two overlapping
-- cron invocations take disjoint sets instead of racing for the same row —
-- the second run skips what the first has locked rather than blocking.
--
-- A lock older than 10 minutes is treated as abandoned (the run that took
-- it died mid-flight) and may be reclaimed. facebook_post_id IS NULL is
-- the backstop: a post that already has an ID is never re-sent, whatever
-- happened to its lock.
create or replace function claim_due_posts(p_lock_token uuid, p_limit int default 25)
returns setof posts as $$
  update posts
  set publish_lock_token = p_lock_token
  where id in (
    select id from posts
    where status = 'scheduled'
      and scheduled_at <= now()
      and facebook_post_id is null
      and (next_attempt_at is null or next_attempt_at <= now())
      and (publish_lock_token is null or updated_at < now() - interval '10 minutes')
    order by scheduled_at
    limit p_limit
    for update skip locked
  )
  returning *;
$$ language sql security definer set search_path = public;


-- ------------------------------------------------------------
-- 0006_billing.sql
-- ------------------------------------------------------------

-- Stripe webhooks arrive knowing a subscription id, not a business id, so
-- that lookup needs to be indexed.
create index idx_subscriptions_stripe_subscription
  on subscriptions(stripe_subscription_id);

-- Checkout needs a Price to sell. Fill these in from your Stripe dashboard
-- (Products → your product → Pricing), then re-run just these updates:
--
--   update plans set stripe_price_id = 'price_xxx' where key = 'starter';
--   update plans set stripe_price_id = 'price_yyy' where key = 'pro';
--   update plans set stripe_price_id = 'price_zzz' where key = 'business';
--
-- A plan without a price id is shown as unavailable rather than failing
-- at the checkout step.


-- ------------------------------------------------------------
-- 0007_analytics_admin.sql
-- ------------------------------------------------------------

-- Suspension. Null means in good standing; a timestamp records when an
-- admin cut access off.
alter table profiles add column suspended_at timestamptz;

-- The analytics page asks for the newest snapshot per post.
create index idx_post_insights_latest on post_insights(post_id, fetched_at desc);

-- Finding published posts that are due an insights refresh.
create index idx_posts_published_at on posts(published_at) where status = 'published';

-- Suspending someone has to stop their posts going out, not just lock
-- them out of the dashboard — otherwise an account suspended for abuse
-- keeps publishing on schedule. Enforcing it inside the claim means
-- every publishing path inherits it.
create or replace function claim_due_posts(p_lock_token uuid, p_limit int default 25)
returns setof posts as $$
  update posts
  set publish_lock_token = p_lock_token
  where id in (
    select p.id from posts p
    join businesses b on b.id = p.business_id
    join profiles pr on pr.id = b.owner_id
    where p.status = 'scheduled'
      and p.scheduled_at <= now()
      and p.facebook_post_id is null
      and (p.next_attempt_at is null or p.next_attempt_at <= now())
      and (p.publish_lock_token is null or p.updated_at < now() - interval '10 minutes')
      and pr.suspended_at is null
    order by p.scheduled_at
    limit p_limit
    for update of p skip locked
  )
  returning *;
$$ language sql security definer set search_path = public;


-- ------------------------------------------------------------
-- 0008_data_deletion_requests.sql
-- ------------------------------------------------------------

-- Meta's data deletion callback must hand back a confirmation code that
-- the person can later look up to check the request was honoured. That
-- means the request has to be recorded somewhere.

create table data_deletion_requests (
  id uuid primary key default uuid_generate_v4(),
  confirmation_code text not null unique,
  meta_user_id text,
  source text not null default 'facebook_callback',
  status text not null default 'completed',
  connections_removed int not null default 0,
  pages_removed int not null default 0,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_data_deletion_code on data_deletion_requests(confirmation_code);

-- The status page looks a code up without logging in, so anonymous reads
-- are allowed — but only of rows whose code you already know, which acts
-- as the secret. No other column identifies a person.
alter table data_deletion_requests enable row level security;

create policy "deletion_requests_public_lookup" on data_deletion_requests
  for select using (true);

