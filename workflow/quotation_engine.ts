/**
 * Brightloop Nexus - Quotation Management Engine
 * Team 2: Workflows & Subscription Lifecycle
 *
 * Authoritative business logic for creating, calculating, validating,
 * revising, and converting quotations into subscriptions.
 */

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';

export interface QuotationLineItemInput {
  productId?: string;
  productName?: string;
  planId: string;
  planName: string;
  quantity: number;
  unitPrice: number;
  discountType?: 'fixed' | 'percentage';
  discountValue?: number;
  taxRate?: number; // e.g. 18 for 18% GST
}

export interface QuotationLineItem {
  id: string;
  productId: string;
  productName: string;
  planId: string;
  planName: string;
  quantity: number;
  unitPrice: number;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
}

export interface QuotationRevision {
  revisionNumber: number;
  revisedAt: string;
  revisedBy: string;
  previousQuoteId: string;
  reason: string;
  changesSummary: string;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  revisionNumber: number;
  customerId: string;
  customerName: string;
  customerEmail: string;
  items: QuotationLineItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
  currency: string;
  status: QuotationStatus;
  expiresAt: string;
  notes: string;
  termsAndConditions: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  deliveryStatus?: 'pending' | 'delivered' | 'failed';
  acceptedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  expiredAt?: string;
  convertedAt?: string;
  convertedSubscriptionId?: string;
  revisions?: QuotationRevision[];
}

/**
 * Valid allowed state transitions for quotations
 */
export const ALLOWED_QUOTATION_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  draft: ['sent', 'expired'],
  sent: ['accepted', 'rejected', 'expired'],
  accepted: ['converted'],
  rejected: [],
  expired: [],
  converted: [],
};

/**
 * Standard monetary precision helper (2 decimal places)
 */
export function roundToCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate and validate a single quotation line item
 */
export function calculateLineItem(input: QuotationLineItemInput, index: number): QuotationLineItem {
  const quantity = Math.max(1, Math.floor(Number(input.quantity) || 1));
  const unitPrice = Math.max(0, roundToCents(Number(input.unitPrice) || 0));
  const subtotal = roundToCents(unitPrice * quantity);

  const discountType = input.discountType === 'percentage' ? 'percentage' : 'fixed';
  let discountValue = Math.max(0, Number(input.discountValue) || 0);

  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountValue = Math.min(100, discountValue);
    discountAmount = roundToCents((subtotal * discountValue) / 100);
  } else {
    discountAmount = Math.min(subtotal, roundToCents(discountValue));
  }

  const taxableAmount = Math.max(0, roundToCents(subtotal - discountAmount));
  const taxRate = Math.max(0, Number(input.taxRate) || 0);
  const taxAmount = roundToCents((taxableAmount * taxRate) / 100);
  const total = roundToCents(taxableAmount + taxAmount);

  return {
    id: `item-${Date.now()}-${index}`,
    productId: input.productId || 'prod-1',
    productName: input.productName || input.planName,
    planId: input.planId,
    planName: input.planName,
    quantity,
    unitPrice,
    discountType,
    discountValue,
    discountAmount,
    taxRate,
    taxAmount,
    subtotal,
    total,
  };
}

/**
 * Authoritative server-side calculation for full quotation totals
 */
export function calculateQuotationTotals(itemsInput: QuotationLineItemInput[]): {
  items: QuotationLineItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
} {
  if (!itemsInput || itemsInput.length === 0) {
    throw new Error('Quotation must contain at least one line item.');
  }

  const items = itemsInput.map((it, idx) => calculateLineItem(it, idx));

  const subtotal = roundToCents(items.reduce((sum, item) => sum + item.subtotal, 0));
  const totalDiscount = roundToCents(items.reduce((sum, item) => sum + item.discountAmount, 0));
  const totalTax = roundToCents(items.reduce((sum, item) => sum + item.taxAmount, 0));
  const total = roundToCents(subtotal - totalDiscount + totalTax);

  return {
    items,
    subtotal,
    totalDiscount,
    totalTax,
    total,
  };
}

/**
 * Format a human-readable sequence number: QUO-2026-001
 */
export function generateQuoteNumber(sequence: number, revision: number = 1): string {
  const base = `QUO-2026-${String(sequence).padStart(3, '0')}`;
  return revision > 1 ? `${base}-R${revision}` : base;
}

/**
 * Check if a quotation has expired based on current timestamp
 */
export function isQuotationExpired(quotation: Quotation, asOfDate: Date = new Date()): boolean {
  if (quotation.status === 'expired') return true;
  if (quotation.status === 'accepted' || quotation.status === 'converted') return false;
  const expiry = new Date(quotation.expiresAt);
  return expiry.getTime() < asOfDate.getTime();
}

/**
 * Validate allowed state transitions for quotation workflow
 */
export function validateQuotationTransition(
  currentStatus: QuotationStatus,
  targetStatus: QuotationStatus,
  expiresAt: string,
  asOfDate: Date = new Date()
): { allowed: boolean; reason?: string } {
  // Check if expired
  const isExpired = new Date(expiresAt).getTime() < asOfDate.getTime();

  // If quotation is past expiry and not accepted/converted, it must be expired first
  if (isExpired && targetStatus === 'accepted') {
    return {
      allowed: false,
      reason: 'Quotation has expired on ' + new Date(expiresAt).toISOString().slice(0, 10) + '. Expired quotations cannot be accepted without a revision.',
    };
  }

  const allowed = ALLOWED_QUOTATION_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Invalid quotation transition from '${currentStatus}' to '${targetStatus}'. Allowed: [${allowed.join(', ')}]`,
    };
  }

  return { allowed: true };
}
