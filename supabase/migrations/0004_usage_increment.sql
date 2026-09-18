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
