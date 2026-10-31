import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMRR,
  calculateARR,
  calculateFinancials,
  getUpcomingRenewals,
  SubRecord,
  InvoiceRecord,
  PaymentRecord,
} from './metrics';

test('calculateMRR normalizes monthly, quarterly, and annual intervals correctly', () => {
  const subs: SubRecord[] = [
    { id: '1', price: 1000, billingInterval: 'monthly', status: 'active', nextBillingDate: '2026-11-15' },
    { id: '2', price: 3000, billingInterval: 'quarterly', status: 'active', nextBillingDate: '2026-11-20' }, // 1000/mo
    { id: '3', price: 12000, billingInterval: 'annual', status: 'active', nextBillingDate: '2026-12-01' },  // 1000/mo
    { id: '4', price: 5000, billingInterval: 'monthly', status: 'paused', nextBillingDate: '2026-11-10' },  // ignored
    { id: '5', price: 2000, billingInterval: 'monthly', status: 'canceled', nextBillingDate: '2026-11-10' }, // ignored
  ];

  const mrr = calculateMRR(subs);
  assert.equal(mrr, 3000);
});

test('calculateARR multiplies MRR by 12 accurately', () => {
  assert.equal(calculateARR(10000), 120000);
});

test('calculateFinancials distinguishes invoiced revenue from collected cash', () => {
  const invoices: InvoiceRecord[] = [
    { id: 'i1', total: 5000, amountPaid: 5000, amountDue: 0, status: 'paid', dueDate: '2026-10-15' },
    { id: 'i2', total: 3000, amountPaid: 0, amountDue: 3000, status: 'unpaid', dueDate: '2026-11-15' },
    { id: 'i3', total: 2000, amountPaid: 0, amountDue: 2000, status: 'overdue', dueDate: '2026-10-01' },
    { id: 'i4', total: 1000, amountPaid: 0, amountDue: 1000, status: 'void', dueDate: '2026-09-01' },
  ];

  const payments: PaymentRecord[] = [
    { id: 'p1', amount: 5000, status: 'succeeded' },
    { id: 'p2', amount: 2000, status: 'failed' },
  ];

  const refDate = new Date('2026-10-25T00:00:00.000Z');
  const result = calculateFinancials(invoices, payments, refDate);

  assert.equal(result.totalInvoiced, 10000); // 5000 + 3000 + 2000
  assert.equal(result.totalCollected, 5000); // only succeeded
  assert.equal(result.outstandingBalance, 5000); // 3000 + 2000
  assert.equal(result.overdueInvoicesCount, 1);
  assert.equal(result.overdueBalance, 2000);
});

test('getUpcomingRenewals filters active subs renewing within horizon', () => {
  const refDate = new Date('2026-10-30T00:00:00.000Z');
  const subs: SubRecord[] = [
    { id: '1', price: 1000, billingInterval: 'monthly', status: 'active', nextBillingDate: '2026-11-10T00:00:00.000Z' },
    { id: '2', price: 2000, billingInterval: 'monthly', status: 'active', nextBillingDate: '2026-12-15T00:00:00.000Z' }, // > 30 days
    { id: '3', price: 3000, billingInterval: 'monthly', status: 'canceled', nextBillingDate: '2026-11-05T00:00:00.000Z' }, // canceled
  ];

  const upcoming = getUpcomingRenewals(subs, 30, refDate);
  assert.equal(upcoming.length, 1);
  assert.equal(upcoming[0].id, '1');
});
