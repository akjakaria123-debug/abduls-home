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
