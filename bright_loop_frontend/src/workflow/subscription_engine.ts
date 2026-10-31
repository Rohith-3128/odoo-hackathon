/**
 * Brightloop Nexus - Subscription Lifecycle Engine
 * Team 2: Workflows & Subscription Lifecycle
 *
 * Authoritative business logic for subscription state machine,
 * trials, upgrades, downgrades, proration, cancellations, and renewals.
 */

export type SubscriptionStatus =
  | 'draft'
  | 'trialing'
  | 'active'
  | 'paused'
  | 'past_due'
  | 'canceled'
  | 'expired';

export type BillingInterval = 'monthly' | 'quarterly' | 'annual';

export interface CommercialTerms {
  planId: string;
  planName: string;
  billingInterval: BillingInterval;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  currency: string;
  features: string[];
}

export interface SubscriptionAuditEvent {
  id: string;
  timestamp: string;
  type: string;
  actor: string;
  previousStatus?: SubscriptionStatus;
  newStatus?: SubscriptionStatus;
  description: string;
  details?: Record<string, any>;
}

export interface ProrationCalculation {
  periodStartDate: string;
  periodEndDate: string;
  effectiveDate: string;
  totalDaysInPeriod: number;
  daysRemaining: number;
  oldPlanPrice: number;
  newPlanPrice: number;
  unusedOldPlanCredit: number;
  proratedNewPlanDebit: number;
  netAdjustment: number; // positive = customer pays difference; negative = credit balance
  currency: string;
}

export interface PlanChangeHistory {
  id: string;
  changedAt: string;
  actor: string;
  previousPlanId: string;
  previousPlanName: string;
  previousPrice: number;
  newPlanId: string;
  newPlanName: string;
  newPrice: number;
  changeType: 'upgrade' | 'downgrade' | 'lateral';
  proration: ProrationCalculation;
  effectiveDate: string;
}

