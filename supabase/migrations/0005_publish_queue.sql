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
