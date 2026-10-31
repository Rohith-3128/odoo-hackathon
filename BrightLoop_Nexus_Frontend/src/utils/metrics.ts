/**
 * Brightloop Nexus - Financial metrics calculation engine
 */

export interface SubRecord {
  id: string;
  price: number;
  billingInterval: 'monthly' | 'quarterly' | 'annual';
  status: 'active' | 'trialing' | 'paused' | 'canceled' | 'past_due';
  nextBillingDate: string;
}

export interface InvoiceRecord {
  id: string;
  total: number;
  amountPaid: number;
  amountDue: number;
  status: 'draft' | 'unpaid' | 'paid' | 'overdue' | 'void';
  dueDate: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  status: 'succeeded' | 'pending' | 'failed';
}

export function calculateMRR(subscriptions: SubRecord[]): number {
  const active = subscriptions.filter((s) => s.status === 'active');
  const total = active.reduce((acc, s) => {
    if (s.billingInterval === 'monthly') return acc + s.price;
    if (s.billingInterval === 'quarterly') return acc + s.price / 3;
    if (s.billingInterval === 'annual') return acc + s.price / 12;
    return acc + s.price;
  }, 0);
  return Math.round(total);
}

export function calculateARR(mrr: number): number {
  return mrr * 12;
}

export function calculateFinancials(
  invoices: InvoiceRecord[],
  payments: PaymentRecord[],
  referenceDate: Date = new Date()
) {
  const totalInvoiced = invoices
    .filter((i) => i.status !== 'void')
    .reduce((sum, i) => sum + i.total, 0);

  const totalCollected = payments
    .filter((p) => p.status === 'succeeded')
    .reduce((sum, p) => sum + p.amount, 0);

  const outstandingBalance = invoices
    .filter((i) => i.status === 'unpaid' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.amountDue, 0);

  const overdueInvoices = invoices.filter((i) => {
    if (i.status === 'paid' || i.status === 'void') return false;
    return new Date(i.dueDate) < referenceDate;
  });

  const overdueBalance = overdueInvoices.reduce((sum, i) => sum + i.amountDue, 0);

  return {
    totalInvoiced,
    totalCollected,
    outstandingBalance,
    overdueInvoicesCount: overdueInvoices.length,
    overdueBalance,
  };
}

export function getUpcomingRenewals(
  subscriptions: SubRecord[],
  withinDays: number = 30,
  referenceDate: Date = new Date()
): SubRecord[] {
  const cutoff = new Date(referenceDate.getTime() + withinDays * 24 * 60 * 60 * 1000);
  return subscriptions.filter((s) => {
    if (s.status !== 'active') return false;
    const renew = new Date(s.nextBillingDate);
    return renew >= referenceDate && renew <= cutoff;
  });
}
