import React, { useEffect, useState } from 'react';
import { api, DashboardMetrics, Invoice, Payment, Subscription } from '../../api/client';
import { PageHeader, StatCard } from './DesignSystem';
import { formatCurrency } from '../../utils/pricing';
import { Download } from 'lucide-react';

export const FinancialReportsView: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const loadReportData = async () => {
    try {
      const [m, invs, pays, subs] = await Promise.all([
        api.dashboard.getMetrics(),
        api.invoices.list(),
        api.payments.list(),
        api.subscriptions.list(),
      ]);
      setMetrics(m);
      setInvoices(invs);
      setPayments(pays);
      setSubscriptions(subs);
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['InvoiceNumber,Customer,Total,Status,DueDate']
        .concat(invoices.map((i) => `${i.invoiceNumber},${i.customerName},${i.total},${i.status},${i.dueDate}`))
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nexus_financial_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <PageHeader
        title="Financial & Audit Reports"
        description="Comprehensive recurring revenue reconciliation and accounting statements."
        breadcrumbs={['EZbill', 'Financial Reports']}
        action={
          <button
            type="button"
            className="btn-primary"
            style={{ height: '40px', padding: '0 20px', fontSize: '13px' }}
            onClick={handleExportCSV}
          >
            <Download size={14} style={{ marginRight: '6px' }} />
            Export Ledger CSV
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <StatCard
          title="Contracted MRR"
          value={formatCurrency(metrics?.monthlyRecurringRevenue || 0)}
          subtitle="Monthly recurring revenue run rate"
        />
        <StatCard
          title="Contracted ARR"
          value={formatCurrency(metrics?.annualRecurringRevenue || 0)}
          subtitle="12-month projected revenue"
        />
        <StatCard
          title="Gross Invoiced"
          value={formatCurrency(metrics?.totalInvoiced || 0)}
          subtitle="Total accounts receivable invoiced"
        />
        <StatCard
          title="Realized Cash"
          value={formatCurrency(metrics?.totalCollected || 0)}
          subtitle="Cleared bank deposits"
          trend="Audited"
        />
      </div>

      <div style={{ border: '1px solid var(--border-soft)', borderRadius: '16px', background: '#ffffff', padding: '24px', marginBottom: '28px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: '8px' }}>
          Variance & Reconciliation Analysis
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px' }}>
          Distinguishing recognized invoiced obligations from cash payments collected into the operating account.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px', border: '1px solid var(--border-soft)', borderRadius: '12px', background: 'rgb(253, 253, 253)' }}>
            <span style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Collection Efficiency Rate
            </span>
            <div style={{ fontSize: '28px', fontWeight: 700, margin: '8px 0', color: '#17c964' }}>
              {metrics && metrics.totalInvoiced > 0
                ? `${Math.round((metrics.totalCollected / metrics.totalInvoiced) * 100)}%`
                : '100%'}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Proportion of invoiced receivables cleared to date.
            </p>
          </div>

          <div style={{ padding: '16px', border: '1px solid var(--border-soft)', borderRadius: '12px', background: 'rgb(253, 253, 253)' }}>
            <span style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Outstanding Receivables (AR)
            </span>
            <div style={{ fontSize: '28px', fontWeight: 700, margin: '8px 0' }}>
              {formatCurrency(metrics?.outstandingBalance || 0)}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Open invoices awaiting settlement.
            </p>
          </div>

          <div style={{ padding: '16px', border: '1px solid var(--border-soft)', borderRadius: '12px', background: 'rgb(253, 253, 253)' }}>
            <span style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Overdue Risk Exposure
            </span>
            <div style={{ fontSize: '28px', fontWeight: 700, margin: '8px 0', color: metrics?.overdueBalance ? '#ef4444' : '#0a0a0a' }}>
              {formatCurrency(metrics?.overdueBalance || 0)}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
              {metrics?.overdueInvoicesCount || 0} overdue invoices exceeding grace terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
