/**
 * EZbill - Pricing, Plans, and Booking logic
 */

export interface AgencyPlan {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  quarterlyPrice: number;
  features: string[];
  turnaroundTime: string;
  slotsAvailable: number;
  popular?: boolean;
}

export const AGENCY_PLANS: AgencyPlan[] = [
  {
    id: 'sprint',
    name: 'Monthly Sprint',
    tagline: 'One request at a time. Pause or cancel anytime.',
    monthlyPrice: 4995,
    quarterlyPrice: 13485, // 10% discount
    turnaroundTime: '48-72 hours',
    slotsAvailable: 3,
    popular: false,
    features: [
      'One active request at a time',
      'Average 48h delivery',
      'Brand design & typography',
      'Web & mobile UI/UX',
      'Unlimited revisions',
      'Direct Slack channel',
      'Pause or cancel anytime',
    ],
  },
  {
    id: 'partner',
    name: 'Dedicated Partner',
    tagline: 'Two active requests with priority queue & creative direction.',
    monthlyPrice: 8495,
    quarterlyPrice: 22935, // 10% discount
    turnaroundTime: '24-48 hours',
    slotsAvailable: 1,
    popular: true,
    features: [
      'Two active requests at a time',
      'Senior design director assigned',
      'Product design & full design systems',
      'React / Webflow development handoff',
      'Motion graphics & 3D assets',
      'Async Loom video reviews',
      'Weekly strategy syncs',
      'Pause or cancel anytime',
    ],
  },
  {
    id: 'custom',
    name: 'Agency Enterprise',
    tagline: 'Dedicated multi-disciplinary team for scaling companies.',
    monthlyPrice: 14500,
    quarterlyPrice: 39150,
    turnaroundTime: 'Same day / 24h',
    slotsAvailable: 2,
    popular: false,
    features: [
      'Unlimited parallel requests',
      'Dedicated lead designer + front-end engineer',
      'Full brand guidelines & component library',
      'Native mobile & responsive web build',
      'Fast-track SLA (under 24h)',
      'Dedicated private Slack & Figma team',
      'Custom contractual terms',
    ],
  },
];

export function calculateDiscount(monthlyPrice: number, quarterlyPrice: number): number {
  const threeMonthsFull = monthlyPrice * 3;
  if (threeMonthsFull <= 0) return 0;
  const savings = ((threeMonthsFull - quarterlyPrice) / threeMonthsFull) * 100;
  return Math.round(savings);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function validateBookingSlot(slotTime: string, bookedSlots: string[]): boolean {
  if (!slotTime || typeof slotTime !== 'string') return false;
  return !bookedSlots.includes(slotTime);
}

export function generateAvailableSlots(dateStr: string): string[] {
  const times = ['09:30 AM', '11:00 AM', '01:30 PM', '03:00 PM', '04:30 PM'];
  return times.map((t) => `${dateStr} at ${t}`);
}
