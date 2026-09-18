import type { SubscriptionStatus } from '@/types/database.types';

// What a business is actually allowed to do, given the state of its
// subscription. Pure and separate from the database so the rules can be
// read and tested on their own — getting this wrong means either giving
// away the product or locking out paying customers.

export const TRIAL_MAX_PAGES = 1;
export const TRIAL_MAX_POSTS_PER_DAY = 3;

export interface PlanLimits {
  maxPages: number;
  maxPostsPerDay: number;
}

export type EntitlementReason =
  | 'active'
  | 'trialing'
  | 'past_due_grace'
  | 'trial_expired'
  | 'no_subscription'
  | 'no_plan'
  | 'lapsed';

export interface Entitlements extends PlanLimits {
  reason: EntitlementReason;
  /** True when the user should be nudged to fix billing. */
  needsAttention: boolean;
}

const NONE: PlanLimits = { maxPages: 0, maxPostsPerDay: 0 };

export function resolveEntitlements(input: {
  status: SubscriptionStatus | null;
  planLimits: PlanLimits | null;
  trialEndsAt: string | null;
  now?: Date;
}): Entitlements {
  const { status, planLimits, trialEndsAt } = input;
  const now = input.now ?? new Date();

  if (!status) {
    return { ...NONE, reason: 'no_subscription', needsAttention: true };
  }

  switch (status) {
    case 'active':
      // Paying, but no plan mapped — usually an unrecognised Stripe price.
      return planLimits
        ? { ...planLimits, reason: 'active', needsAttention: false }
        : { ...NONE, reason: 'no_plan', needsAttention: true };

    case 'trialing': {
      const trialOver = trialEndsAt !== null && new Date(trialEndsAt).getTime() <= now.getTime();
      if (trialOver) {
        return { ...NONE, reason: 'trial_expired', needsAttention: true };
      }
      // A trial started through Stripe carries its plan; the free trial
      // created at onboarding does not, and falls back to trial limits.
      return planLimits
        ? { ...planLimits, reason: 'trialing', needsAttention: false }
        : {
            maxPages: TRIAL_MAX_PAGES,
            maxPostsPerDay: TRIAL_MAX_POSTS_PER_DAY,
            reason: 'trialing',
            needsAttention: false,
          };
    }

    case 'past_due':
      // Stripe is still retrying the card. Cutting service off at the
      // first failed charge punishes people over an expired card, so
      // access continues while the banner asks them to fix it.
      return planLimits
        ? { ...planLimits, reason: 'past_due_grace', needsAttention: true }
        : { ...NONE, reason: 'no_plan', needsAttention: true };

    case 'canceled':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
    default:
      return { ...NONE, reason: 'lapsed', needsAttention: true };
  }
}

export function entitlementMessage(reason: EntitlementReason): string | null {
  switch (reason) {
    case 'trial_expired':
      return 'Your free trial has ended. Choose a plan to keep posting.';
    case 'past_due_grace':
      return 'Your last payment failed. Update your payment method to avoid losing access.';
    case 'lapsed':
      return 'Your subscription is no longer active. Choose a plan to start posting again.';
    case 'no_plan':
      return "We couldn't match your subscription to a plan. Please contact support.";
    case 'no_subscription':
      return 'No subscription found for this business.';
    default:
      return null;
  }
}
