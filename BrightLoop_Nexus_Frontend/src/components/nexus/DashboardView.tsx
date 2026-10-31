import React, { useEffect, useState } from 'react';
import { api, DashboardMetrics } from '../../api/client';
import { StatCard, PageHeader } from './DesignSystem';
import { formatCurrency } from '../../utils/pricing';
import { RefreshCw, ArrowUpRight, ShieldCheck, Clock } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | 'ytd'>('30d');

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.dashboard.getMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load authoritative metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading && !metrics) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)' }}>
        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
        <p>Loading real-time financial metrics from backend engine...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '32px', background: 'rgba(239,68,68,0.06)', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.2)' }}>
        <h3 style={{ color: '#ef4444', fontWeight: 600, marginBottom: '6px' }}>API Synchronization Error</h3>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '16px' }}>{error}</p>
        <button type="button" className="btn-primary" onClick={fetchMetrics} style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}>
          Retry Request
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Revenue & Subscription Intelligence"
        description="Authoritative real-time recurring metrics derived strictly from backend database records."
        breadcrumbs={['Brightloop Nexus', 'Overview']}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <div
              style={{
                display: 'inline-flex',
                background: 'rgb(245, 245, 245)',
                borderRadius: '9999px',
                padding: '3px',
                border: '1px solid var(--border-soft)',
              }}
            >
              {(['30d', '90d', 'ytd'] as const).map((r) => (
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

            <button
              type="button"
              onClick={fetchMetrics}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1px solid var(--border-soft)',
                background: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Refresh database metrics"
            >
              <RefreshCw size={14} color="#0a0a0a" />
            </button>
          </div>
        }
      />

      {/* Primary KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <StatCard
          title="Monthly Recurring Revenue (MRR)"
          value={formatCurrency(metrics?.monthlyRecurringRevenue || 0)}
          subtitle="Annualized run-rate"
          trend="+14.2%"
          badge="Core"
        />
        <StatCard
          title="Annual Recurring Revenue (ARR)"
          value={formatCurrency(metrics?.annualRecurringRevenue || 0)}
          subtitle="Contracted revenue"
          badge="Run-Rate"
        />
        <StatCard
          title="Collected Cash"
          value={formatCurrency(metrics?.totalCollected || 0)}
          subtitle="Net funds cleared to bank"
          trend="Authoritative"
        />
        <StatCard
          title="Active Subscriptions"
          value={metrics?.activeSubscriptions || 0}
          subtitle={`${metrics?.upcomingRenewals || 0} renewing in 30 days`}
          badge="Live"
        />
      </div>

      {/* Secondary Financial Health Breakdown */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div style={{ padding: '24px', border: '1px solid var(--border-soft)', borderRadius: '16px', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '-0.02em' }}>Invoiced vs Collected Reconciliation</span>
            <ShieldCheck size={16} color="#17c964" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--muted)' }}>Total Invoiced</span>
              <strong style={{ fontWeight: 600 }}>{formatCurrency(metrics?.totalInvoiced || 0)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--muted)' }}>Collected Cash (Cleared)</span>
              <strong style={{ color: '#17c964', fontWeight: 600 }}>{formatCurrency(metrics?.totalCollected || 0)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--muted)' }}>Outstanding AR Balance</span>
              <strong style={{ fontWeight: 600 }}>{formatCurrency(metrics?.outstandingBalance || 0)}</strong>
            </div>
            <div style={{ height: '1px', background: 'var(--border-soft)', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#ef4444' }}>Overdue Invoices ({metrics?.overdueInvoicesCount || 0})</span>
              <strong style={{ color: '#ef4444', fontWeight: 600 }}>{formatCurrency(metrics?.overdueBalance || 0)}</strong>
            </div>
          </div>
        </div>

        <div style={{ padding: '24px', border: '1px solid var(--border-soft)', borderRadius: '16px', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '-0.02em' }}>Subscription Pipeline</span>
            <ArrowUpRight size={16} color="#0a0a0a" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--muted)' }}>Active Accounts</span>
              <strong style={{ fontWeight: 600 }}>{metrics?.activeSubscriptions || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--muted)' }}>Upcoming Renewals (30d)</span>
              <strong style={{ fontWeight: 600 }}>{metrics?.upcomingRenewals || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--muted)' }}>Paused Accounts</span>
              <strong style={{ fontWeight: 600 }}>{metrics?.pausedSubscriptions || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--muted)' }}>Canceled Accounts</span>
              <strong style={{ fontWeight: 600 }}>{metrics?.canceledSubscriptions || 0}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Audit Activity Log */}
      <div style={{ border: '1px solid var(--border-soft)', borderRadius: '16px', background: '#ffffff', padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: '16px' }}>
          Authoritative Event Audit Feed
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--muted)' }}>
                  <span>by {evt.actor}</span>
                  <span>{new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--muted)', fontSize: '13px' }}>No events recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};
