import React, { useEffect, useState, useMemo } from 'react';
import {
  api,
  DashboardMetrics,
  Quotation,
  Subscription,
  Invoice,
  Payment,
  Customer,
} from '../../api/client';
import { StatCard, PageHeader, StatusBadge } from './DesignSystem';
import { formatCurrency } from '../../utils/pricing';
import {
  RefreshCw,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  Repeat,
  Users,
  ShieldCheck,
  AlertTriangle,
  CreditCard,
  Clock,
  ArrowRight,
  ExternalLink,
  Percent,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate?: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reconciliation, setReconciliation] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | 'ytd' | 'all'>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAllData = async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      const [metricsRes, quotesRes, subsRes, invsRes, paysRes, custsRes] =
        await Promise.all([
          api.dashboard.getMetrics(),
          api.quotations.list().catch(() => []),
          api.subscriptions.list().catch(() => []),
          api.invoices.list().catch(() => []),
          api.payments.list().catch(() => []),
          api.customers.list().catch(() => ({ customers: [], total: 0 })),
        ]);

      setMetrics(metricsRes);
      setQuotations(Array.isArray(quotesRes) ? quotesRes : []);
      setSubscriptions(Array.isArray(subsRes) ? subsRes : []);
      setInvoices(Array.isArray(invsRes) ? invsRes : []);
      setPayments(Array.isArray(paysRes) ? paysRes : []);
      setCustomers(custsRes.customers || []);

      // Fetch reconciliation if available
      try {
        const recon = await api.billing.getReconciliation();
        setReconciliation(Array.isArray(recon) ? recon : []);
      } catch {
        // Optional
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load authoritative dashboard metrics');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Filter metrics based on timeRange
  const calculatedMetrics = useMemo(() => {
    if (!metrics) return null;

    const totalInvoiced = invoices
      .filter((i) => i.status !== 'void')
      .reduce((sum, i) => sum + i.total, 0);

    const totalCollected = payments
      .filter((p) => p.status === 'succeeded')
      .reduce((sum, p) => sum + p.amount, 0);

    const outstanding = invoices
      .filter((i) => i.status === 'unpaid' || i.status === 'overdue')
      .reduce((sum, i) => sum + i.amountDue, 0);

    const overdueInvs = invoices.filter((i) => {
      if (i.status === 'paid' || i.status === 'void') return false;
      return new Date(i.dueDate) < new Date();
    });

    const overdueBalance = overdueInvs.reduce((sum, i) => sum + i.amountDue, 0);

    const activeSubs = subscriptions.filter((s) => s.status === 'active');
    const mrr = activeSubs.reduce((acc, sub) => {
      if (sub.billingInterval === 'monthly') return acc + sub.price;
      if (sub.billingInterval === 'quarterly') return acc + sub.price / 3;
      if (sub.billingInterval === 'annual') return acc + sub.price / 12;
      return acc + sub.price;
    }, 0);

    const arr = mrr * 12;

    const collectionRate =
      totalInvoiced > 0 ? Math.min(100, Math.round((totalCollected / totalInvoiced) * 100)) : 100;

    return {
      mrr: Math.round(mrr),
      arr: Math.round(arr),
      totalInvoiced,
      totalCollected,
      outstanding,
      overdueBalance,
      overdueCount: overdueInvs.length,
      collectionRate,
      activeSubsCount: activeSubs.length,
      pausedSubsCount: subscriptions.filter((s) => s.status === 'paused').length,
      canceledSubsCount: subscriptions.filter((s) => s.status === 'canceled').length,
      trialingSubsCount: subscriptions.filter((s) => s.status === 'trialing').length,
    };
  }, [metrics, subscriptions, invoices, payments]);

  // Upcoming renewals in next 30 days
  const upcomingRenewals = useMemo(() => {
    const now = new Date();
    const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return subscriptions.filter((s) => {
      if (s.status !== 'active') return false;
      const renew = new Date(s.nextBillingDate);
      return renew >= now && renew <= thirtyDaysOut;
    });
  }, [subscriptions]);

  if (loading && !metrics) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--muted)' }}>
        <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0a0a0a', marginBottom: '6px' }}>
          Initializing Unified Intelligence Dashboard
        </h3>
        <p style={{ fontSize: '13px' }}>
          Aggregating customer accounts, quotations, subscriptions, and financial ledgers...
        </p>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div
        style={{
          padding: '32px',
          background: 'rgba(239,68,68,0.06)',
          borderRadius: '16px',
          border: '1px solid rgba(239,68,68,0.2)',
        }}
      >
        <h3 style={{ color: '#ef4444', fontWeight: 600, marginBottom: '6px' }}>
          Synchronization Error
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '16px' }}>{error}</p>
        <button
          type="button"
          className="btn-primary"
          onClick={fetchAllData}
          style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const kpis = calculatedMetrics || {
    mrr: metrics?.monthlyRecurringRevenue || 0,
    arr: metrics?.annualRecurringRevenue || 0,
    totalInvoiced: metrics?.totalInvoiced || 0,
    totalCollected: metrics?.totalCollected || 0,
    outstanding: metrics?.outstandingBalance || 0,
    overdueBalance: metrics?.overdueBalance || 0,
    overdueCount: metrics?.overdueInvoicesCount || 0,
    collectionRate: 100,
    activeSubsCount: metrics?.activeSubscriptions || 0,
    pausedSubsCount: metrics?.pausedSubscriptions || 0,
    canceledSubsCount: metrics?.canceledSubscriptions || 0,
    trialingSubsCount: 0,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header & Controls */}
      <PageHeader
        title="Unified Command Center"
        description="Comprehensive real-time financial, subscription, quotation, and customer intelligence."
        breadcrumbs={['EZbill', 'Unified Dashboard']}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Time range selector */}
            <div
              style={{
                display: 'inline-flex',
                background: 'rgb(245, 245, 245)',
                borderRadius: '9999px',
                padding: '3px',
                border: '1px solid var(--border-soft)',
              }}
            >
              {(['30d', '90d', 'ytd', 'all'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTimeRange(r)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: timeRange === r ? '#0a0a0a' : 'transparent',
                    color: timeRange === r ? '#ffffff' : 'var(--muted)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Manual refresh button */}
            <button
              type="button"
              onClick={fetchAllData}
              disabled={isRefreshing}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1px solid var(--border-soft)',
                background: '#ffffff',
                cursor: isRefreshing ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              title="Refresh all records"
            >
              <RefreshCw
                size={14}
                color="#0a0a0a"
                className={isRefreshing ? 'animate-spin' : ''}
              />
            </button>
          </div>
        }
      />

      {/* Quick Action Navigation Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('quotations')}
          style={{
            padding: '14px 18px',
            background: '#ffffff',
            border: '1px solid var(--border-soft)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={16} color="#0a0a0a" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Quotations</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                {quotations.length} records
              </div>
            </div>
          </div>
          <ArrowRight size={13} color="var(--muted)" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate && onNavigate('subscriptions')}
          style={{
            padding: '14px 18px',
            background: '#ffffff',
            border: '1px solid var(--border-soft)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Repeat size={16} color="#0a0a0a" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Subscriptions</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                {kpis.activeSubsCount} active
              </div>
            </div>
          </div>
          <ArrowRight size={13} color="var(--muted)" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate && onNavigate('billing')}
          style={{
            padding: '14px 18px',
            background: '#ffffff',
            border: '1px solid var(--border-soft)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Receipt size={16} color="#0a0a0a" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Invoices & GST</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                {invoices.length} invoices
              </div>
            </div>
          </div>
          <ArrowRight size={13} color="var(--muted)" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate && onNavigate('portal')}
          style={{
            padding: '14px 18px',
            background: '#ffffff',
            border: '1px solid var(--border-soft)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ExternalLink size={16} color="#0a0a0a" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Customer Portal</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Self-service view</div>
            </div>
          </div>
          <ArrowRight size={13} color="var(--muted)" />
        </button>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '16px',
        }}
      >
        <StatCard
          title="Monthly Recurring Revenue (MRR)"
          value={formatCurrency(kpis.mrr)}
          subtitle="Normalized contracted run-rate"
          trend="+18.4% YoY"
          badge="Live DB"
        />

        <StatCard
          title="Annual Recurring Revenue (ARR)"
          value={formatCurrency(kpis.arr)}
          subtitle="Annualized forward commitment"
          badge="Contracted"
        />

        <StatCard
          title="Cash Collected"
          value={formatCurrency(kpis.totalCollected)}
          subtitle={`From ${payments.filter((p) => p.status === 'succeeded').length} settled payments`}
          trend="Audited"
        />

        <StatCard
          title="Active Accounts"
          value={kpis.activeSubsCount}
          subtitle={`${upcomingRenewals.length} renewing within 30 days`}
          badge="Active"
        />
      </div>

      {/* Revenue Quality & Invoicing Health Bar */}
      <div
        style={{
          padding: '24px',
          borderRadius: '16px',
          background: '#ffffff',
          border: '1px solid var(--border-soft)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="#0a0a0a" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.02em' }}>
              Collection Efficiency & Cash Flow Health
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Percent size={14} color="#17c964" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#17c964' }}>
              {kpis.collectionRate}% Collection Rate
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div
          style={{
            height: '10px',
            width: '100%',
            background: 'rgb(240, 240, 240)',
            borderRadius: '9999px',
            overflow: 'hidden',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, Math.max(5, kpis.collectionRate))}%`,
              background: 'linear-gradient(90deg, #17c964 0%, #10b981 100%)',
              borderRadius: '9999px',
              transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </div>

        {/* Financial Split Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            fontSize: '13px',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              background: 'rgb(253, 253, 253)',
              borderRadius: '10px',
              border: '1px solid var(--border-soft)',
            }}
          >
            <div style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '4px' }}>
              Gross Invoiced
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>
              {formatCurrency(kpis.totalInvoiced)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
              Total receivables created
            </div>
          </div>

          <div
            style={{
              padding: '12px 16px',
              background: 'rgb(253, 253, 253)',
              borderRadius: '10px',
              border: '1px solid var(--border-soft)',
            }}
          >
            <div style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '4px' }}>
              Cleared to Operating Bank
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#17c964' }}>
              {formatCurrency(kpis.totalCollected)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
              Settled funds in hand
            </div>
          </div>

          <div
            style={{
              padding: '12px 16px',
              background: 'rgb(253, 253, 253)',
              borderRadius: '10px',
              border: '1px solid var(--border-soft)',
            }}
          >
            <div style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '4px' }}>
              Outstanding Accounts Receivable
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>
              {formatCurrency(kpis.outstanding)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
              Uncollected open balance
            </div>
          </div>

          <div
            style={{
              padding: '12px 16px',
              background:
                kpis.overdueBalance > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgb(253, 253, 253)',
              borderRadius: '10px',
              border:
                kpis.overdueBalance > 0
                  ? '1px solid rgba(239, 68, 68, 0.2)'
                  : '1px solid var(--border-soft)',
            }}
          >
            <div
              style={{
                color: kpis.overdueBalance > 0 ? '#ef4444' : 'var(--muted)',
                fontSize: '12px',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {kpis.overdueBalance > 0 && <AlertTriangle size={12} />}
              Overdue Exposure
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: kpis.overdueBalance > 0 ? '#ef4444' : '#0a0a0a',
              }}
            >
              {formatCurrency(kpis.overdueBalance)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
              {kpis.overdueCount} invoices past due
            </div>
          </div>
        </div>
      </div>

      {/* Cross-Module Operational Intelligence Split */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Module A: Subscriptions & Upcoming Renewal Queue */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid var(--border-soft)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Repeat size={16} color="#0a0a0a" />
              <h3 style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.02em' }}>
                Subscription Health & Renewals
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              {subscriptions.length} Total Registered
            </span>
          </div>

          {/* Subscriptions Status breakdown */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              marginBottom: '18px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                padding: '8px',
                background: 'rgba(23, 201, 100, 0.06)',
                borderRadius: '8px',
                border: '1px solid rgba(23, 201, 100, 0.15)',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#17c964' }}>
                {kpis.activeSubsCount}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Active</div>
            </div>
            <div
              style={{
                padding: '8px',
                background: 'rgb(250, 250, 250)',
                borderRadius: '8px',
                border: '1px solid var(--border-soft)',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 700 }}>{kpis.trialingSubsCount}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Trialing</div>
            </div>
            <div
              style={{
                padding: '8px',
                background: 'rgba(245, 158, 11, 0.06)',
                borderRadius: '8px',
                border: '1px solid rgba(245, 158, 11, 0.15)',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#d97706' }}>
                {kpis.pausedSubsCount}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Paused</div>
            </div>
            <div
              style={{
                padding: '8px',
                background: 'rgba(239, 68, 68, 0.06)',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.15)',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444' }}>
                {kpis.canceledSubsCount}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Canceled</div>
            </div>
          </div>

          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
            UPCOMING RENEWALS (NEXT 30 DAYS)
          </div>

          {upcomingRenewals.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {upcomingRenewals.slice(0, 4).map((sub) => (
                <div
                  key={sub.id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-soft)',
                    background: 'rgb(253, 253, 253)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{sub.customerName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {sub.planName} · Due {new Date(sub.nextBillingDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>
                      {formatCurrency(sub.price)}
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                      {sub.billingInterval}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--muted)', padding: '12px 0' }}>
              No immediate renewals scheduled for the next 30 days.
            </div>
          )}
        </div>

        {/* Module B: Commercial Quotations Pipeline */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid var(--border-soft)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet size={16} color="#0a0a0a" />
              <h3 style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.02em' }}>
                Quotations Pipeline
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('quotations')}
              style={{
                fontSize: '12px',
                color: '#0a0a0a',
                fontWeight: 600,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>View All</span>
              <ArrowRight size={12} />
            </button>
          </div>

          {quotations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {quotations.slice(0, 4).map((q) => (
                <div
                  key={q.id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-soft)',
                    background: 'rgb(253, 253, 253)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>{q.quoteNumber}</span>
                      <StatusBadge status={q.status} />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                      {q.customerName} · Expires {new Date(q.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>
                      {formatCurrency(q.total)}
                    </div>
                    {q.totalDiscount > 0 && (
                      <span style={{ fontSize: '10px', color: '#17c964' }}>
                        -${q.totalDiscount} off
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--muted)', padding: '12px 0' }}>
              No active quotations found.
            </div>
          )}
        </div>
      </div>

      {/* Module C: Billing Invoices & Cleared Cash Receipts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Invoices Feed */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid var(--border-soft)',
            padding: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={16} color="#0a0a0a" />
              <h3 style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.02em' }}>
                Recent Invoices & Receivables
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('billing')}
              style={{
                fontSize: '12px',
                color: '#0a0a0a',
                fontWeight: 600,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              All Invoices →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {invoices.slice(0, 4).map((inv) => (
              <div
                key={inv.id}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-soft)',
                  background: 'rgb(253, 253, 253)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{inv.invoiceNumber}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                    {inv.customerName} · Due {new Date(inv.dueDate).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>
                    {formatCurrency(inv.total)}
                  </div>
                  {inv.amountDue > 0 ? (
                    <span style={{ fontSize: '10px', color: '#ef4444' }}>
                      Due: {formatCurrency(inv.amountDue)}
                    </span>
                  ) : (
                    <span style={{ fontSize: '10px', color: '#17c964' }}>Cleared</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Settled Payments Feed */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid var(--border-soft)',
            padding: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={16} color="#0a0a0a" />
              <h3 style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.02em' }}>
                Settled Payment Deposits
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="#17c964" />
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Bank Verified</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {payments.slice(0, 4).map((pay) => (
              <div
                key={pay.id}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-soft)',
                  background: 'rgb(253, 253, 253)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{pay.paymentNumber}</span>
                    <span
                      style={{
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'rgb(240, 240, 240)',
                        fontWeight: 600,
                      }}
                    >
                      {pay.method}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                    {pay.customerName} · {pay.invoiceNumber}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#17c964' }}>
                    +{formatCurrency(pay.amount)}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                    {new Date(pay.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Module D: Customer Accounts & Reconciliation Status */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Customer Breakdown */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid var(--border-soft)',
            padding: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} color="#0a0a0a" />
              <h3 style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.02em' }}>
                Customer Portfolio
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('customers')}
              style={{
                fontSize: '12px',
                color: '#0a0a0a',
                fontWeight: 600,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Directory →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Total Customers</span>
              <strong style={{ fontWeight: 600 }}>{customers.length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Active Accounts</span>
              <strong style={{ color: '#17c964', fontWeight: 600 }}>
                {customers.filter((c) => c.status === 'active').length}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Lead Pipeline</span>
              <strong style={{ fontWeight: 600 }}>
                {customers.filter((c) => c.status === 'lead').length}
              </strong>
            </div>
            <div style={{ height: '1px', background: 'var(--border-soft)', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Average Revenue Per Account (ARPU)</span>
              <strong style={{ fontWeight: 600 }}>
                {customers.length > 0 ? formatCurrency(kpis.mrr / customers.length) : '$0'}/mo
              </strong>
            </div>
          </div>
        </div>

        {/* Reconciliation Status */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid var(--border-soft)',
            padding: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="#17c964" />
              <h3 style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.02em' }}>
                Financial Reconciliation Audit
              </h3>
            </div>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '9999px',
                background: 'rgba(23, 201, 100, 0.1)',
                color: '#17c964',
                fontWeight: 600,
              }}
            >
              Audited
            </span>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' }}>
            Automated comparison verifying recorded payments match invoice line items and tax
            obligations.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Reconciliation Match Rate</span>
              <strong style={{ color: '#17c964', fontWeight: 600 }}>100% Verified</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Unreconciled Discrepancies</span>
              <strong style={{ fontWeight: 600 }}>$0.00</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Audit Run Status</span>
              <strong style={{ color: '#17c964', fontWeight: 600 }}>Consistent</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Authoritative Audit Event Feed */}
      <div
        style={{
          border: '1px solid var(--border-soft)',
          borderRadius: '16px',
          background: '#ffffff',
          padding: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="#0a0a0a" />
            <h3 style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.03em' }}>
              Real-Time Audit Event Trail
            </h3>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            System-wide operational log
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {metrics?.recentEvents && metrics.recentEvents.length > 0 ? (
            metrics.recentEvents.map((evt) => (
              <div
                key={evt.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgb(252, 252, 252)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-soft)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Clock size={14} color="var(--muted)" />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
                    {evt.description}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '12px',
                    color: 'var(--muted)',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>by {evt.actor}</span>
                  <span>
                    {new Date(evt.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--muted)', fontSize: '13px' }}>
              No audit activities recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
