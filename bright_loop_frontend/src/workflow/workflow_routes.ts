/**
 * Brightloop Nexus - Quotation & Subscription Lifecycle API Routes
 * Team 2: Workflows & Subscription Lifecycle
 *
 * Exposes production RESTful endpoints for managing quotations,
 * revisions, state transitions, subscriptions, trials, proration,
 * renewals, cancellations, and billing module coordination.
 */

import { Router, Request, Response } from 'express';
import {
  Quotation,
  QuotationLineItemInput,
  calculateQuotationTotals,
  generateQuoteNumber,
  validateQuotationTransition,
  isQuotationExpired,
} from './quotation_engine';

import {
  Subscription,
  SubscriptionAuditEvent,
  generateSubscriptionNumber,
  generateSubscriptionBillingPeriodKey,
  validateSubscriptionTransition,
  addBillingInterval,
  calculateProration,
  processPlanChange,
  isSubscriptionDueForRenewal,
  advanceSubscriptionBillingCycle,
  processCancellation,
  BillingInterval,
} from './subscription_engine';

export function workflowRoutes(DB: any, billingDB?: any): Router {
  const router = Router();

  function logActivity(type: string, description: string, actor: string = 'Workflow Engine') {
    DB.activity = DB.activity || [];
    DB.activity.unshift({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      type,
      description,
      actor,
    });
  }

  // Ensure subscription history arrays exist on seeded subscriptions
  if (Array.isArray(DB.subscriptions)) {
    DB.subscriptions.forEach((sub: any) => {
      if (!sub.history) {
        sub.history = [
          {
            id: `aud-${sub.id}-init`,
            timestamp: sub.createdAt || new Date().toISOString(),
            type: 'subscription_created',
            actor: 'System',
            previousStatus: 'draft',
            newStatus: sub.status || 'active',
            description: `Subscription ${sub.subNumber} initialized with ${sub.planName}.`,
          },
        ];
      }
      if (!sub.commercialTerms) {
        sub.commercialTerms = {
          planId: sub.planId,
          planName: sub.planName,
          billingInterval: sub.billingInterval || 'monthly',
          unitPrice: sub.price,
          quantity: 1,
          discountAmount: 0,
          currency: 'USD',
          features: [],
        };
      }
      if (!sub.planHistory) {
        sub.planHistory = [];
      }
    });
  }

  // Auto-expire check helper for quotations
  function checkAndExpireQuotations() {
    const now = new Date();
    DB.quotations.forEach((quote: Quotation) => {
      if (quote.status === 'draft' || quote.status === 'sent') {
        if (new Date(quote.expiresAt).getTime() < now.getTime()) {
          quote.status = 'expired';
          quote.expiredAt = now.toISOString();
          quote.updatedAt = now.toISOString();
        }
      }
    });
  }

  // =========================================================================
  // 1. QUOTATION MANAGEMENT ENDPOINTS
  // =========================================================================

  /**
   * List quotations with filtering, search, and pagination
   * GET /api/quotations
   */
  router.get('/api/quotations', (req: Request, res: Response) => {
    checkAndExpireQuotations();

    const { status, customerId, search, page, limit } = req.query;
    let list: Quotation[] = [...DB.quotations];

    if (status && typeof status === 'string' && status !== 'all') {
      list = list.filter((q) => q.status === status);
    }

    if (customerId && typeof customerId === 'string') {
      list = list.filter((q) => q.customerId === customerId);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      list = list.filter(
        (quote) =>
          quote.quoteNumber.toLowerCase().includes(q) ||
          quote.customerName.toLowerCase().includes(q) ||
          (quote.notes && quote.notes.toLowerCase().includes(q))
      );
    }

    const total = list.length;
    if (req.query.page || req.query.limit || req.query.paginated === 'true') {
      const pageNum = Math.max(1, parseInt(req.query.page as string) || 1);
      const limitNum = Math.max(1, parseInt(req.query.limit as string) || 50);
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedList = list.slice(startIndex, startIndex + limitNum);

      return res.json({
        quotations: paginatedList,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    }

    res.json(list);
  });

  /**
   * Get single quotation with details
   * GET /api/quotations/:id
   */
  router.get('/api/quotations/:id', (req: Request, res: Response) => {
    checkAndExpireQuotations();

    const quote = DB.quotations.find((q: Quotation) => q.id === req.params.id);
    if (!quote) {
      return res.status(404).json({ error: 'Quotation not found.' });
    }

    const customer = DB.customers.find((c: any) => c.id === quote.customerId);
    const linkedSubscription = quote.convertedSubscriptionId
      ? DB.subscriptions.find((s: any) => s.id === quote.convertedSubscriptionId)
      : undefined;

    res.json({
      quotation: quote,
      customer,
      subscription: linkedSubscription,
    });
  });

  /**
   * Create a new quotation
   * POST /api/quotations
   */
  router.post('/api/quotations', (req: Request, res: Response) => {
    const {
      customerId,
      items,
      planId,
      quantity,
      discount,
      discountType,
      taxRate,
      notes,
      termsAndConditions,
      expiresDays,
      sendNow,
      createdBy,
    } = req.body;

    // Validate customer
    const customer = DB.customers.find((c: any) => c.id === customerId);
    if (!customer) {
      return res.status(400).json({ error: 'Customer not found or invalid customerId.' });
    }

    // Build line items
    let lineItemInputs: QuotationLineItemInput[] = [];

    if (Array.isArray(items) && items.length > 0) {
      lineItemInputs = items.map((it: any) => {
        const plan = DB.plans.find((p: any) => p.id === it.planId);
        return {
          productId: it.productId || (plan ? plan.productId : 'prod-1'),
          productName: it.productName || (plan ? plan.name : 'Service Plan'),
          planId: it.planId,
          planName: it.planName || (plan ? plan.name : 'Plan'),
          quantity: it.quantity || 1,
          unitPrice: it.unitPrice !== undefined ? it.unitPrice : (plan ? plan.price : 0),
          discountType: it.discountType || 'fixed',
          discountValue: it.discountValue !== undefined ? it.discountValue : (it.discount || 0),
          taxRate: it.taxRate !== undefined ? it.taxRate : 0,
        };
      });
    } else if (planId) {
      const plan = DB.plans.find((p: any) => p.id === planId);
      if (!plan) {
        return res.status(400).json({ error: 'Selected plan not found in plan catalogue.' });
      }
      lineItemInputs = [
        {
          productId: plan.productId || 'prod-1',
          productName: plan.name,
          planId: plan.id,
          planName: plan.name,
          quantity: quantity || 1,
          unitPrice: plan.price,
          discountType: discountType || 'fixed',
          discountValue: discount || 0,
          taxRate: taxRate || 0,
        },
      ];
    } else {
      return res.status(400).json({ error: 'Quotation requires at least one plan or line item.' });
    }

    try {
      const calculated = calculateQuotationTotals(lineItemInputs);

      const now = new Date();
      const expiry = new Date(now);
      expiry.setDate(expiry.getDate() + (Number(expiresDays) || 14));

      const initialStatus = sendNow ? 'sent' : 'draft';

      const newQuote: Quotation = {
        id: `quote-${Date.now()}`,
        quoteNumber: generateQuoteNumber(DB.quotations.length + 1),
        revisionNumber: 1,
        customerId: customer.id,
        customerName: customer.company || customer.name,
        customerEmail: customer.email || '',
        items: calculated.items,
        subtotal: calculated.subtotal,
        totalDiscount: calculated.totalDiscount,
        totalTax: calculated.totalTax,
        total: calculated.total,
        currency: 'USD',
        status: initialStatus,
        expiresAt: expiry.toISOString(),
        notes: notes || 'Proposal terms based on Brightloop Nexus subscription catalogue.',
        termsAndConditions: termsAndConditions || 'Payment terms: Due upon receipt. Subject to Brightloop Master Services Agreement.',
        createdBy: createdBy || 'Sales User',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        sentAt: sendNow ? now.toISOString() : undefined,
        deliveryStatus: sendNow ? 'delivered' : undefined,
        revisions: [],
      };

      DB.quotations.unshift(newQuote);

      logActivity(
        'quotation_created',
        `Quotation ${newQuote.quoteNumber} created for ${customer.company} in '${initialStatus}' status ($${calculated.total}).`,
        createdBy || 'Sales User'
      );

      res.status(201).json(newQuote);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create quotation.' });
    }
  });

  /**
   * Update quotation (allowed in draft status)
   * PUT /api/quotations/:id
   */
  router.put('/api/quotations/:id', (req: Request, res: Response) => {
    const quote = DB.quotations.find((q: Quotation) => q.id === req.params.id);
    if (!quote) return res.status(404).json({ error: 'Quotation not found.' });

    if (quote.status !== 'draft') {
      return res.status(400).json({
        error: `Cannot modify quotation in '${quote.status}' status. Only draft quotations can be edited directly. For other states, use /revise.`,
      });
    }

    const { items, notes, termsAndConditions, expiresDays, expiresAt } = req.body;

    if (Array.isArray(items) && items.length > 0) {
      const lineItemInputs: QuotationLineItemInput[] = items.map((it: any) => {
        const plan = DB.plans.find((p: any) => p.id === it.planId);
        return {
          productId: it.productId || (plan ? plan.productId : 'prod-1'),
          productName: it.productName || (plan ? plan.name : 'Service Plan'),
          planId: it.planId,
          planName: it.planName || (plan ? plan.name : 'Plan'),
          quantity: it.quantity || 1,
          unitPrice: it.unitPrice !== undefined ? it.unitPrice : (plan ? plan.price : 0),
          discountType: it.discountType || 'fixed',
          discountValue: it.discountValue !== undefined ? it.discountValue : 0,
          taxRate: it.taxRate !== undefined ? it.taxRate : 0,
        };
      });

      const calculated = calculateQuotationTotals(lineItemInputs);
      quote.items = calculated.items;
      quote.subtotal = calculated.subtotal;
      quote.totalDiscount = calculated.totalDiscount;
      quote.totalTax = calculated.totalTax;
      quote.total = calculated.total;
    }

    if (notes !== undefined) quote.notes = notes;
    if (termsAndConditions !== undefined) quote.termsAndConditions = termsAndConditions;
    if (expiresAt) {
      quote.expiresAt = new Date(expiresAt).toISOString();
    } else if (expiresDays) {
      const exp = new Date(quote.createdAt);
      exp.setDate(exp.getDate() + Number(expiresDays));
      quote.expiresAt = exp.toISOString();
    }

    quote.updatedAt = new Date().toISOString();
    logActivity('quotation_updated', `Draft quotation ${quote.quoteNumber} updated.`, 'Sales User');
    res.json(quote);
  });

  /**
   * Send quotation to customer
   * POST /api/quotations/:id/send
   */
  router.post('/api/quotations/:id/send', (req: Request, res: Response) => {
    const quote = DB.quotations.find((q: Quotation) => q.id === req.params.id);
    if (!quote) return res.status(404).json({ error: 'Quotation not found.' });

    const transition = validateQuotationTransition(quote.status, 'sent', quote.expiresAt);
    if (!transition.allowed) {
      return res.status(400).json({ error: transition.reason });
    }

    const now = new Date().toISOString();
    quote.status = 'sent';
    quote.sentAt = now;
    quote.deliveryStatus = 'delivered'; // Honest delivery simulation
    quote.updatedAt = now;

    logActivity(
      'quotation_sent',
      `Quotation ${quote.quoteNumber} formally dispatched to ${quote.customerName} (${quote.customerEmail}).`,
      req.body.actor || 'Sales'
    );

    res.json(quote);
  });

  const handleAcceptQuote = (req: Request, res: Response) => {
    const quote = DB.quotations.find((q: Quotation) => q.id === req.params.id);
    if (!quote) return res.status(404).json({ error: 'Quotation not found.' });

    const transition = validateQuotationTransition(quote.status, 'accepted', quote.expiresAt);
    if (!transition.allowed) {
      return res.status(400).json({ error: transition.reason });
    }

    const now = new Date().toISOString();
    quote.status = 'accepted';
    quote.acceptedAt = now;
    quote.updatedAt = now;

    logActivity(
      'quotation_accepted',
      `Quotation ${quote.quoteNumber} accepted by customer ${quote.customerName}.`,
      req.body.actor || 'Customer'
    );

    res.json(quote);
  };

  router.post('/api/quotations/:id/accept', handleAcceptQuote);
  router.put('/api/quotations/:id/accept', handleAcceptQuote);

  /**
   * Customer or sales user rejects quotation
   * POST /api/quotations/:id/reject
   */
  router.post('/api/quotations/:id/reject', (req: Request, res: Response) => {
    const quote = DB.quotations.find((q: Quotation) => q.id === req.params.id);
    if (!quote) return res.status(404).json({ error: 'Quotation not found.' });

    const transition = validateQuotationTransition(quote.status, 'rejected', quote.expiresAt);
    if (!transition.allowed) {
      return res.status(400).json({ error: transition.reason });
    }

    const now = new Date().toISOString();
    quote.status = 'rejected';
    quote.rejectedAt = now;
    quote.rejectionReason = req.body.reason || 'Customer declined proposal terms.';
    quote.updatedAt = now;

    logActivity(
      'quotation_rejected',
      `Quotation ${quote.quoteNumber} rejected: ${quote.rejectionReason}`,
      req.body.actor || 'Customer'
    );

    res.json(quote);
  });

  /**
   * Mark quotation expired
   * POST /api/quotations/:id/expire
   */
  router.post('/api/quotations/:id/expire', (req: Request, res: Response) => {
    const quote = DB.quotations.find((q: Quotation) => q.id === req.params.id);
    if (!quote) return res.status(404).json({ error: 'Quotation not found.' });

    if (quote.status === 'accepted' || quote.status === 'converted') {
      return res.status(400).json({ error: `Cannot expire a quotation in '${quote.status}' status.` });
    }

    const now = new Date().toISOString();
    quote.status = 'expired';
    quote.expiredAt = now;
    quote.updatedAt = now;

    logActivity('quotation_expired', `Quotation ${quote.quoteNumber} marked as expired.`, 'System');
    res.json(quote);
  });

  /**
   * Revise a quotation (creates revision R2, R3... allows renegotiating expired or rejected quotes)
   * POST /api/quotations/:id/revise
   */
  router.post('/api/quotations/:id/revise', (req: Request, res: Response) => {
    const originalQuote = DB.quotations.find((q: Quotation) => q.id === req.params.id);
    if (!originalQuote) return res.status(404).json({ error: 'Quotation not found.' });

    if (originalQuote.status === 'converted') {
      return res.status(400).json({ error: 'Cannot revise a quotation that has already been converted into a subscription.' });
    }

    const { items, discount, notes, expiresDays, reason, actor } = req.body;
    const now = new Date();
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + (Number(expiresDays) || 14));

    const newRevisionNumber = (originalQuote.revisionNumber || 1) + 1;

    let lineItems = originalQuote.items;
    if (Array.isArray(items) && items.length > 0) {
      const calc = calculateQuotationTotals(items);
      lineItems = calc.items;
    }

    const calc = calculateQuotationTotals(
      lineItems.map((it: any) => ({
        productId: it.productId,
        productName: it.productName,
        planId: it.planId,
        planName: it.planName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountType: it.discountType,
        discountValue: discount !== undefined ? discount : it.discountValue,
        taxRate: it.taxRate,
      }))
    );

    const revisionRecord = {
      revisionNumber: newRevisionNumber,
      revisedAt: now.toISOString(),
      revisedBy: actor || 'Sales User',
      previousQuoteId: originalQuote.id,
      reason: reason || 'Customer requested terms revision.',
      changesSummary: `Revision #${newRevisionNumber} issued with total $${calc.total}.`,
    };

    const revisedQuote: Quotation = {
      id: `quote-${Date.now()}`,
      quoteNumber: generateQuoteNumber(DB.quotations.length + 1, newRevisionNumber),
      revisionNumber: newRevisionNumber,
      customerId: originalQuote.customerId,
      customerName: originalQuote.customerName,
      customerEmail: originalQuote.customerEmail,
      items: calc.items,
      subtotal: calc.subtotal,
      totalDiscount: calc.totalDiscount,
      totalTax: calc.totalTax,
      total: calc.total,
      currency: originalQuote.currency,
      status: 'sent',
      expiresAt: expiry.toISOString(),
      notes: notes || originalQuote.notes,
      termsAndConditions: originalQuote.termsAndConditions,
      createdBy: actor || 'Sales User',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      sentAt: now.toISOString(),
      deliveryStatus: 'delivered',
      revisions: [...(originalQuote.revisions || []), revisionRecord],
    };

    DB.quotations.unshift(revisedQuote);

    logActivity(
      'quotation_revised',
      `Quotation ${originalQuote.quoteNumber} revised into ${revisedQuote.quoteNumber} ($${revisedQuote.total}). Reason: ${revisionRecord.reason}`,
      actor || 'Sales'
    );

    res.status(201).json({
      originalQuote,
      revisedQuote,
    });
  });

  /**
   * Convert accepted quotation to subscription and issue invoice (Safe & Idempotent)
   * POST /api/quotations/:id/convert
   */
  router.post('/api/quotations/:id/convert', (req: Request, res: Response) => {
    const quote = DB.quotations.find((q: Quotation) => q.id === req.params.id);
    if (!quote) return res.status(404).json({ error: 'Quotation not found.' });

    // Idempotency: if already converted, safely return existing records
    if (quote.status === 'converted' && quote.convertedSubscriptionId) {
      const existingSub = DB.subscriptions.find((s: any) => s.id === quote.convertedSubscriptionId);
      const existingInv = DB.invoices.find((i: any) => i.quotationId === quote.id);
      return res.status(200).json({
        idempotent: true,
        message: 'Quotation was already converted. Returning existing records.',
        quotation: quote,
        subscription: existingSub,
        invoice: existingInv,
      });
    }

    if (quote.status !== 'accepted') {
      return res.status(400).json({
        error: `Cannot convert quotation in '${quote.status}' status. Only accepted quotations can be converted to a subscription.`,
      });
    }

    const primaryItem = quote.items[0];
    const plan = DB.plans.find((p: any) => p.id === primaryItem.planId) || DB.plans[0];

    const now = new Date();
    const periodEnd = addBillingInterval(now, plan.billingInterval || 'monthly');

    const subNumber = generateSubscriptionNumber(DB.subscriptions.length + 1);
    const newSub: Subscription = {
      id: `sub-${Date.now()}`,
      subNumber,
      customerId: quote.customerId,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      planId: plan.id,
      planName: plan.name,
      quotationId: quote.id,
      status: 'active',
      startDate: now.toISOString(),
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      nextBillingDate: periodEnd.toISOString(),
      billingInterval: plan.billingInterval || 'monthly',
      price: primaryItem.total,
      currency: quote.currency || 'USD',
      autoRenew: true,
      commercialTerms: {
        planId: plan.id,
        planName: plan.name,
        billingInterval: plan.billingInterval || 'monthly',
        unitPrice: primaryItem.unitPrice,
        quantity: primaryItem.quantity,
        discountAmount: primaryItem.discountAmount,
        currency: quote.currency || 'USD',
        features: plan.features || [],
      },
      planHistory: [],
      history: [
        {
          id: `aud-${Date.now()}-1`,
          timestamp: now.toISOString(),
          type: 'subscription_created',
          actor: req.body.actor || 'Quotation Workflow',
          previousStatus: 'draft',
          newStatus: 'active',
          description: `Subscription ${subNumber} activated from accepted Quotation ${quote.quoteNumber}.`,
          details: { quotationId: quote.id, quoteNumber: quote.quoteNumber },
        },
      ],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Deterministic billing period key for initial invoice
    const billingPeriodKey = generateSubscriptionBillingPeriodKey(
      newSub.id,
      newSub.billingInterval,
      now
    );

    // Initial Invoice Generation
    const invNumber = `INV-2026-${String(DB.invoices.length + 1).padStart(3, '0')}`;
    const newInv: any = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invNumber,
      customerId: quote.customerId,
      customerName: quote.customerName,
      subscriptionId: newSub.id,
      quotationId: quote.id,
      items: quote.items.map((it: any) => ({
        description: `${it.planName} Subscription Initiation (via ${quote.quoteNumber})`,
        amount: it.total,
      })),
      subtotal: quote.subtotal,
      totalDiscount: quote.totalDiscount,
      totalTax: quote.totalTax,
      total: quote.total,
      amountPaid: 0,
      amountDue: quote.total,
      currency: quote.currency || 'USD',
      status: 'unpaid',
      dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      billingPeriodKey,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Update Quotation state
    quote.status = 'converted';
    quote.convertedAt = now.toISOString();
    quote.convertedSubscriptionId = newSub.id;
    quote.updatedAt = now.toISOString();

    DB.subscriptions.unshift(newSub);
    DB.invoices.unshift(newInv);

    logActivity(
      'quotation_converted',
      `Quotation ${quote.quoteNumber} converted into Subscription ${newSub.subNumber} & Invoice ${newInv.invoiceNumber}.`,
      req.body.actor || 'System'
    );

    res.status(201).json({
      quotation: quote,
      subscription: newSub,
      invoice: newInv,
    });
  });

  // =========================================================================
  // 2. SUBSCRIPTION LIFECYCLE MANAGEMENT ENDPOINTS
  // =========================================================================

  /**
   * List subscriptions with search, filter, and pagination
   * GET /api/subscriptions
   */
  router.get('/api/subscriptions', (req: Request, res: Response) => {
    const { status, customerId, planId, search, page, limit } = req.query;
    let list: Subscription[] = [...DB.subscriptions];

    if (status && typeof status === 'string' && status !== 'all') {
      list = list.filter((s) => s.status === status);
    }
    if (customerId && typeof customerId === 'string') {
      list = list.filter((s) => s.customerId === customerId);
    }
    if (planId && typeof planId === 'string') {
      list = list.filter((s) => s.planId === planId);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.subNumber.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q) ||
          s.planName.toLowerCase().includes(q)
      );
    }

    const total = list.length;
    if (req.query.page || req.query.limit || req.query.paginated === 'true') {
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.max(1, parseInt(limit as string) || 50);
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedList = list.slice(startIndex, startIndex + limitNum);

      return res.json({
        subscriptions: paginatedList,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    }

    res.json(list);
  });

  /**
   * Identify subscriptions due for renewal
   * GET /api/subscriptions/due-renewal
   */
  router.get('/api/subscriptions/due-renewal', (req: Request, res: Response) => {
    const now = new Date();
    const lookaheadDays = Number(req.query.lookaheadDays) || 0;

    const dueSubs = DB.subscriptions.filter((sub: Subscription) => {
      const check = isSubscriptionDueForRenewal(sub, now, lookaheadDays);
      return check.eligible;
    });

    res.json({
      dueCount: dueSubs.length,
      asOfDate: now.toISOString(),
      lookaheadDays,
      subscriptions: dueSubs,
    });
  });

  /**
   * Get single subscription with commercial terms, plan history, and invoices
   * GET /api/subscriptions/:id
   */
  router.get('/api/subscriptions/:id', (req: Request, res: Response) => {
    const sub = DB.subscriptions.find((s: Subscription) => s.id === req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found.' });

    const customer = DB.customers.find((c: any) => c.id === sub.customerId);
    const invoices = DB.invoices.filter((i: any) => i.subscriptionId === sub.id);

    res.json({
      subscription: sub,
      customer,
      invoices,
    });
  });

  /**
   * Get subscription audit history timeline
   * GET /api/subscriptions/:id/history
   */
  router.get('/api/subscriptions/:id/history', (req: Request, res: Response) => {
    const sub = DB.subscriptions.find((s: Subscription) => s.id === req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found.' });

    res.json({
      subscriptionId: sub.id,
      subNumber: sub.subNumber,
      history: sub.history || [],
      planHistory: sub.planHistory || [],
    });
  });

  /**
   * Create a new subscription directly (supports trial setup)
   * POST /api/subscriptions
   */
  router.post('/api/subscriptions', (req: Request, res: Response) => {
    const { customerId, planId, trialDays, autoRenew, startImmediately } = req.body;

    const customer = DB.customers.find((c: any) => c.id === customerId);
    const plan = DB.plans.find((p: any) => p.id === planId);

    if (!customer || !plan) {
      return res.status(400).json({ error: 'Valid customer and plan are required.' });
    }

    const now = new Date();
    const isTrial = Number(trialDays) > 0;
    const initialStatus = isTrial ? 'trialing' : startImmediately !== false ? 'active' : 'draft';

    let trialStart: string | undefined;
    let trialEnd: string | undefined;
    let periodStart = now;
    let periodEnd: Date;

    if (isTrial) {
      trialStart = now.toISOString();
      const tEnd = new Date(now.getTime() + Number(trialDays) * 24 * 60 * 60 * 1000);
      trialEnd = tEnd.toISOString();
      periodEnd = tEnd;
    } else {
      periodEnd = addBillingInterval(periodStart, plan.billingInterval || 'monthly');
    }

    const subNumber = generateSubscriptionNumber(DB.subscriptions.length + 1);

    const newSub: Subscription = {
      id: `sub-${Date.now()}`,
      subNumber,
      customerId: customer.id,
      customerName: customer.company || customer.name,
      customerEmail: customer.email || '',
      planId: plan.id,
      planName: plan.name,
      status: initialStatus,
      startDate: now.toISOString(),
      trialStartDate: trialStart,
      trialEndDate: trialEnd,
      currentPeriodStart: periodStart.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      nextBillingDate: periodEnd.toISOString(),
      billingInterval: plan.billingInterval || 'monthly',
      price: plan.price,
      currency: plan.currency || 'USD',
      autoRenew: autoRenew !== false,
      commercialTerms: {
        planId: plan.id,
        planName: plan.name,
        billingInterval: plan.billingInterval || 'monthly',
        unitPrice: plan.price,
        quantity: 1,
        discountAmount: 0,
        currency: plan.currency || 'USD',
        features: plan.features || [],
      },
      planHistory: [],
      history: [
        {
          id: `aud-${Date.now()}`,
          timestamp: now.toISOString(),
          type: isTrial ? 'trial_started' : 'subscription_created',
          actor: req.body.actor || 'Admin',
          previousStatus: 'draft',
          newStatus: initialStatus,
          description: isTrial
            ? `Subscription ${subNumber} started with a ${trialDays}-day trial period.`
            : `Subscription ${subNumber} created directly for ${customer.company} (${plan.name}).`,
        },
      ],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Auto-generate invoice only if active and not in trial
    let initialInvoice: any;
    if (initialStatus === 'active') {
      const billingPeriodKey = generateSubscriptionBillingPeriodKey(
        newSub.id,
        newSub.billingInterval,
        periodStart
      );
      initialInvoice = {
        id: `inv-${Date.now()}`,
        invoiceNumber: `INV-2026-${String(DB.invoices.length + 1).padStart(3, '0')}`,
        customerId: customer.id,
        customerName: customer.company || customer.name,
        subscriptionId: newSub.id,
        items: [{ description: `${plan.name} First Period Billing`, amount: plan.price }],
        subtotal: plan.price,
        totalDiscount: 0,
        totalTax: 0,
        total: plan.price,
        amountPaid: 0,
        amountDue: plan.price,
        currency: plan.currency || 'USD',
        status: 'unpaid',
        dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        billingPeriodKey,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      DB.invoices.unshift(initialInvoice);
    }

    DB.subscriptions.unshift(newSub);
    logActivity('subscription_created', `Subscription ${newSub.subNumber} initiated for ${customer.company}.`, req.body.actor || 'Admin');

    res.status(201).json({ subscription: newSub, invoice: initialInvoice });
  });

  /**
   * Activate draft or trialing subscription
   * POST /api/subscriptions/:id/activate
   */
  router.post('/api/subscriptions/:id/activate', (req: Request, res: Response) => {
    const sub = DB.subscriptions.find((s: Subscription) => s.id === req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found.' });

    const transition = validateSubscriptionTransition(sub.status, 'active');
    if (!transition.allowed) {
      return res.status(400).json({ error: transition.reason });
    }

    const now = new Date();
    const previousStatus = sub.status;
    sub.status = 'active';
    sub.currentPeriodStart = now.toISOString();
    sub.currentPeriodEnd = addBillingInterval(now, sub.billingInterval).toISOString();
    sub.nextBillingDate = sub.currentPeriodEnd;
    sub.autoRenew = true;
    sub.updatedAt = now.toISOString();

    sub.history = sub.history || [];
    sub.history.unshift({
      id: `aud-${Date.now()}`,
      timestamp: now.toISOString(),
      type: 'subscription_activated',
      actor: req.body.actor || 'User',
      previousStatus,
      newStatus: 'active',
      description: `Subscription ${sub.subNumber} transitioned from '${previousStatus}' to 'active'.`,
    });

    logActivity('subscription_activated', `Subscription ${sub.subNumber} activated.`, req.body.actor || 'Admin');
    res.json(sub);
  });

  const handlePauseSub = (req: Request, res: Response) => {
    const sub = DB.subscriptions.find((s: Subscription) => s.id === req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found.' });

    const transition = validateSubscriptionTransition(sub.status, 'paused');
    if (!transition.allowed) {
      return res.status(400).json({ error: transition.reason });
    }

    const now = new Date().toISOString();
    sub.status = 'paused';
    sub.pausedAt = now;
    sub.autoRenew = false;
    sub.updatedAt = now;

    sub.history = sub.history || [];
    sub.history.unshift({
      id: `aud-${Date.now()}`,
      timestamp: now,
      type: 'subscription_paused',
      actor: req.body.actor || 'User',
      previousStatus: 'active',
      newStatus: 'paused',
      description: `Subscription ${sub.subNumber} paused. Recurring billing halted.`,
    });

    logActivity('subscription_paused', `Subscription ${sub.subNumber} paused.`, req.body.actor || 'Admin');
    res.json(sub);
  };
  router.post('/api/subscriptions/:id/pause', handlePauseSub);
  router.put('/api/subscriptions/:id/pause', handlePauseSub);

  const handleResumeSub = (req: Request, res: Response) => {
    const sub = DB.subscriptions.find((s: Subscription) => s.id === req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found.' });

    const transition = validateSubscriptionTransition(sub.status, 'active');
    if (!transition.allowed) {
      return res.status(400).json({ error: transition.reason });
    }

    const now = new Date().toISOString();
    sub.status = 'active';
    sub.resumedAt = now;
    sub.autoRenew = true;
    sub.updatedAt = now;

    sub.history = sub.history || [];
    sub.history.unshift({
      id: `aud-${Date.now()}`,
      timestamp: now,
      type: 'subscription_resumed',
      actor: req.body.actor || 'User',
      previousStatus: 'paused',
      newStatus: 'active',
      description: `Subscription ${sub.subNumber} resumed. Recurring billing reinstated.`,
    });

    logActivity('subscription_resumed', `Subscription ${sub.subNumber} resumed.`, req.body.actor || 'Admin');
    res.json(sub);
  };
  router.post('/api/subscriptions/:id/resume', handleResumeSub);
  router.put('/api/subscriptions/:id/resume', handleResumeSub);

  /**
   * Preview proration adjustment for a plan change
   * POST /api/subscriptions/:id/proration-preview
   */
  router.post('/api/subscriptions/:id/proration-preview', (req: Request, res: Response) => {
    const sub = DB.subscriptions.find((s: Subscription) => s.id === req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found.' });

    const { newPlanId } = req.body;
    const newPlan = DB.plans.find((p: any) => p.id === newPlanId);
    if (!newPlan) return res.status(400).json({ error: 'Target plan not found.' });

    const proration = calculateProration({
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      oldPlanPrice: sub.price,
      newPlanPrice: newPlan.price,
      currency: newPlan.currency || sub.currency,
    });

    res.json({
      subscriptionId: sub.id,
      subNumber: sub.subNumber,
      currentPlan: { id: sub.planId, name: sub.planName, price: sub.price },
      targetPlan: { id: newPlan.id, name: newPlan.name, price: newPlan.price },
      proration,
    });
  });

  const handleChangePlan = (req: Request, res: Response) => {
    const sub = DB.subscriptions.find((s: Subscription) => s.id === req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found.' });

    const { newPlanId, actor } = req.body;
    const newPlan = DB.plans.find((p: any) => p.id === newPlanId);
    if (!newPlan) return res.status(400).json({ error: 'Invalid plan selected.' });

    try {
      const { subscription, planChange, proration } = processPlanChange(
        sub,
        newPlan,
        actor || 'Admin'
      );

      // If proration net adjustment requires additional payment, generate an adjustment invoice
      let adjustmentInvoice: any;
      if (proration.netAdjustment > 0) {
        adjustmentInvoice = {
          id: `inv-${Date.now()}`,
          invoiceNumber: `INV-2026-${String(DB.invoices.length + 1).padStart(3, '0')}`,
          customerId: subscription.customerId,
          customerName: subscription.customerName,
          subscriptionId: subscription.id,
          items: [
            {
              description: `Prorated Upgrade from ${planChange.previousPlanName} to ${newPlan.name} (${proration.daysRemaining}/${proration.totalDaysInPeriod} days remaining)`,
              amount: proration.netAdjustment,
            },
          ],
          subtotal: proration.netAdjustment,
          totalDiscount: 0,
          totalTax: 0,
          total: proration.netAdjustment,
          amountPaid: 0,
          amountDue: proration.netAdjustment,
          currency: subscription.currency,
          status: 'unpaid',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        DB.invoices.unshift(adjustmentInvoice);
      }

      logActivity(
        'subscription_plan_changed',
        `Subscription ${sub.subNumber} changed to ${newPlan.name}. Net adjustment: $${proration.netAdjustment}.`,
        actor || 'Admin'
      );

      res.json({
        subscription,
        planChange,
        proration,
        adjustmentInvoice,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };
  router.post('/api/subscriptions/:id/change-plan', handleChangePlan);
  router.put('/api/subscriptions/:id/plan', handleChangePlan);

  const handleCancelSub = (req: Request, res: Response) => {
    const sub = DB.subscriptions.find((s: Subscription) => s.id === req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found.' });

    const { type, reason, actor } = req.body;
    const cancelType = type === 'immediate' ? 'immediate' : 'end_of_period';

    try {
      const canceledSub = processCancellation(sub, {
        type: cancelType,
        reason,
        actor: actor || 'Admin',
      });

      logActivity(
        'subscription_canceled',
        `Subscription ${sub.subNumber} cancellation registered (${cancelType}). Effective: ${sub.effectiveCancellationDate?.slice(0, 10)}.`,
        actor || 'Admin'
      );

      res.json(canceledSub);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };
  router.post('/api/subscriptions/:id/cancel', handleCancelSub);
  router.put('/api/subscriptions/:id/cancel', handleCancelSub);

  /**
   * Renew a single subscription (idempotent duplicate prevention)
   * POST /api/subscriptions/:id/renew
   */
  router.post('/api/subscriptions/:id/renew', (req: Request, res: Response) => {
    const sub = DB.subscriptions.find((s: Subscription) => s.id === req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found.' });

    const renewalCheck = isSubscriptionDueForRenewal(sub, new Date(), 7); // allow renewal within 7 days
    if (!renewalCheck.eligible) {
      return res.status(400).json({
        error: `Subscription not eligible for renewal: ${renewalCheck.reason}`,
      });
    }

    const periodStart = new Date(sub.currentPeriodEnd);
    const billingPeriodKey = generateSubscriptionBillingPeriodKey(
      sub.id,
      sub.billingInterval,
      periodStart
    );

    // Idempotency: verify invoice does not already exist
    const existingInv = DB.invoices.find((i: any) => i.billingPeriodKey === billingPeriodKey);
    if (existingInv) {
      return res.status(409).json({
        error: 'Duplicate renewal prevented. Invoice already exists for this billing period.',
        existingInvoice: existingInv,
      });
    }

    // Advance cycle
    const { previousPeriodEnd, newPeriodEnd } = advanceSubscriptionBillingCycle(
      sub,
      req.body.actor || 'Renewal Engine'
    );

    // Create recurring invoice
    const newInvoice: any = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-2026-${String(DB.invoices.length + 1).padStart(3, '0')}`,
      customerId: sub.customerId,
      customerName: sub.customerName,
      subscriptionId: sub.id,
      items: [
        {
          description: `${sub.planName} Recurring Renewal (${previousPeriodEnd.slice(0, 10)} to ${newPeriodEnd.slice(0, 10)})`,
          amount: sub.price,
        },
      ],
      subtotal: sub.price,
      totalDiscount: 0,
      totalTax: 0,
      total: sub.price,
      amountPaid: 0,
      amountDue: sub.price,
      currency: sub.currency,
      status: 'unpaid',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      billingPeriodKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    DB.invoices.unshift(newInvoice);
    logActivity('subscription_renewed', `Subscription ${sub.subNumber} successfully renewed. Invoice ${newInvoice.invoiceNumber} created.`, req.body.actor || 'Billing Engine');

    res.json({
      subscription: sub,
      invoice: newInvoice,
      billingPeriodKey,
    });
  });

  /**
   * Batch renewal process for all due subscriptions
   * POST /api/subscriptions/renew-batch
   */
  router.post('/api/subscriptions/renew-batch', (_req: Request, res: Response) => {
    const now = new Date();
    const results: any[] = [];
    const errors: any[] = [];

    const dueSubs = DB.subscriptions.filter((s: Subscription) => {
      const check = isSubscriptionDueForRenewal(s, now, 0);
      return check.eligible;
    });

    for (const sub of dueSubs) {
      try {
        const periodStart = new Date(sub.currentPeriodEnd);
        const billingPeriodKey = generateSubscriptionBillingPeriodKey(
          sub.id,
          sub.billingInterval,
          periodStart
        );

        const existingInv = DB.invoices.find((i: any) => i.billingPeriodKey === billingPeriodKey);
        if (existingInv) {
          results.push({
            subscriptionId: sub.id,
            subNumber: sub.subNumber,
            status: 'skipped',
            reason: 'Invoice already exists for this period.',
            invoiceNumber: existingInv.invoiceNumber,
          });
          continue;
        }

        const { previousPeriodEnd, newPeriodEnd } = advanceSubscriptionBillingCycle(
          sub,
          'Batch Renewal Engine'
        );

        const newInvoice: any = {
          id: `inv-${Date.now()}-${sub.id}`,
          invoiceNumber: `INV-2026-${String(DB.invoices.length + 1).padStart(3, '0')}`,
          customerId: sub.customerId,
          customerName: sub.customerName,
          subscriptionId: sub.id,
          items: [
            {
              description: `${sub.planName} Recurring Billing (${previousPeriodEnd.slice(0, 10)} to ${newPeriodEnd.slice(0, 10)})`,
              amount: sub.price,
            },
          ],
          subtotal: sub.price,
          totalDiscount: 0,
          totalTax: 0,
          total: sub.price,
          amountPaid: 0,
          amountDue: sub.price,
          currency: sub.currency,
          status: 'unpaid',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          billingPeriodKey,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        DB.invoices.unshift(newInvoice);
        results.push({
          subscriptionId: sub.id,
          subNumber: sub.subNumber,
          status: 'renewed',
          invoiceNumber: newInvoice.invoiceNumber,
          billingPeriodKey,
        });
      } catch (err: any) {
        errors.push({
          subscriptionId: sub.id,
          subNumber: sub.subNumber,
          error: err.message || 'Renewal failed',
        });
      }
    }

    logActivity(
      'batch_renewal_executed',
      `Batch renewal completed: ${results.length} processed, ${errors.length} errors.`,
      'Batch Renewal Engine'
    );

    res.json({
      runAt: now.toISOString(),
      dueFound: dueSubs.length,
      processed: results.length,
      errorsCount: errors.length,
      results,
      errors,
    });
  });

  return router;
}
