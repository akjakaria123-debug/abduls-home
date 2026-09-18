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
