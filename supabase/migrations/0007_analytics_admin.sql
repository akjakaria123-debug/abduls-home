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
