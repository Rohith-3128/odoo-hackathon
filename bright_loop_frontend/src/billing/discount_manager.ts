/**
 * EZbill - Discount Management Module
 * Team 3: Billing & Financial Engine
 *
 * Supports percentage and fixed discounts with validity periods,
 * usage limits, eligibility rules, and maximum cap.
 * All validation happens server-side.
 */

export interface Discount {
  id: string;
  code: string; // discount code e.g. 'LAUNCH20'
  name: string;
  type: 'percentage' | 'fixed';
  value: number; // percentage (e.g. 20 = 20%) or fixed amount in display units
  maxDiscountAmount?: number; // cap for percentage discounts, in display units
  currency: string;
  validFrom: string; // ISO date
  validUntil: string; // ISO date
  maxUsages: number; // 0 = unlimited
  currentUsages: number;
  eligiblePlanIds?: string[]; // empty or ['all'] = any plan
  eligibleCustomerIds?: string[]; // empty or ['all'] = any customer
  minOrderAmount?: number; // minimum order in display units
  active: boolean;
  createdAt: string;
}

export interface DiscountValidationResult {
  valid: boolean;
  error?: string;
  discountAmountMinor?: number; // in minor units
  appliedDiscount?: Discount;
}

// Default promotional discounts
export const DEFAULT_DISCOUNTS: Discount[] = [
  {
    id: 'disc-1',
    code: 'LAUNCH20',
    name: 'Launch Promotion 20% Off',
    type: 'percentage',
    value: 20,
    maxDiscountAmount: 2000, // cap at $2000
    currency: 'USD',
    validFrom: '2026-01-01T00:00:00.000Z',
    validUntil: '2027-12-31T23:59:59.000Z',
    maxUsages: 100,
    currentUsages: 2,
    eligiblePlanIds: ['all'],
    eligibleCustomerIds: ['all'],
    minOrderAmount: 0,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'disc-2',
    code: 'FLAT500',
    name: '$500 Flat Discount',
    type: 'fixed',
    value: 500,
    currency: 'USD',
    validFrom: '2026-06-01T00:00:00.000Z',
    validUntil: '2027-06-30T23:59:59.000Z',
    maxUsages: 50,
    currentUsages: 1,
    eligiblePlanIds: ['all'],
    eligibleCustomerIds: ['all'],
    minOrderAmount: 1000,
    active: true,
    createdAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'disc-3',
    code: 'ENTERPRISE10',
    name: 'Enterprise Loyalty 10%',
    type: 'percentage',
    value: 10,
    maxDiscountAmount: 5000,
    currency: 'USD',
    validFrom: '2026-01-01T00:00:00.000Z',
    validUntil: '2027-12-31T23:59:59.000Z',
    maxUsages: 0, // unlimited
    currentUsages: 0,
    eligiblePlanIds: ['plan-pro', 'plan-annual-pro'],
    eligibleCustomerIds: ['all'],
    minOrderAmount: 0,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

/**
 * Validate and calculate a discount against an order.
 *
 * @param code - the discount code to apply
 * @param allDiscounts - available discount records
 * @param subtotalDisplay - order subtotal in display units (e.g. 4995 = $4995)
 * @param planId - plan being purchased (for eligibility)
 * @param customerId - customer making the purchase (for eligibility)
 * @param currency - order currency
 */
export function validateDiscount(
  code: string,
  allDiscounts: Discount[],
  subtotalDisplay: number,
  planId?: string,
  customerId?: string,
  currency: string = 'USD'
): DiscountValidationResult {
  const discount = allDiscounts.find(
    (d) => d.code.toUpperCase() === code.toUpperCase()
  );

  if (!discount) {
    return { valid: false, error: 'Discount code not found.' };
  }

  if (!discount.active) {
    return { valid: false, error: 'Discount code is no longer active.' };
  }

  // Check currency match
  if (discount.currency !== currency) {
    return { valid: false, error: `Discount is not valid for currency ${currency}.` };
  }

  // Check validity period
  const now = new Date();
  if (new Date(discount.validFrom) > now) {
    return { valid: false, error: 'Discount code is not yet valid.' };
  }
  if (new Date(discount.validUntil) < now) {
    return { valid: false, error: 'Discount code has expired.' };
  }

  // Check usage limit
  if (discount.maxUsages > 0 && discount.currentUsages >= discount.maxUsages) {
    return { valid: false, error: 'Discount code has reached its maximum usage limit.' };
  }

  // Check plan eligibility
  if (
    discount.eligiblePlanIds &&
    discount.eligiblePlanIds.length > 0 &&
    !discount.eligiblePlanIds.includes('all')
  ) {
    if (planId && !discount.eligiblePlanIds.includes(planId)) {
      return { valid: false, error: 'Discount code is not valid for this plan.' };
    }
  }

  // Check customer eligibility
  if (
    discount.eligibleCustomerIds &&
    discount.eligibleCustomerIds.length > 0 &&
    !discount.eligibleCustomerIds.includes('all')
  ) {
    if (customerId && !discount.eligibleCustomerIds.includes(customerId)) {
      return { valid: false, error: 'Discount code is not valid for this customer.' };
    }
  }

  // Check minimum order amount
  if (discount.minOrderAmount && subtotalDisplay < discount.minOrderAmount) {
    return {
      valid: false,
      error: `Minimum order amount of $${discount.minOrderAmount} required for this discount.`,
    };
  }

  // Calculate discount amount in display units
  let discountAmountDisplay: number;
  if (discount.type === 'percentage') {
    discountAmountDisplay = Math.round((subtotalDisplay * discount.value) / 100 * 100) / 100;
    // Apply cap
    if (discount.maxDiscountAmount && discountAmountDisplay > discount.maxDiscountAmount) {
      discountAmountDisplay = discount.maxDiscountAmount;
    }
  } else {
    discountAmountDisplay = discount.value;
  }

  // Prevent negative total
  if (discountAmountDisplay > subtotalDisplay) {
    discountAmountDisplay = subtotalDisplay;
  }

  // Convert to minor units (cents)
  const discountAmountMinor = Math.round(discountAmountDisplay * 100);

  return {
    valid: true,
    discountAmountMinor,
    appliedDiscount: discount,
  };
}

/**
 * Record that a discount code was used (increment usage counter).
 */
export function recordDiscountUsage(discount: Discount): void {
  discount.currentUsages += 1;
}
