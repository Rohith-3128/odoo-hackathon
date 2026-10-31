/**
 * Brightloop Nexus - Billing API Routes
 * Team 3: Billing & Financial Engine
 *
 * Express router that adds all billing endpoints to the existing server.
 * Import and mount this in server.ts with: app.use(billingRoutes(DB));
 */

import { Router, Request, Response } from 'express';
import {
  TaxRule,
  DEFAULT_TAX_RULES,
  resolveApplicableTaxRules,
  calculateTax,
  toMinorUnits,
  toDisplayUnits,
} from './tax_config.js';

import {
  Discount,
  DEFAULT_DISCOUNTS,
  validateDiscount,
  recordDiscountUsage,
} from './discount_manager.js';

import {
  ExtendedInvoice,
  ExtendedInvoiceItem,
  Refund,
  ReconciliationResult,
  BillingCalculationInput,
  calculateBilling,
  generateInvoiceNumber,
  generatePaymentNumber,
  generateRefundNumber,
  generateReconciliationId,
  generateBillingPeriodKey,
} from './billing_engine.js';

// ─── Billing Database Collections ──────────────────────────────

export interface BillingDB {
  taxRules: TaxRule[];
  discounts: Discount[];
  refunds: Refund[];
  reconciliations: ReconciliationResult[];
}

export function createBillingDB(): BillingDB {
  return {
    taxRules: [...DEFAULT_TAX_RULES],
    discounts: [...DEFAULT_DISCOUNTS],
    refunds: [],
    reconciliations: [],
  };
}

/**
 * Create billing routes. Accepts the main app DB reference so we can
 * read/write invoices, payments, subscriptions, customers, etc.
 */