export interface Subscription {
  id: string;
  subNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  planId: string;
  planName: string;
  quotationId?: string;
  status: SubscriptionStatus;
  startDate: string;
  trialStartDate?: string;
  trialEndDate?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;
  billingInterval: BillingInterval;
  price: number;
  currency: string;
  autoRenew: boolean;
  cancellationRequestedAt?: string;
  effectiveCancellationDate?: string;
  cancellationReason?: string;
  cancellationType?: 'immediate' | 'end_of_period';
  pausedAt?: string;
  resumedAt?: string;
  commercialTerms: CommercialTerms;
  planHistory: PlanChangeHistory[];
  history: SubscriptionAuditEvent[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Valid allowed state transitions for subscriptions
 */
export const ALLOWED_SUBSCRIPTION_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  draft: ['trialing', 'active', 'canceled'],
  trialing: ['active', 'canceled', 'expired'],
  active: ['paused', 'past_due', 'canceled', 'expired'],
  paused: ['active', 'canceled'],
  past_due: ['active', 'canceled', 'expired'],
  canceled: [], // terminal state
  expired: [],  // terminal state
};

/**
 * Currency rounding helper
 */
export function roundToCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Format subscription sequence number: SUB-2026-081
 */
export function generateSubscriptionNumber(sequence: number): string {
  return `SUB-2026-${String(sequence).padStart(3, '0')}`;
}

/**
 * Generate a deterministic billing period key to enforce idempotency
 */
export function generateSubscriptionBillingPeriodKey(
  subscriptionId: string,
  billingInterval: BillingInterval,
  periodStart: Date | string
): string {
  const d = typeof periodStart === 'string' ? new Date(periodStart) : periodStart;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `sub-${subscriptionId}-${billingInterval}-${yyyy}${mm}${dd}`;
}

/**
 * Validate subscription state transitions
 */
export function validateSubscriptionTransition(
  currentStatus: SubscriptionStatus,
  targetStatus: SubscriptionStatus
): { allowed: boolean; reason?: string } {
  if (currentStatus === targetStatus) {
    return { allowed: true };
  }

  const allowed = ALLOWED_SUBSCRIPTION_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Invalid subscription transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: [${allowed.join(', ')}]`,
    };
  }

  return { allowed: true };
}

/**
 * Compute the end date for a billing period based on interval
 */
export function addBillingInterval(date: Date, interval: BillingInterval): Date {
  const result = new Date(date);
  if (interval === 'monthly') {
    result.setMonth(result.getMonth() + 1);
  } else if (interval === 'quarterly') {
    result.setMonth(result.getMonth() + 3);
  } else if (interval === 'annual') {
    result.setFullYear(result.getFullYear() + 1);
  }
  return result;
}

/**
 * Calculate proration when a customer upgrades or downgrades mid-cycle
 */
export function calculateProration(options: {
  currentPeriodStart: string | Date;
  currentPeriodEnd: string | Date;
  effectiveDate?: string | Date;
  oldPlanPrice: number;
  newPlanPrice: number;
  currency?: string;
}): ProrationCalculation {
  const start = new Date(options.currentPeriodStart);
  const end = new Date(options.currentPeriodEnd);
  const now = options.effectiveDate ? new Date(options.effectiveDate) : new Date();

  // Clamp effective date within the current billing period
  const effective = new Date(Math.max(start.getTime(), Math.min(end.getTime(), now.getTime())));

  const totalMs = Math.max(1, end.getTime() - start.getTime());
  const remainingMs = Math.max(0, end.getTime() - effective.getTime());

  const totalDays = Math.max(1, Math.round(totalMs / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, Math.round(remainingMs / (1000 * 60 * 60 * 24)));

  const unusedRatio = daysRemaining / totalDays;
  const unusedOldPlanCredit = roundToCents(options.oldPlanPrice * unusedRatio);
  const proratedNewPlanDebit = roundToCents(options.newPlanPrice * unusedRatio);
  const netAdjustment = roundToCents(proratedNewPlanDebit - unusedOldPlanCredit);

  return {
    periodStartDate: start.toISOString(),
    periodEndDate: end.toISOString(),
    effectiveDate: effective.toISOString(),
    totalDaysInPeriod: totalDays,
    daysRemaining,
    oldPlanPrice: roundToCents(options.oldPlanPrice),
    newPlanPrice: roundToCents(options.newPlanPrice),
    unusedOldPlanCredit,
    proratedNewPlanDebit,
    netAdjustment,
    currency: options.currency || 'USD',
  };
}

/**
 * Process a plan change (upgrade, downgrade, or lateral)
 */
export function processPlanChange(
  subscription: Subscription,
  newPlan: {
    id: string;
    name: string;
    price: number;
    billingInterval: BillingInterval;
    currency: string;
    features: string[];
  },
  actor: string = 'User'
): {
  subscription: Subscription;
  planChange: PlanChangeHistory;
  proration: ProrationCalculation;
} {
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    throw new Error(`Cannot change plan for subscription in '${subscription.status}' status. Only active or trialing subscriptions can change plans.`);
  }

  const changeType: 'upgrade' | 'downgrade' | 'lateral' =
    newPlan.price > subscription.price
      ? 'upgrade'
      : newPlan.price < subscription.price
      ? 'downgrade'
      : 'lateral';

  const proration = calculateProration({
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    oldPlanPrice: subscription.price,
    newPlanPrice: newPlan.price,
    currency: newPlan.currency || subscription.currency,
  });

  const planChange: PlanChangeHistory = {
    id: `pch-${Date.now()}`,
    changedAt: new Date().toISOString(),
    actor,
    previousPlanId: subscription.planId,
    previousPlanName: subscription.planName,
    previousPrice: subscription.price,
    newPlanId: newPlan.id,
    newPlanName: newPlan.name,
    newPrice: newPlan.price,
    changeType,
    proration,
    effectiveDate: proration.effectiveDate,
  };

  // Update subscription fields while preserving historical commercial terms in planHistory
  subscription.planId = newPlan.id;
  subscription.planName = newPlan.name;
  subscription.price = newPlan.price;
  subscription.billingInterval = newPlan.billingInterval;
  subscription.commercialTerms = {
    planId: newPlan.id,
    planName: newPlan.name,
    billingInterval: newPlan.billingInterval,
    unitPrice: newPlan.price,
    quantity: subscription.commercialTerms.quantity || 1,
    discountAmount: 0,
    currency: newPlan.currency || subscription.currency,
    features: newPlan.features || [],
  };
  subscription.planHistory = subscription.planHistory || [];
  subscription.planHistory.unshift(planChange);
  subscription.updatedAt = new Date().toISOString();

  // Record audit history
  subscription.history = subscription.history || [];
  subscription.history.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: `subscription_plan_${changeType}`,
    actor,
    description: `Subscription ${subscription.subNumber} ${changeType}d from ${planChange.previousPlanName} ($${planChange.previousPrice}) to ${newPlan.name} ($${newPlan.price}). Net proration adjustment: $${proration.netAdjustment}.`,
    details: { planChange, proration },
  });

  return { subscription, planChange, proration };
}

/**
 * Check if a subscription is due for renewal
 */
export function isSubscriptionDueForRenewal(
  subscription: Subscription,
  asOfDate: Date = new Date(),
  lookaheadDays: number = 0
): { eligible: boolean; reason?: string } {
  if (subscription.status !== 'active') {
    return { eligible: false, reason: `Subscription is in '${subscription.status}' status, not active.` };
  }
  if (!subscription.autoRenew) {
    return { eligible: false, reason: 'Subscription auto-renew is disabled.' };
  }

  const nextBilling = new Date(subscription.nextBillingDate);
  const threshold = new Date(asOfDate.getTime() + lookaheadDays * 24 * 60 * 60 * 1000);

  if (nextBilling.getTime() > threshold.getTime()) {
    return {
      eligible: false,
      reason: `Next billing date ${subscription.nextBillingDate.slice(0, 10)} is in the future.`,
    };
  }

  return { eligible: true };
}

/**
 * Advance subscription to next billing cycle upon successful renewal
 */
export function advanceSubscriptionBillingCycle(
  subscription: Subscription,
  actor: string = 'Billing Engine'
): { subscription: Subscription; previousPeriodEnd: string; newPeriodEnd: string } {
  const previousStart = subscription.currentPeriodStart;
  const previousEnd = subscription.currentPeriodEnd;

  const newStart = new Date(previousEnd);
  const newEnd = addBillingInterval(newStart, subscription.billingInterval);

  subscription.currentPeriodStart = newStart.toISOString();
  subscription.currentPeriodEnd = newEnd.toISOString();
  subscription.nextBillingDate = newEnd.toISOString();
  subscription.updatedAt = new Date().toISOString();

  subscription.history = subscription.history || [];
  subscription.history.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'subscription_renewed',
    actor,
    description: `Subscription ${subscription.subNumber} renewed for period ${newStart.toISOString().slice(0, 10)} to ${newEnd.toISOString().slice(0, 10)}.`,
    details: {
      previousStart,
      previousEnd,
      newStart: subscription.currentPeriodStart,
      newEnd: subscription.currentPeriodEnd,
    },
  });

  return {
    subscription,
    previousPeriodEnd: previousEnd,
    newPeriodEnd: subscription.currentPeriodEnd,
  };
}

/**
 * Process cancellation (either immediate or at end-of-period)
 */
export function processCancellation(
  subscription: Subscription,
  options: {
    type: 'immediate' | 'end_of_period';
    reason?: string;
    actor?: string;
  }
): Subscription {
  if (subscription.status === 'canceled') {
    throw new Error(`Subscription ${subscription.subNumber} is already canceled.`);
  }

  const now = new Date().toISOString();
  const actor = options.actor || 'User';

  subscription.cancellationRequestedAt = now;
  subscription.cancellationReason = options.reason || 'User requested cancellation';
  subscription.cancellationType = options.type;
  subscription.autoRenew = false;
  subscription.updatedAt = now;

  if (options.type === 'immediate') {
    subscription.status = 'canceled';
    subscription.effectiveCancellationDate = now;
  } else {
    // End of period: stays active until currentPeriodEnd
    subscription.effectiveCancellationDate = subscription.currentPeriodEnd;
  }

  subscription.history = subscription.history || [];
  subscription.history.unshift({
    id: `aud-${Date.now()}`,
    timestamp: now,
    type: 'subscription_canceled',
    actor,
    previousStatus: 'active',
    newStatus: subscription.status,
    description: `Subscription ${subscription.subNumber} ${
      options.type === 'immediate'
        ? 'canceled immediately'
        : `scheduled for cancellation on ${subscription.effectiveCancellationDate.slice(0, 10)}`
    }. Reason: ${subscription.cancellationReason}`,
    details: {
      cancellationType: options.type,
      effectiveDate: subscription.effectiveCancellationDate,
      reason: subscription.cancellationReason,
    },
  });

  return subscription;
}
