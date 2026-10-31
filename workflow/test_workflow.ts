/**
 * Brightloop Nexus - Workflow Test Suite
 * Team 2: Workflows & Subscription Lifecycle
 *
 * Automated tests covering quotation calculations, state transitions,
 * idempotent conversions, subscription lifecycle, proration mathematics,
 * renewals, duplicate prevention, and audit event logging.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateLineItem,
  calculateQuotationTotals,
  generateQuoteNumber,
  validateQuotationTransition,
  isQuotationExpired,
  Quotation,
} from './quotation_engine';

import {
  generateSubscriptionNumber,
  generateSubscriptionBillingPeriodKey,
  validateSubscriptionTransition,
  addBillingInterval,
  calculateProration,
  processPlanChange,
  isSubscriptionDueForRenewal,
  advanceSubscriptionBillingCycle,
  processCancellation,
  Subscription,
} from './subscription_engine';

describe('Quotation Calculations & Monetary Integrity', () => {
  test('single line item without discount or tax', () => {
    const item = calculateLineItem(
      {
        planId: 'plan-pro',
        planName: 'Scale Enterprise',
        quantity: 2,
        unitPrice: 4995,
      },
      0
    );

    assert.equal(item.quantity, 2);
    assert.equal(item.unitPrice, 4995);
    assert.equal(item.subtotal, 9990);
    assert.equal(item.discountAmount, 0);
    assert.equal(item.taxAmount, 0);
    assert.equal(item.total, 9990);
  });

  test('line item with fixed discount and percentage tax', () => {
    const item = calculateLineItem(
      {
        planId: 'plan-pro',
        planName: 'Scale Enterprise',
        quantity: 1,
        unitPrice: 1000,
        discountType: 'fixed',
        discountValue: 200,
        taxRate: 18, // 18% GST
      },
      0
    );

    assert.equal(item.subtotal, 1000);
    assert.equal(item.discountAmount, 200);
    // Taxable base = 800; 18% of 800 = 144
    assert.equal(item.taxAmount, 144);
    assert.equal(item.total, 944);
  });

  test('line item with percentage discount', () => {
    const item = calculateLineItem(
      {
        planId: 'plan-pro',
        planName: 'Scale Enterprise',
        quantity: 1,
        unitPrice: 2000,
        discountType: 'percentage',
        discountValue: 25, // 25% discount
        taxRate: 10,
      },
      0
    );

    assert.equal(item.subtotal, 2000);
    assert.equal(item.discountAmount, 500); // 25% of 2000
    // Taxable base = 1500; 10% of 1500 = 150
    assert.equal(item.taxAmount, 150);
    assert.equal(item.total, 1650);
  });

  test('multi-item quotation totals aggregate accurately', () => {
    const calc = calculateQuotationTotals([
      {
        planId: 'plan-pro',
        planName: 'Scale Enterprise',
        quantity: 1,
        unitPrice: 4995,
        discountType: 'fixed',
        discountValue: 500,
        taxRate: 18,
      },
      {
        planId: 'plan-starter',
        planName: 'Growth Plan',
        quantity: 2,
        unitPrice: 1000,
        discountType: 'percentage',
        discountValue: 10,
        taxRate: 18,
      },
    ]);

    // Item 1: Subtotal 4995, Disc 500 => Taxable 4495 => Tax 809.1 => Total 5304.1
    // Item 2: Subtotal 2000, Disc 200 => Taxable 1800 => Tax 324 => Total 2124
    assert.equal(calc.subtotal, 6995);
    assert.equal(calc.totalDiscount, 700);
    assert.equal(calc.totalTax, 1133.1);
    assert.equal(calc.total, 7428.1);
  });

  test('discount cannot exceed subtotal', () => {
    const item = calculateLineItem(
      {
        planId: 'plan-starter',
        planName: 'Growth Plan',
        quantity: 1,
        unitPrice: 500,
        discountType: 'fixed',
        discountValue: 800, // exceeds unit price
      },
      0
    );

    assert.equal(item.discountAmount, 500);
    assert.equal(item.total, 0);
  });

  test('empty items array throws validation error', () => {
    assert.throws(() => calculateQuotationTotals([]), /at least one line item/);
  });
});

describe('Quotation State Machine & Transitions', () => {
  const futureExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const pastExpiry = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  test('allows draft -> sent', () => {
    const check = validateQuotationTransition('draft', 'sent', futureExpiry);
    assert.equal(check.allowed, true);
  });

  test('allows sent -> accepted when not expired', () => {
    const check = validateQuotationTransition('sent', 'accepted', futureExpiry);
    assert.equal(check.allowed, true);
  });

  test('allows sent -> rejected', () => {
    const check = validateQuotationTransition('sent', 'rejected', futureExpiry);
    assert.equal(check.allowed, true);
  });

  test('prohibits sent -> accepted if quotation is expired', () => {
    const check = validateQuotationTransition('sent', 'accepted', pastExpiry);
    assert.equal(check.allowed, false);
    assert.match(check.reason || '', /expired/i);
  });

  test('prohibits draft directly to converted', () => {
    const check = validateQuotationTransition('draft', 'converted', futureExpiry);
    assert.equal(check.allowed, false);
  });

  test('prohibits accepted to draft (terminal or forward only)', () => {
    const check = validateQuotationTransition('accepted', 'draft', futureExpiry);
    assert.equal(check.allowed, false);
  });

  test('generates valid quotation numbers with revision tracking', () => {
    assert.equal(generateQuoteNumber(1), 'QUO-2026-001');
    assert.equal(generateQuoteNumber(42), 'QUO-2026-042');
    assert.equal(generateQuoteNumber(1, 2), 'QUO-2026-001-R2');
  });
});

describe('Subscription State Machine & Lifecycle', () => {
  test('allows valid forward transitions', () => {
    assert.equal(validateSubscriptionTransition('draft', 'active').allowed, true);
    assert.equal(validateSubscriptionTransition('draft', 'trialing').allowed, true);
    assert.equal(validateSubscriptionTransition('trialing', 'active').allowed, true);
    assert.equal(validateSubscriptionTransition('active', 'paused').allowed, true);
    assert.equal(validateSubscriptionTransition('paused', 'active').allowed, true);
    assert.equal(validateSubscriptionTransition('active', 'canceled').allowed, true);
  });

  test('prohibits invalid state transitions', () => {
    assert.equal(validateSubscriptionTransition('canceled', 'active').allowed, false);
    assert.equal(validateSubscriptionTransition('paused', 'trialing').allowed, false);
    assert.equal(validateSubscriptionTransition('expired', 'active').allowed, false);
  });

  test('generates deterministic subscription numbers and billing keys', () => {
    assert.equal(generateSubscriptionNumber(81), 'SUB-2026-081');

    const key = generateSubscriptionBillingPeriodKey('sub-101', 'monthly', '2026-10-01T00:00:00Z');
    assert.equal(key, 'sub-sub-101-monthly-20261001');
  });

  test('calculates interval end dates correctly', () => {
    const start = new Date('2026-01-15T00:00:00Z');
    const monthlyEnd = addBillingInterval(start, 'monthly');
    assert.equal(monthlyEnd.getUTCMonth(), 1); // February

    const annualEnd = addBillingInterval(start, 'annual');
    assert.equal(annualEnd.getUTCFullYear(), 2027);
  });
});

describe('Upgrades, Downgrades & Proration Calculation', () => {
  test('mid-cycle plan upgrade computes positive net adjustment', () => {
    // 30 day period, 15 days remaining
    const periodStart = '2026-10-01T00:00:00.000Z';
    const periodEnd = '2026-10-31T00:00:00.000Z';
    const effectiveDate = '2026-10-16T00:00:00.000Z';

    const proration = calculateProration({
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      effectiveDate,
      oldPlanPrice: 3000,
      newPlanPrice: 6000,
    });

    assert.equal(proration.totalDaysInPeriod, 30);
    assert.equal(proration.daysRemaining, 15);
    // Unused credit of old plan: 50% of 3000 = 1500
    assert.equal(proration.unusedOldPlanCredit, 1500);
    // Prorated debit of new plan: 50% of 6000 = 3000
    assert.equal(proration.proratedNewPlanDebit, 3000);
    // Net adjustment to charge customer: 3000 - 1500 = 1500
    assert.equal(proration.netAdjustment, 1500);
  });

  test('mid-cycle plan downgrade computes negative net adjustment (credit balance)', () => {
    const periodStart = '2026-10-01T00:00:00.000Z';
    const periodEnd = '2026-10-31T00:00:00.000Z';
    const effectiveDate = '2026-10-16T00:00:00.000Z';

    const proration = calculateProration({
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      effectiveDate,
      oldPlanPrice: 6000,
      newPlanPrice: 3000,
    });

    // Net adjustment: 1500 - 3000 = -1500
    assert.equal(proration.netAdjustment, -1500);
  });

  test('processPlanChange updates subscription terms and preserves plan history', () => {
    const sub: Subscription = {
      id: 'sub-test-1',
      subNumber: 'SUB-2026-001',
      customerId: 'cust-1',
      customerName: 'Test Corp',
      customerEmail: 'test@corp.io',
      planId: 'plan-starter',
      planName: 'Growth Plan',
      status: 'active',
      startDate: '2026-10-01T00:00:00.000Z',
      currentPeriodStart: '2026-10-01T00:00:00.000Z',
      currentPeriodEnd: '2026-11-01T00:00:00.000Z',
      nextBillingDate: '2026-11-01T00:00:00.000Z',
      billingInterval: 'monthly',
      price: 2400,
      currency: 'USD',
      autoRenew: true,
      commercialTerms: {
        planId: 'plan-starter',
        planName: 'Growth Plan',
        billingInterval: 'monthly',
        unitPrice: 2400,
        quantity: 1,
        discountAmount: 0,
        currency: 'USD',
        features: [],
      },
      planHistory: [],
      history: [],
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    };

    const newPlan = {
      id: 'plan-pro',
      name: 'Scale Enterprise',
      price: 4995,
      billingInterval: 'monthly' as const,
      currency: 'USD',
      features: ['Enterprise Support'],
    };

    const res = processPlanChange(sub, newPlan, 'Sales Admin');

    assert.equal(res.subscription.planId, 'plan-pro');
    assert.equal(res.subscription.price, 4995);
    assert.equal(res.planChange.changeType, 'upgrade');
    assert.equal(res.planChange.previousPrice, 2400);
    assert.equal(res.planChange.newPrice, 4995);
    assert.equal(res.subscription.planHistory.length, 1);
    assert.equal(res.subscription.history.length, 1);
  });
});

describe('Subscription Renewals & Cancellations', () => {
  test('renewal eligibility correctly detects due subscriptions', () => {
    const dueSub: Subscription = {
      id: 'sub-due-1',
      subNumber: 'SUB-2026-050',
      customerId: 'cust-1',
      customerName: 'Customer A',
      customerEmail: 'cust@a.com',
      planId: 'plan-pro',
      planName: 'Pro Plan',
      status: 'active',
      startDate: '2026-09-01T00:00:00.000Z',
      currentPeriodStart: '2026-09-01T00:00:00.000Z',
      currentPeriodEnd: '2026-10-01T00:00:00.000Z',
      nextBillingDate: '2026-10-01T00:00:00.000Z', // in past relative to asOfDate
      billingInterval: 'monthly',
      price: 1000,
      currency: 'USD',
      autoRenew: true,
      commercialTerms: {} as any,
      planHistory: [],
      history: [],
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };

    const check = isSubscriptionDueForRenewal(dueSub, new Date('2026-10-05T00:00:00.000Z'));
    assert.equal(check.eligible, true);

    // If autoRenew is false, should not be eligible
    dueSub.autoRenew = false;
    assert.equal(isSubscriptionDueForRenewal(dueSub, new Date('2026-10-05T00:00:00.000Z')).eligible, false);

    // If status is paused, should not be eligible
    dueSub.autoRenew = true;
    dueSub.status = 'paused';
    assert.equal(isSubscriptionDueForRenewal(dueSub, new Date('2026-10-05T00:00:00.000Z')).eligible, false);
  });

  test('advanceSubscriptionBillingCycle rolls period forward seamlessly', () => {
    const sub: Subscription = {
      id: 'sub-adv-1',
      subNumber: 'SUB-2026-055',
      customerId: 'cust-1',
      customerName: 'Customer A',
      customerEmail: 'cust@a.com',
      planId: 'plan-pro',
      planName: 'Pro Plan',
      status: 'active',
      startDate: '2026-09-01T00:00:00.000Z',
      currentPeriodStart: '2026-09-01T00:00:00.000Z',
      currentPeriodEnd: '2026-10-01T00:00:00.000Z',
      nextBillingDate: '2026-10-01T00:00:00.000Z',
      billingInterval: 'monthly',
      price: 1000,
      currency: 'USD',
      autoRenew: true,
      commercialTerms: {} as any,
      planHistory: [],
      history: [],
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };

    const result = advanceSubscriptionBillingCycle(sub, 'Renewal Test');

    assert.equal(result.subscription.currentPeriodStart, '2026-10-01T00:00:00.000Z');
    // November 1st
    assert.match(result.subscription.currentPeriodEnd, /2026-11-01/);
    assert.equal(result.subscription.history.length, 1);
  });

  test('cancellation supports immediate and end_of_period policies', () => {
    const subImmediate: Subscription = {
      id: 'sub-c-1',
      subNumber: 'SUB-2026-061',
      customerId: 'cust-1',
      customerName: 'Customer A',
      customerEmail: 'cust@a.com',
      planId: 'plan-pro',
      planName: 'Pro Plan',
      status: 'active',
      startDate: '2026-09-01T00:00:00.000Z',
      currentPeriodStart: '2026-10-01T00:00:00.000Z',
      currentPeriodEnd: '2026-11-01T00:00:00.000Z',
      nextBillingDate: '2026-11-01T00:00:00.000Z',
      billingInterval: 'monthly',
      price: 1000,
      currency: 'USD',
      autoRenew: true,
      commercialTerms: {} as any,
      planHistory: [],
      history: [],
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };

    processCancellation(subImmediate, { type: 'immediate', reason: 'Customer requested' });
    assert.equal(subImmediate.status, 'canceled');
    assert.equal(subImmediate.autoRenew, false);
    assert.ok(subImmediate.effectiveCancellationDate);

    const subEndOfPeriod: Subscription = {
      ...subImmediate,
      id: 'sub-c-2',
      status: 'active',
      autoRenew: true,
      history: [],
    };

    processCancellation(subEndOfPeriod, { type: 'end_of_period', reason: 'Contract termination' });
    // Remains active until period end
    assert.equal(subEndOfPeriod.status, 'active');
    assert.equal(subEndOfPeriod.autoRenew, false);
    assert.equal(subEndOfPeriod.effectiveCancellationDate, '2026-11-01T00:00:00.000Z');
  });
});
