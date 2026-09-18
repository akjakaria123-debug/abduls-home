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
