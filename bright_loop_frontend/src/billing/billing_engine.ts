/**
 * Brightloop Nexus - Billing Engine Core
 * Team 3: Billing & Financial Engine
 *
 * Central billing engine that calculates amounts, generates invoices,
 * and handles recurring billing with idempotency.
 */

import {
  TaxRule,
  TaxBreakdownItem,
  TaxCalculationResult,
  resolveApplicableTaxRules,
  calculateTax,
  toMinorUnits,
  toDisplayUnits,
} from './tax_config';

import {
  Discount,
  validateDiscount,
  recordDiscountUsage,
} from './discount_manager';

// ─── Extended Invoice Model ────────────────────────────────────

export interface ExtendedInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number; // display units
  discount: number; // display units
  taxBreakdown: TaxBreakdownItem[];
  subtotal: number; // display units (qty * unitPrice)
  taxAmount: number; // display units
  total: number; // display units (subtotal - discount + tax)
  amount: number; // backward-compat: same as total
}

export interface ExtendedInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  subscriptionId?: string;
  quotationId?: string;
  items: ExtendedInvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: 'draft' | 'issued' | 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'void' | 'uncollectible';
  dueDate: string;
  issueDate: string;
  paidAt?: string;
  notes: string;
  taxMode: 'intra_state' | 'inter_state' | 'none';
  discountCode?: string;
  billingPeriodKey?: string; // idempotency: "sub-201_2026-10" prevents duplicates
  createdAt: string;
  updatedAt: string;
}

// ─── Refund Model ──────────────────────────────────────────────

export interface Refund {
  id: string;
  refundNumber: string;
  paymentId: string;
  paymentNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  reason: string;
  status: 'requested' | 'approved' | 'completed' | 'rejected';
  isSimulated: boolean;
  requestedAt: string;
  completedAt?: string;
}

// ─── Reconciliation Model ──────────────────────────────────────

export interface ReconciliationResult {
  id: string;
  runAt: string;
  fullyPaidInvoices: string[];
  partiallyPaidInvoices: string[];
  overpayments: Array<{ invoiceId: string; excess: number }>;
  underpayments: Array<{ invoiceId: string; shortfall: number }>;
  unmatchedPayments: string[];
  duplicateTransactions: string[];
  currencyMismatches: string[];
  overdueInvoices: string[];
  summary: {
    totalInvoiced: number;
    totalCollected: number;
    totalOutstanding: number;
    totalOverdue: number;
    totalRefunded: number;
  };
}

// ─── Invoice Number Generator ──────────────────────────────────

let invoiceSequence = 3; // start after existing INV-2026-003
const usedInvoiceNumbers = new Set(['INV-2026-001', 'INV-2026-002', 'INV-2026-003']);

export function generateInvoiceNumber(): string {
  let num: string;
  do {
    invoiceSequence += 1;
    num = `INV-2026-${String(invoiceSequence).padStart(3, '0')}`;
  } while (usedInvoiceNumbers.has(num));
  usedInvoiceNumbers.add(num);
  return num;
}

let paymentSequence = 2; // after PAY-2026-002
export function generatePaymentNumber(): string {
  paymentSequence += 1;
  return `PAY-2026-${String(paymentSequence).padStart(3, '0')}`;
}

let refundSequence = 0;
export function generateRefundNumber(): string {
  refundSequence += 1;
  return `REF-2026-${String(refundSequence).padStart(3, '0')}`;
}

let reconciliationSequence = 0;
export function generateReconciliationId(): string {
  reconciliationSequence += 1;
  return `recon-${Date.now()}-${reconciliationSequence}`;
}

// ─── Billing Period Key (Idempotency) ──────────────────────────

/**
 * Generate a billing period key for duplicate prevention.
 * Format: "{subscriptionId}_{YYYY-MM}" for monthly,
 *         "{subscriptionId}_{YYYY-QN}" for quarterly,
 *         "{subscriptionId}_{YYYY}" for annual.
 */
export function generateBillingPeriodKey(
  subscriptionId: string,
  billingInterval: string,
  periodStart: Date
): string {
  const year = periodStart.getFullYear();
  const month = String(periodStart.getMonth() + 1).padStart(2, '0');

  switch (billingInterval) {
    case 'monthly':
      return `${subscriptionId}_${year}-${month}`;
    case 'quarterly': {
      const quarter = Math.ceil((periodStart.getMonth() + 1) / 3);
      return `${subscriptionId}_${year}-Q${quarter}`;
    }
    case 'annual':
      return `${subscriptionId}_${year}`;
    default:
      return `${subscriptionId}_${year}-${month}`;
  }
}

// ─── Core Billing Calculation ──────────────────────────────────

export interface BillingCalculationInput {
  planName: string;
  planPrice: number; // display units
  quantity: number;
  discountCode?: string;
  allDiscounts: Discount[];
  taxRules: TaxRule[];
  taxMode: 'intra_state' | 'inter_state' | 'none';
  planId?: string;
  customerId?: string;
  currency?: string;
  periodDescription?: string;
}

export interface BillingCalculationResult {
  items: ExtendedInvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
  discountApplied?: Discount;
  error?: string;
}

/**
 * Central billing calculation.
 * All monetary math uses minor units (cents) internally,
 * final result is in display units for the API response.
 */
export function calculateBilling(input: BillingCalculationInput): BillingCalculationResult {
  const {
    planName,
    planPrice,
    quantity,
    discountCode,
    allDiscounts,
    taxRules,
    taxMode,
    planId,
    customerId,
    currency = 'USD',
    periodDescription,
  } = input;

  const qty = Math.max(1, Math.round(quantity));
  const unitPriceMinor = toMinorUnits(planPrice);
  const subtotalMinor = unitPriceMinor * qty;
  const subtotalDisplay = toDisplayUnits(subtotalMinor);

  // Step 1: Resolve discount
  let discountMinor = 0;
  let discountApplied: Discount | undefined;

  if (discountCode) {
    const discountResult = validateDiscount(
      discountCode,
      allDiscounts,
      subtotalDisplay,
      planId,
      customerId,
      currency
    );
    if (!discountResult.valid) {
      return {
        items: [],
        subtotal: subtotalDisplay,
        totalDiscount: 0,
        totalTax: 0,
        total: subtotalDisplay,
        error: discountResult.error,
      };
    }
    discountMinor = discountResult.discountAmountMinor || 0;
    discountApplied = discountResult.appliedDiscount;
  }

  // Step 2: Resolve applicable tax rules
  const applicableTaxRules = resolveApplicableTaxRules(taxRules, taxMode, planId);

  // Step 3: Calculate tax (discount applied BEFORE tax, as per Indian GST norms)
  const taxResult = calculateTax(subtotalMinor, discountMinor, applicableTaxRules);

  // Step 4: Build line item
  const description = periodDescription || `${planName} Subscription`;
  const item: ExtendedInvoiceItem = {
    description,
    quantity: qty,
    unitPrice: planPrice,
    discount: toDisplayUnits(discountMinor),
    taxBreakdown: taxResult.taxBreakdown,
    subtotal: toDisplayUnits(taxResult.subtotal),
    taxAmount: toDisplayUnits(taxResult.totalTax),
    total: toDisplayUnits(taxResult.total),
    amount: toDisplayUnits(taxResult.total), // backward compat
  };

  return {
    items: [item],
    subtotal: toDisplayUnits(taxResult.subtotal),
    totalDiscount: toDisplayUnits(discountMinor),
    totalTax: toDisplayUnits(taxResult.totalTax),
    total: toDisplayUnits(taxResult.total),
    discountApplied,
  };
}
