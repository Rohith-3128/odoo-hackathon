/**
 * Brightloop Nexus - Tax Configuration Module
 * Team 3: Billing & Financial Engine
 *
 * Supports configurable tax rules including Indian GST (CGST/SGST/IGST).
 * Tax calculations are always performed server-side.
 * Tax rates are preserved at the time of invoice issuance.
 */

export interface TaxRule {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  rate: number; // percentage (e.g. 9 = 9%) or fixed amount in minor units
  category: 'CGST' | 'SGST' | 'IGST' | 'VAT' | 'SALES_TAX' | 'SERVICE_TAX' | 'CUSTOM';
  region?: string; // e.g. 'IN-MH', 'IN-KA', 'US-CA'
  applicableTo?: string[]; // product IDs or 'all'
  active: boolean;
  createdAt: string;
}

export interface TaxBreakdownItem {
  taxRuleId: string;
  taxName: string;
  category: string;
  rate: number;
  taxableAmount: number; // amount before this tax
  taxAmount: number; // calculated tax
}

export interface TaxCalculationResult {
  subtotal: number; // amount before tax
  discountAmount: number;
  taxableAmount: number; // subtotal - discount
  taxBreakdown: TaxBreakdownItem[];
  totalTax: number;
  total: number; // taxableAmount + totalTax
}

// Default tax rules — Indian GST demonstration
export const DEFAULT_TAX_RULES: TaxRule[] = [
  {
    id: 'tax-cgst-9',
    name: 'CGST @ 9%',
    type: 'percentage',
    rate: 9,
    category: 'CGST',
    region: 'IN',
    applicableTo: ['all'],
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tax-sgst-9',
    name: 'SGST @ 9%',
    type: 'percentage',
    rate: 9,
    category: 'SGST',
    region: 'IN',
    applicableTo: ['all'],
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tax-igst-18',
    name: 'IGST @ 18%',
    type: 'percentage',
    rate: 18,
    category: 'IGST',
    region: 'IN-INTER',
    applicableTo: ['all'],
    active: false, // Only active for inter-state transactions
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

/**
 * Resolve which tax rules apply to a given transaction.
 * For intra-state (same state): CGST + SGST
 * For inter-state: IGST only
 * Configurable via the taxMode parameter.
 */
export function resolveApplicableTaxRules(
  allRules: TaxRule[],
  taxMode: 'intra_state' | 'inter_state' | 'none' = 'intra_state',
  productId?: string
): TaxRule[] {
  if (taxMode === 'none') return [];

  return allRules.filter((rule) => {
    if (!rule.active) {
      // For inter-state mode, activate IGST even if default is inactive
      if (taxMode === 'inter_state' && rule.category === 'IGST') {
        return true;
      }
      return false;
    }

    // For inter-state, exclude CGST/SGST
    if (taxMode === 'inter_state' && (rule.category === 'CGST' || rule.category === 'SGST')) {
      return false;
    }

    // For intra-state, exclude IGST
    if (taxMode === 'intra_state' && rule.category === 'IGST') {
      return false;
    }

    // Check product applicability
    if (rule.applicableTo && !rule.applicableTo.includes('all')) {
      if (productId && !rule.applicableTo.includes(productId)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calculate taxes on a given amount.
 * Uses integer arithmetic (cents/paise) to avoid floating-point errors.
 * Amounts are in minor currency units (e.g., cents for USD, paise for INR).
 *
 * @param subtotalMinor - amount in minor units (before discount)
 * @param discountMinor - discount amount in minor units
 * @param applicableRules - tax rules to apply
 * @returns TaxCalculationResult with all amounts in minor units
 */
export function calculateTax(
  subtotalMinor: number,
  discountMinor: number,
  applicableRules: TaxRule[]
): TaxCalculationResult {
  // Ensure integer arithmetic
  const subtotal = Math.round(subtotalMinor);
  const discount = Math.min(Math.round(discountMinor), subtotal); // discount cannot exceed subtotal
  const taxableAmount = subtotal - discount;

  const taxBreakdown: TaxBreakdownItem[] = [];
  let totalTax = 0;

  for (const rule of applicableRules) {
    let taxAmount: number;
    if (rule.type === 'percentage') {
      // Tax = taxableAmount * rate / 100, rounded to nearest integer
      taxAmount = Math.round((taxableAmount * rule.rate) / 100);
    } else {
      taxAmount = Math.round(rule.rate);
    }

    taxBreakdown.push({
      taxRuleId: rule.id,
      taxName: rule.name,
      category: rule.category,
      rate: rule.rate,
      taxableAmount,
      taxAmount,
    });

    totalTax += taxAmount;
  }

  return {
    subtotal,
    discountAmount: discount,
    taxableAmount,
    taxBreakdown,
    totalTax,
    total: taxableAmount + totalTax,
  };
}

/**
 * Convert a display-unit amount (e.g. $49.95) to minor units (4995 cents).
 */
export function toMinorUnits(displayAmount: number): number {
  return Math.round(displayAmount * 100);
}

/**
 * Convert minor units (4995 cents) back to display units ($49.95).
 */
export function toDisplayUnits(minorAmount: number): number {
  return Math.round(minorAmount) / 100;
}