export function billingRoutes(DB: any, billingDB: BillingDB): Router {
  const router = Router();

  // Helper
  function logActivity(type: string, description: string, actor: string) {
    DB.activity.unshift({
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      description,
      actor,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // TAX RULES API
  // ─────────────────────────────────────────────────────────────

  /** List all tax rules */
  router.get('/api/billing/tax-rules', (_req: Request, res: Response) => {
    res.json(billingDB.taxRules);
  });

  /** Create a new tax rule */
  router.post('/api/billing/tax-rules', (req: Request, res: Response) => {
    const { name, type, rate, category, region, applicableTo, active } = req.body;
    if (!name || rate === undefined || !category) {
      return res.status(400).json({ error: 'name, rate, and category are required.' });
    }
    const rule: TaxRule = {
      id: `tax-${Date.now()}`,
      name,
      type: type || 'percentage',
      rate: Number(rate),
      category,
      region: region || '',
      applicableTo: applicableTo || ['all'],
      active: active !== false,
      createdAt: new Date().toISOString(),
    };
    billingDB.taxRules.push(rule);
    logActivity('tax_rule_created', `Tax rule "${name}" created.`, 'Finance');
    res.status(201).json(rule);
  });

  /** Toggle a tax rule active/inactive */
  router.put('/api/billing/tax-rules/:id/toggle', (req: Request, res: Response) => {
    const rule = billingDB.taxRules.find((r) => r.id === req.params.id);
    if (!rule) return res.status(404).json({ error: 'Tax rule not found' });
    rule.active = !rule.active;
    res.json(rule);
  });

  // ─────────────────────────────────────────────────────────────
  // DISCOUNT API
  // ─────────────────────────────────────────────────────────────

  /** List all discounts */
  router.get('/api/billing/discounts', (_req: Request, res: Response) => {
    res.json(billingDB.discounts);
  });

  /** Create a discount */
  router.post('/api/billing/discounts', (req: Request, res: Response) => {
    const {
      code, name, type, value, maxDiscountAmount, currency,
      validFrom, validUntil, maxUsages, eligiblePlanIds,
      eligibleCustomerIds, minOrderAmount,
    } = req.body;

    if (!code || !name || value === undefined) {
      return res.status(400).json({ error: 'code, name, and value are required.' });
    }

    // Check for duplicate code
    if (billingDB.discounts.some((d) => d.code.toUpperCase() === code.toUpperCase())) {
      return res.status(409).json({ error: 'Discount code already exists.' });
    }

    const discount: Discount = {
      id: `disc-${Date.now()}`,
      code: code.toUpperCase(),
      name,
      type: type || 'percentage',
      value: Number(value),
      maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
      currency: currency || 'USD',
      validFrom: validFrom || new Date().toISOString(),
      validUntil: validUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      maxUsages: Number(maxUsages) || 0,
      currentUsages: 0,
      eligiblePlanIds: eligiblePlanIds || ['all'],
      eligibleCustomerIds: eligibleCustomerIds || ['all'],
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
      active: true,
      createdAt: new Date().toISOString(),
    };
    billingDB.discounts.push(discount);
    logActivity('discount_created', `Discount "${code}" created.`, 'Finance');
    res.status(201).json(discount);
  });

  /** Validate a discount code (preview without applying) */
  router.post('/api/billing/discounts/validate', (req: Request, res: Response) => {
    const { code, subtotal, planId, customerId, currency } = req.body;
    if (!code || subtotal === undefined) {
      return res.status(400).json({ error: 'code and subtotal are required.' });
    }
    const result = validateDiscount(
      code, billingDB.discounts, Number(subtotal), planId, customerId, currency
    );
    res.json(result);
  });

  /** Deactivate a discount */
  router.put('/api/billing/discounts/:id/deactivate', (req: Request, res: Response) => {
    const disc = billingDB.discounts.find((d) => d.id === req.params.id);
    if (!disc) return res.status(404).json({ error: 'Discount not found' });
    disc.active = false;
    res.json(disc);
  });

  // ─────────────────────────────────────────────────────────────
  // BILLING CALCULATION PREVIEW
  // ─────────────────────────────────────────────────────────────

  /** Preview billing calculation without creating an invoice */
  router.post('/api/billing/calculate', (req: Request, res: Response) => {
    const { planId, quantity, discountCode, taxMode, customerId } = req.body;

    const plan = DB.plans.find((p: any) => p.id === planId);
    if (!plan) return res.status(400).json({ error: 'Plan not found' });

    const result = calculateBilling({
      planName: plan.name,
      planPrice: plan.price,
      quantity: quantity || 1,
      discountCode,
      allDiscounts: billingDB.discounts,
      taxRules: billingDB.taxRules,
      taxMode: taxMode || 'intra_state',
      planId: plan.id,
      customerId,
      currency: plan.currency,
    });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  });

  // ─────────────────────────────────────────────────────────────
  // ENHANCED INVOICE CREATION
  // ─────────────────────────────────────────────────────────────

  /** Create an invoice with full billing calculation (tax + discount) */
  router.post('/api/billing/invoices', (req: Request, res: Response) => {
    const {
      customerId, subscriptionId, planId, quantity,
      discountCode, taxMode, notes, dueDays, billingPeriodKey,
    } = req.body;

    // Validate customer
    const customer = DB.customers.find((c: any) => c.id === customerId);
    if (!customer) return res.status(400).json({ error: 'Customer not found' });

    // Validate plan
    const plan = DB.plans.find((p: any) => p.id === planId);
    if (!plan) return res.status(400).json({ error: 'Plan not found' });

    // Idempotency check: prevent duplicate invoices for same billing period
    if (billingPeriodKey) {
      const existing = DB.invoices.find(
        (inv: any) => inv.billingPeriodKey === billingPeriodKey
      );
      if (existing) {
        return res.status(409).json({
          error: 'Invoice already exists for this billing period.',
          existingInvoice: existing,
        });
      }
    }

    // Calculate billing
    const calcResult = calculateBilling({
      planName: plan.name,
      planPrice: plan.price,
      quantity: quantity || 1,
      discountCode,
      allDiscounts: billingDB.discounts,
      taxRules: billingDB.taxRules,
      taxMode: taxMode || 'intra_state',
      planId: plan.id,
      customerId,
      currency: plan.currency,
    });

    if (calcResult.error) {
      return res.status(400).json({ error: calcResult.error });
    }

    // Record discount usage
    if (calcResult.discountApplied) {
      recordDiscountUsage(calcResult.discountApplied);
    }

    const now = new Date();
    const dueDate = new Date(now.getTime() + (Number(dueDays) || 14) * 24 * 60 * 60 * 1000);

    const invoice: any = {
      id: `inv-${Date.now()}`,
      invoiceNumber: generateInvoiceNumber(),
      customerId: customer.id,
      customerName: customer.company || customer.name,
      subscriptionId: subscriptionId || undefined,
      items: calcResult.items,
      subtotal: calcResult.subtotal,
      totalDiscount: calcResult.totalDiscount,
      totalTax: calcResult.totalTax,
      total: calcResult.total,
      amountPaid: 0,
      amountDue: calcResult.total,
      currency: plan.currency || 'USD',
      status: 'unpaid',
      dueDate: dueDate.toISOString(),
      issueDate: now.toISOString(),
      notes: notes || '',
      taxMode: taxMode || 'intra_state',
      discountCode: discountCode || undefined,
      billingPeriodKey: billingPeriodKey || undefined,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    DB.invoices.unshift(invoice);
    logActivity(
      'invoice_created',
      `Invoice ${invoice.invoiceNumber} generated for ${customer.company || customer.name} — $${calcResult.total}.`,
      'Billing Engine'
    );

    res.status(201).json(invoice);
  });

  /** Get a single invoice by ID */
  router.get('/api/billing/invoices/:id', (req: Request, res: Response) => {
    const inv = DB.invoices.find((i: any) => i.id === req.params.id);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });

    const payments = DB.payments.filter((p: any) => p.invoiceId === inv.id);
    const refunds = billingDB.refunds.filter((r) => r.invoiceId === inv.id);

    res.json({ invoice: inv, payments, refunds });
  });

  /** Void an invoice (only if unpaid) */
  router.put('/api/billing/invoices/:id/void', (req: Request, res: Response) => {
    const inv = DB.invoices.find((i: any) => i.id === req.params.id);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });

    if (inv.status === 'paid' || inv.status === 'partially_paid') {
      return res.status(400).json({ error: 'Cannot void an invoice that has received payments. Issue a credit note or refund instead.' });
    }
    if (inv.status === 'void') {
      return res.status(400).json({ error: 'Invoice is already void.' });
    }

    inv.status = 'void';
    inv.amountDue = 0;
    inv.updatedAt = new Date().toISOString();
    logActivity('invoice_voided', `Invoice ${inv.invoiceNumber} voided.`, 'Finance');
    res.json(inv);
  });

  // ─────────────────────────────────────────────────────────────
  // ENHANCED PAYMENT WITH PARTIAL SUPPORT
  // ─────────────────────────────────────────────────────────────

  /** Record a payment (supports partial payments) */
  router.post('/api/billing/payments', (req: Request, res: Response) => {
    const { invoiceId, amount, method, isSimulated, transactionRef } = req.body;

    const inv = DB.invoices.find((i: any) => i.id === invoiceId);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });

    if (inv.status === 'void') {
      return res.status(400).json({ error: 'Cannot pay a voided invoice.' });
    }
    if (inv.status === 'paid') {
      return res.status(400).json({ error: 'Invoice is already fully paid.' });
    }

    const payAmount = amount ? Math.min(Number(amount), inv.amountDue) : inv.amountDue;
    if (payAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be positive.' });
    }

    // Check currency consistency
    const currency = inv.currency || 'USD';

    // Duplicate transaction ref check
    if (transactionRef) {
      const existingTxn = DB.payments.find((p: any) => p.transactionRef === transactionRef);
      if (existingTxn) {
        return res.status(409).json({
          error: 'Duplicate transaction reference detected.',
          existingPayment: existingTxn,
        });
      }
    }

    const now = new Date();
    const newPayment: any = {
      id: `pay-${Date.now()}`,
      paymentNumber: generatePaymentNumber(),
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerId: inv.customerId,
      customerName: inv.customerName,
      amount: payAmount,
      currency,
      method: method || 'card',
      status: 'succeeded',
      isSimulated: isSimulated === true,
      transactionRef: transactionRef || `sim_txn_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      createdAt: now.toISOString(),
    };

    // Update invoice
    inv.amountPaid = Math.round((inv.amountPaid + payAmount) * 100) / 100;
    inv.amountDue = Math.round((inv.total - inv.amountPaid) * 100) / 100;

    if (inv.amountDue <= 0) {
      inv.amountDue = 0;
      inv.status = 'paid';
      inv.paidAt = now.toISOString();
    } else {
      inv.status = 'partially_paid';
    }
    inv.updatedAt = now.toISOString();

    DB.payments.unshift(newPayment);
    logActivity(
      'payment_recorded',
      `Payment of $${payAmount} (${newPayment.paymentNumber}) recorded for ${inv.invoiceNumber}${isSimulated ? ' [Simulated]' : ''}.`,
      'Finance'
    );

    res.status(201).json({ invoice: inv, payment: newPayment });
  });

  /** List payments with optional filters */
  router.get('/api/billing/payments', (req: Request, res: Response) => {
    const { invoiceId, customerId, status } = req.query;
    let list = [...DB.payments];
    if (invoiceId && typeof invoiceId === 'string') list = list.filter((p: any) => p.invoiceId === invoiceId);
    if (customerId && typeof customerId === 'string') list = list.filter((p: any) => p.customerId === customerId);
    if (status && typeof status === 'string') list = list.filter((p: any) => p.status === status);
    res.json(list);
  });

  // ─────────────────────────────────────────────────────────────
  // REFUND MANAGEMENT
  // ─────────────────────────────────────────────────────────────

  /** Request a refund */
  router.post('/api/billing/refunds', (req: Request, res: Response) => {
    const { paymentId, amount, reason } = req.body;

    const payment = DB.payments.find((p: any) => p.id === paymentId);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    if (payment.status !== 'succeeded') {
      return res.status(400).json({ error: 'Can only refund succeeded payments.' });
    }

    // Calculate total already refunded for this payment
    const existingRefunds = billingDB.refunds.filter(
      (r) => r.paymentId === paymentId && (r.status === 'completed' || r.status === 'approved' || r.status === 'requested')
    );
    const totalRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0);
    const refundableAmount = Math.round((payment.amount - totalRefunded) * 100) / 100;

    const refundAmount = amount ? Math.min(Number(amount), refundableAmount) : refundableAmount;
    if (refundAmount <= 0) {
      return res.status(400).json({ error: 'No refundable amount remaining for this payment.' });
    }

    const refund: Refund = {
      id: `ref-${Date.now()}`,
      refundNumber: generateRefundNumber(),
      paymentId: payment.id,
      paymentNumber: payment.paymentNumber,
      invoiceId: payment.invoiceId,
      invoiceNumber: payment.invoiceNumber,
      customerId: payment.customerId,
      customerName: payment.customerName,
      amount: refundAmount,
      currency: payment.currency,
      reason: reason || 'Customer requested refund',
      status: 'requested',
      isSimulated: payment.isSimulated,
      requestedAt: new Date().toISOString(),
    };

    billingDB.refunds.push(refund);
    logActivity(
      'refund_requested',
      `Refund ${refund.refundNumber} of $${refundAmount} requested for ${payment.paymentNumber}.`,
      'Finance'
    );

    res.status(201).json(refund);
  });

  /** Approve a refund */
  router.put('/api/billing/refunds/:id/approve', (req: Request, res: Response) => {
    const refund = billingDB.refunds.find((r) => r.id === req.params.id);
    if (!refund) return res.status(404).json({ error: 'Refund not found' });
    if (refund.status !== 'requested') {
      return res.status(400).json({ error: `Cannot approve refund in status: ${refund.status}` });
    }
    refund.status = 'approved';
    logActivity('refund_approved', `Refund ${refund.refundNumber} approved.`, 'Finance');
    res.json(refund);
  });

  /** Complete a refund (simulate or confirm from provider) */
  router.put('/api/billing/refunds/:id/complete', (req: Request, res: Response) => {
    const refund = billingDB.refunds.find((r) => r.id === req.params.id);
    if (!refund) return res.status(404).json({ error: 'Refund not found' });
    if (refund.status !== 'approved') {
      return res.status(400).json({ error: `Cannot complete refund in status: ${refund.status}. Must be approved first.` });
    }

    refund.status = 'completed';
    refund.completedAt = new Date().toISOString();

    // Update payment status
    const payment = DB.payments.find((p: any) => p.id === refund.paymentId);
    if (payment) {
      const completedRefunds = billingDB.refunds.filter(
        (r) => r.paymentId === payment.id && r.status === 'completed'
      );
      const totalRefunded = completedRefunds.reduce((sum, r) => sum + r.amount, 0);
      if (totalRefunded >= payment.amount) {
        payment.status = 'refunded';
      } else {
        payment.status = 'partially_refunded';
      }
    }

    // Update invoice
    const inv = DB.invoices.find((i: any) => i.id === refund.invoiceId);
    if (inv) {
      inv.amountPaid = Math.round((inv.amountPaid - refund.amount) * 100) / 100;
      inv.amountDue = Math.round((inv.total - inv.amountPaid) * 100) / 100;
      if (inv.amountDue > 0 && inv.status === 'paid') {
        inv.status = 'unpaid';
      }
      inv.updatedAt = new Date().toISOString();
    }

    logActivity(
      'refund_completed',
      `Refund ${refund.refundNumber} of $${refund.amount} completed${refund.isSimulated ? ' [Simulated]' : ''}.`,
      'System'
    );

    res.json(refund);
  });

  /** Reject a refund */
  router.put('/api/billing/refunds/:id/reject', (req: Request, res: Response) => {
    const refund = billingDB.refunds.find((r) => r.id === req.params.id);
    if (!refund) return res.status(404).json({ error: 'Refund not found' });
    if (refund.status !== 'requested' && refund.status !== 'approved') {
      return res.status(400).json({ error: `Cannot reject refund in status: ${refund.status}` });
    }
    refund.status = 'rejected';
    logActivity('refund_rejected', `Refund ${refund.refundNumber} rejected.`, 'Finance');
    res.json(refund);
  });

  /** List refunds */
  router.get('/api/billing/refunds', (req: Request, res: Response) => {
    const { customerId, status } = req.query;
    let list = [...billingDB.refunds];
    if (customerId && typeof customerId === 'string') list = list.filter((r) => r.customerId === customerId);
    if (status && typeof status === 'string') list = list.filter((r) => r.status === status);
    res.json(list);
  });

  // ─────────────────────────────────────────────────────────────
  // RECURRING BILLING
  // ─────────────────────────────────────────────────────────────

  /**
   * Process recurring billing for all eligible subscriptions.
   * Uses billingPeriodKey for idempotent duplicate prevention.
   */
  router.post('/api/billing/recurring/run', (_req: Request, res: Response) => {
    const now = new Date();
    const results: any[] = [];
    const errors: any[] = [];

    const eligibleSubs = DB.subscriptions.filter((sub: any) => {
      if (sub.status !== 'active') return false;
      if (!sub.autoRenew) return false;
      const nextBilling = new Date(sub.nextBillingDate);
      return nextBilling <= now;
    });

    for (const sub of eligibleSubs) {
      try {
        const periodStart = new Date(sub.currentPeriodEnd);
        const billingPeriodKey = generateBillingPeriodKey(
          sub.id, sub.billingInterval, periodStart
        );

        // Idempotency: skip if invoice already exists
        const existingInv = DB.invoices.find(
          (inv: any) => inv.billingPeriodKey === billingPeriodKey
        );
        if (existingInv) {
          results.push({
            subscriptionId: sub.id,
            status: 'skipped',
            reason: 'Invoice already exists for this period',
            existingInvoiceNumber: existingInv.invoiceNumber,
          });
          continue;
        }

        // Find the plan
        const plan = DB.plans.find((p: any) => p.id === sub.planId);
        if (!plan) {
          errors.push({
            subscriptionId: sub.id,
            error: `Plan ${sub.planId} not found`,
          });
          continue;
        }

        // Calculate period end
        const periodEnd = new Date(periodStart);
        if (sub.billingInterval === 'monthly') {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        } else if (sub.billingInterval === 'quarterly') {
          periodEnd.setMonth(periodEnd.getMonth() + 3);
        } else if (sub.billingInterval === 'annual') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        }

        // Format period description
        const startStr = periodStart.toISOString().slice(0, 10);
        const endStr = periodEnd.toISOString().slice(0, 10);

        // Calculate billing with tax
        const calcResult = calculateBilling({
          planName: plan.name,
          planPrice: sub.price,
          quantity: 1,
          allDiscounts: billingDB.discounts,
          taxRules: billingDB.taxRules,
          taxMode: 'intra_state',
          planId: plan.id,
          customerId: sub.customerId,
          currency: plan.currency,
          periodDescription: `${plan.name} Subscription (${startStr} to ${endStr})`,
        });

        if (calcResult.error) {
          errors.push({ subscriptionId: sub.id, error: calcResult.error });
          continue;
        }

        const dueDate = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000);

        const invoice: any = {
          id: `inv-${Date.now()}-${sub.id}`,
          invoiceNumber: generateInvoiceNumber(),
          customerId: sub.customerId,
          customerName: sub.customerName,
          subscriptionId: sub.id,
          items: calcResult.items,
          subtotal: calcResult.subtotal,
          totalDiscount: calcResult.totalDiscount,
          totalTax: calcResult.totalTax,
          total: calcResult.total,
          amountPaid: 0,
          amountDue: calcResult.total,
          currency: plan.currency || 'USD',
          status: 'unpaid',
          dueDate: dueDate.toISOString(),
          issueDate: now.toISOString(),
          notes: `Auto-generated recurring billing for ${sub.subNumber}`,
          taxMode: 'intra_state',
          billingPeriodKey,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };

        DB.invoices.unshift(invoice);

        // Advance subscription billing dates
        sub.currentPeriodStart = periodStart.toISOString();
        sub.currentPeriodEnd = periodEnd.toISOString();
        sub.nextBillingDate = periodEnd.toISOString();

        logActivity(
          'recurring_billing',
          `Recurring invoice ${invoice.invoiceNumber} generated for ${sub.subNumber} ($${calcResult.total}).`,
          'Billing Engine'
        );

        results.push({
          subscriptionId: sub.id,
          subNumber: sub.subNumber,
          status: 'invoiced',
          invoiceNumber: invoice.invoiceNumber,
          amount: calcResult.total,
          billingPeriodKey,
        });
      } catch (err: any) {
        errors.push({
          subscriptionId: sub.id,
          error: err.message || 'Unknown error during billing',
        });
      }
    }

    logActivity(
      'recurring_billing_run',
      `Recurring billing run completed: ${results.length} processed, ${errors.length} errors.`,
      'System'
    );

    res.json({
      runAt: now.toISOString(),
      processed: results.length,
      errors: errors.length,
      results,
      errors: errors,
    });
  });

  /** Get recurring billing status (upcoming renewals) */
  router.get('/api/billing/recurring/upcoming', (_req: Request, res: Response) => {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const upcoming = DB.subscriptions
      .filter((sub: any) => {
        if (sub.status !== 'active') return false;
        const next = new Date(sub.nextBillingDate);
        return next >= now && next <= thirtyDays;
      })
      .map((sub: any) => ({
        subscriptionId: sub.id,
        subNumber: sub.subNumber,
        customerId: sub.customerId,
        customerName: sub.customerName,
        planName: sub.planName,
        price: sub.price,
        billingInterval: sub.billingInterval,
        nextBillingDate: sub.nextBillingDate,
        autoRenew: sub.autoRenew,
      }));

    res.json({ upcoming, count: upcoming.length });
  });

  // ─────────────────────────────────────────────────────────────
  // PAYMENT RECONCILIATION
  // ─────────────────────────────────────────────────────────────

  /** Run payment reconciliation */
  router.post('/api/billing/reconciliation/run', (_req: Request, res: Response) => {
    const now = new Date();

    const fullyPaidInvoices: string[] = [];
    const partiallyPaidInvoices: string[] = [];
    const overpayments: Array<{ invoiceId: string; excess: number }> = [];
    const underpayments: Array<{ invoiceId: string; shortfall: number }> = [];
    const unmatchedPayments: string[] = [];
    const duplicateTransactions: string[] = [];
    const currencyMismatches: string[] = [];
    const overdueInvoices: string[] = [];

    // Analyze invoices
    for (const inv of DB.invoices) {
      if (inv.status === 'void') continue;

      const invPayments = DB.payments.filter(
        (p: any) => p.invoiceId === inv.id && p.status === 'succeeded'
      );
      const totalPaid = invPayments.reduce((s: number, p: any) => s + p.amount, 0);

      // Check currency consistency
      for (const p of invPayments) {
        if (p.currency !== (inv.currency || 'USD')) {
          currencyMismatches.push(p.id);
        }
      }

      if (totalPaid >= inv.total && inv.total > 0) {
        fullyPaidInvoices.push(inv.id);
        if (totalPaid > inv.total) {
          overpayments.push({ invoiceId: inv.id, excess: Math.round((totalPaid - inv.total) * 100) / 100 });
        }
      } else if (totalPaid > 0 && totalPaid < inv.total) {
        partiallyPaidInvoices.push(inv.id);
        underpayments.push({ invoiceId: inv.id, shortfall: Math.round((inv.total - totalPaid) * 100) / 100 });
      }

      // Overdue check
      if ((inv.status === 'unpaid' || inv.status === 'overdue') && new Date(inv.dueDate) < now) {
        overdueInvoices.push(inv.id);
        // Auto-mark as overdue
        if (inv.status !== 'overdue') {
          inv.status = 'overdue';
          inv.updatedAt = now.toISOString();
        }
      }
    }

    // Find unmatched payments
    for (const p of DB.payments) {
      const inv = DB.invoices.find((i: any) => i.id === p.invoiceId);
      if (!inv) unmatchedPayments.push(p.id);
    }

    // Detect duplicate transaction refs
    const txnRefs = new Map<string, string[]>();
    for (const p of DB.payments) {
      if (!p.transactionRef) continue;
      const refs = txnRefs.get(p.transactionRef) || [];
      refs.push(p.id);
      txnRefs.set(p.transactionRef, refs);
    }
    for (const [, ids] of txnRefs) {
      if (ids.length > 1) duplicateTransactions.push(...ids);
    }

    const totalInvoiced = DB.invoices
      .filter((i: any) => i.status !== 'void')
      .reduce((s: number, i: any) => s + i.total, 0);
    const totalCollected = DB.payments
      .filter((p: any) => p.status === 'succeeded')
      .reduce((s: number, p: any) => s + p.amount, 0);
    const totalOutstanding = DB.invoices
      .filter((i: any) => i.status === 'unpaid' || i.status === 'overdue' || i.status === 'partially_paid')
      .reduce((s: number, i: any) => s + i.amountDue, 0);
    const totalOverdue = DB.invoices
      .filter((i: any) => i.status === 'overdue')
      .reduce((s: number, i: any) => s + i.amountDue, 0);
    const totalRefunded = billingDB.refunds
      .filter((r) => r.status === 'completed')
      .reduce((s, r) => s + r.amount, 0);

    const result: ReconciliationResult = {
      id: generateReconciliationId(),
      runAt: now.toISOString(),
      fullyPaidInvoices,
      partiallyPaidInvoices,
      overpayments,
      underpayments,
      unmatchedPayments,
      duplicateTransactions,
      currencyMismatches,
      overdueInvoices,
      summary: {
        totalInvoiced: Math.round(totalInvoiced * 100) / 100,
        totalCollected: Math.round(totalCollected * 100) / 100,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        totalOverdue: Math.round(totalOverdue * 100) / 100,
        totalRefunded: Math.round(totalRefunded * 100) / 100,
      },
    };

    billingDB.reconciliations.push(result);
    logActivity(
      'reconciliation_run',
      `Reconciliation completed: ${fullyPaidInvoices.length} fully paid, ${overdueInvoices.length} overdue, ${unmatchedPayments.length} unmatched.`,
      'System'
    );

    res.json(result);
  });

  /** Get reconciliation history */
  router.get('/api/billing/reconciliation', (_req: Request, res: Response) => {
    res.json(billingDB.reconciliations);
  });

  /** Get latest reconciliation */
  router.get('/api/billing/reconciliation/latest', (_req: Request, res: Response) => {
    const latest = billingDB.reconciliations[billingDB.reconciliations.length - 1];
    if (!latest) return res.status(404).json({ error: 'No reconciliation runs yet.' });
    res.json(latest);
  });

  // ─────────────────────────────────────────────────────────────
  // FINANCIAL REPORTS
  // ─────────────────────────────────────────────────────────────

  /**
   * Comprehensive financial summary.
   * All metrics are computed from real DB records, not hardcoded.
   */
  router.get('/api/billing/reports/summary', (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    const now = new Date();

    let invoices = [...DB.invoices];
    let payments = [...DB.payments];

    // Date filters
    if (startDate && typeof startDate === 'string') {
      const start = new Date(startDate);
      invoices = invoices.filter((i: any) => new Date(i.createdAt) >= start);
      payments = payments.filter((p: any) => new Date(p.createdAt) >= start);
    }
    if (endDate && typeof endDate === 'string') {
      const end = new Date(endDate);
      invoices = invoices.filter((i: any) => new Date(i.createdAt) <= end);
      payments = payments.filter((p: any) => new Date(p.createdAt) <= end);
    }

    // 1. Total invoiced (excluding void)
    const totalInvoiced = invoices
      .filter((i: any) => i.status !== 'void')
      .reduce((s: number, i: any) => s + (i.total || 0), 0);

    // 2. Total collected
    const totalCollected = payments
      .filter((p: any) => p.status === 'succeeded')
      .reduce((s: number, p: any) => s + (p.amount || 0), 0);

    // 3. Outstanding receivables
    const outstandingReceivables = invoices
      .filter((i: any) => ['unpaid', 'overdue', 'partially_paid'].includes(i.status))
      .reduce((s: number, i: any) => s + (i.amountDue || 0), 0);

    // 4. Overdue invoices
    const overdueInvoices = invoices.filter((i: any) => {
      if (i.status === 'paid' || i.status === 'void') return false;
      return new Date(i.dueDate) < now;
    });
    const overdueAmount = overdueInvoices.reduce((s: number, i: any) => s + (i.amountDue || 0), 0);

    // 5. Refund totals
    const totalRefunded = billingDB.refunds
      .filter((r) => r.status === 'completed')
      .reduce((s, r) => s + r.amount, 0);

    // 6. MRR / ARR from active subscriptions
    const activeSubs = DB.subscriptions.filter((s: any) => s.status === 'active');
    const mrr = activeSubs.reduce((acc: number, sub: any) => {
      if (sub.billingInterval === 'monthly') return acc + sub.price;
      if (sub.billingInterval === 'quarterly') return acc + sub.price / 3;
      if (sub.billingInterval === 'annual') return acc + sub.price / 12;
      return acc + sub.price;
    }, 0);
    const arr = mrr * 12;

    // 7. Revenue by plan
    const revenueByPlan: Record<string, { planName: string; invoiced: number; collected: number; count: number }> = {};
    for (const inv of invoices.filter((i: any) => i.status !== 'void')) {
      const sub = DB.subscriptions.find((s: any) => s.id === inv.subscriptionId);
      const planName = sub?.planName || 'One-time';
      if (!revenueByPlan[planName]) {
        revenueByPlan[planName] = { planName, invoiced: 0, collected: 0, count: 0 };
      }
      revenueByPlan[planName].invoiced += inv.total || 0;
      revenueByPlan[planName].count += 1;
    }
    for (const p of payments.filter((p: any) => p.status === 'succeeded')) {
      const inv = DB.invoices.find((i: any) => i.id === p.invoiceId);
      const sub = inv ? DB.subscriptions.find((s: any) => s.id === inv.subscriptionId) : null;
      const planName = sub?.planName || 'One-time';
      if (revenueByPlan[planName]) {
        revenueByPlan[planName].collected += p.amount || 0;
      }
    }

    // 8. Payment success/failure rates
    const totalPaymentAttempts = payments.length;
    const succeededPayments = payments.filter((p: any) => p.status === 'succeeded').length;
    const failedPayments = payments.filter((p: any) => p.status === 'failed').length;
    const paymentSuccessRate = totalPaymentAttempts > 0
      ? Math.round((succeededPayments / totalPaymentAttempts) * 10000) / 100
      : 100;
    const paymentFailureRate = totalPaymentAttempts > 0
      ? Math.round((failedPayments / totalPaymentAttempts) * 10000) / 100
      : 0;

    // 9. Monthly revenue trend (last 6 months)
    const monthlyRevenue: Array<{ month: string; invoiced: number; collected: number }> = [];
    for (let m = 5; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);

      const monthInvoiced = DB.invoices
        .filter((i: any) => i.status !== 'void' && new Date(i.createdAt) >= d && new Date(i.createdAt) < nextMonth)
        .reduce((s: number, i: any) => s + (i.total || 0), 0);

      const monthCollected = DB.payments
        .filter((p: any) => p.status === 'succeeded' && new Date(p.createdAt) >= d && new Date(p.createdAt) < nextMonth)
        .reduce((s: number, p: any) => s + (p.amount || 0), 0);

      monthlyRevenue.push({
        month: monthStr,
        invoiced: Math.round(monthInvoiced * 100) / 100,
        collected: Math.round(monthCollected * 100) / 100,
      });
    }

    // 10. Collection efficiency
    const collectionEfficiency = totalInvoiced > 0
      ? Math.round((totalCollected / totalInvoiced) * 10000) / 100
      : 100;

    res.json({
      totalInvoiced: Math.round(totalInvoiced * 100) / 100,
      totalCollected: Math.round(totalCollected * 100) / 100,
      outstandingReceivables: Math.round(outstandingReceivables * 100) / 100,
      overdueInvoicesCount: overdueInvoices.length,
      overdueAmount: Math.round(overdueAmount * 100) / 100,
      totalRefunded: Math.round(totalRefunded * 100) / 100,
      monthlyRecurringRevenue: Math.round(mrr * 100) / 100,
      annualRecurringRevenue: Math.round(arr * 100) / 100,
      revenueByPlan: Object.values(revenueByPlan),
      paymentSuccessRate,
      paymentFailureRate,
      totalPaymentAttempts,
      monthlyRevenue,
      collectionEfficiency,
      activeSubscriptions: activeSubs.length,
      totalInvoices: invoices.filter((i: any) => i.status !== 'void').length,
      totalPayments: succeededPayments,
      totalRefunds: billingDB.refunds.filter((r) => r.status === 'completed').length,
    });
  });

  /** Outstanding invoices report */
  router.get('/api/billing/reports/outstanding', (_req: Request, res: Response) => {
    const now = new Date();
    const outstanding = DB.invoices
      .filter((i: any) => ['unpaid', 'overdue', 'partially_paid'].includes(i.status))
      .map((i: any) => {
        const daysPastDue = Math.max(0, Math.floor((now.getTime() - new Date(i.dueDate).getTime()) / (24 * 60 * 60 * 1000)));
        return {
          invoiceNumber: i.invoiceNumber,
          customerId: i.customerId,
          customerName: i.customerName,
          total: i.total,
          amountPaid: i.amountPaid,
          amountDue: i.amountDue,
          dueDate: i.dueDate,
          status: i.status,
          daysPastDue,
          agingBucket: daysPastDue <= 0 ? 'Current' : daysPastDue <= 30 ? '1-30 days' : daysPastDue <= 60 ? '31-60 days' : daysPastDue <= 90 ? '61-90 days' : '90+ days',
        };
      });

    res.json({ outstanding, count: outstanding.length });
  });

  return router;
}
