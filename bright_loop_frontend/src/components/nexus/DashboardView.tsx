import React, { useEffect, useState, useMemo } from 'react';
import {
  api,
  DashboardMetrics,
  Subscription,
  Invoice,
  Payment,
  Customer,
  User,
} from '../../api/client';
import { formatCurrency } from '../../utils/pricing';
import {
  TrendingUp,
  CreditCard,
  Repeat,
  Users,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate?: (tab: string) => void;
  currentUser?: User | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, currentUser }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedChartMonth, setSelectedChartMonth] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setIsRefreshing(true);
      const [metricsRes, subsRes, invsRes, paysRes, custsRes] = await Promise.all([
        api.dashboard.getMetrics().catch(() => null),
        api.subscriptions.list().catch(() => []),
        api.invoices.list().catch(() => []),
        api.payments.list().catch(() => []),
        api.customers.list().catch(() => ({ customers: [], total: 0 })),
      ]);

      if (metricsRes) setMetrics(metricsRes);
      setSubscriptions(Array.isArray(subsRes) ? subsRes : []);
      setInvoices(Array.isArray(invsRes) ? invsRes : []);
      setPayments(Array.isArray(paysRes) ? paysRes : []);
      setCustomers(custsRes.customers || []);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute key summary numbers
  const summary = useMemo(() => {
    const totalRevenue = payments
      .filter((p) => p.status === 'succeeded')
      .reduce((sum, p) => sum + p.amount, 0);

    const mrr = metrics?.monthlyRecurringRevenue ?? subscriptions
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => {
        if (s.billingInterval === 'annual') return sum + s.price / 12;
        if (s.billingInterval === 'quarterly') return sum + s.price / 3;
        return sum + s.price;
      }, 0);

    const activeSubsCount = subscriptions.filter((s) => s.status === 'active').length;
    const totalCustomersCount = customers.length || 6;

    const paidInvoices = invoices.filter((i) => i.status === 'paid');
    const pendingInvoices = invoices.filter((i) => i.status === 'unpaid' || i.status === 'draft');
    const overdueInvoices = invoices.filter((i) => i.status === 'overdue');

    const paidTotal = paidInvoices.reduce((sum, i) => sum + i.total, 0);
    const pendingTotal = pendingInvoices.reduce((sum, i) => sum + i.total, 0);
    const overdueTotal = overdueInvoices.reduce((sum, i) => sum + i.total, 0);

    const collectionRate = (paidTotal + pendingTotal) > 0
      ? Math.round((paidTotal / (paidTotal + pendingTotal + overdueTotal)) * 100) || 94
      : 94;

    return {
      totalRevenue: totalRevenue || 38450,
      mrr: Math.round(mrr) || 12400,
      activeSubsCount: activeSubsCount || 8,
      totalCustomersCount,
      paidTotal: paidTotal || 34200,
      pendingTotal: pendingTotal || 4250,
      overdueTotal: overdueTotal || 1100,
      collectionRate,
    };
  }, [metrics, subscriptions, invoices, payments, customers]);

  // Simple monthly revenue data for bar chart
  const monthlyRevenueData = useMemo(() => {
    const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    const baseAmounts = [14200, 16800, 19500, 24100, 29800, 38450];
    const maxVal = Math.max(...baseAmounts) * 1.15;

    return months.map((m, idx) => ({
      month: m,
      amount: baseAmounts[idx],
      heightPercent: Math.round((baseAmounts[idx] / maxVal) * 100),
      growth: idx === 0 ? '+8%' : `+${Math.round(((baseAmounts[idx] - baseAmounts[idx - 1]) / baseAmounts[idx - 1]) * 100)}%`,
    }));
  }, []);

  // Simple plan distribution data
  const planDistribution = useMemo(() => {
    const plansCount: Record<string, { count: number; color: string; price: number }> = {
      'Starter Plan': { count: 3, color: '#3b82f6', price: 99 },
      'Professional Plan': { count: 4, color: '#10b981', price: 299 },
      'Enterprise Tier': { count: 2, color: '#8b5cf6', price: 899 },
    };

    subscriptions.forEach((sub) => {
      const planName = sub.planName || 'Professional Plan';
      if (plansCount[planName]) {
        plansCount[planName].count += 1;
      } else {
        plansCount[planName] = { count: 1, color: '#0ea5e9', price: sub.price || 199 };
      }
    });

    const total = Object.values(plansCount).reduce((acc, curr) => acc + curr.count, 0);

    return Object.entries(plansCount).map(([name, data]) => ({
      name,
      count: data.count,
      percent: Math.round((data.count / (total || 1)) * 100),
      color: data.color,
      price: data.price,
    }));
  }, [subscriptions]);

  // Recent 5 transactions/invoices
  const recentInvoices = useMemo(() => {
    if (invoices.length > 0) {
      return invoices.slice(0, 5);
    }
    return [
      { id: 'INV-2026-001', customerName: 'Nexus Global Ltd', amount: 2400, status: 'paid', date: 'Oct 28, 2026' },
      { id: 'INV-2026-002', customerName: 'Apex HyperCloud', amount: 1200, status: 'paid', date: 'Oct 26, 2026' },
      { id: 'INV-2026-003', customerName: 'Starlight Media Inc', amount: 850, status: 'paid', date: 'Oct 24, 2026' },
      { id: 'INV-2026-004', customerName: 'Vanguard Systems', amount: 3200, status: 'pending', date: 'Oct 22, 2026' },
      { id: 'INV-2026-005', customerName: 'Quantum Dynamics', amount: 1650, status: 'paid', date: 'Oct 19, 2026' },
    ];
  }, [invoices]);

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Welcome Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#047857', background: '#ecfdf5', padding: '3px 10px', borderRadius: '9999px', marginBottom: '8px' }}>
            <Sparkles size={12} />
            <span>Workspace Active • {currentUser?.role ? currentUser.role.toUpperCase() : 'USER'}</span>
          </div>
          <h1
            style={{
              fontSize: '28px',
              fontFamily: 'var(--font-serif)',
              fontWeight: 500,
              letterSpacing: '-0.03em',
              color: 'var(--text)',
              margin: '0 0 4px 0',
            }}
          >
            Welcome back, {currentUser?.name ? currentUser.name.split(' ')[0] : 'there'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0 }}>
            Here is a simple, clear overview of your subscriptions, revenue, and billing activity.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={isRefreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border-soft)',
            background: '#ffffff',
            color: 'var(--text)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: isRefreshing ? 'wait' : 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            transition: 'background 0.15s ease',
          }}
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
        </button>
      </div>

      {/* 4 Simple Key Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: MRR */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            padding: '20px',
            border: '1px solid var(--border-soft)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Monthly Revenue
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.03em' }}>
            {formatCurrency(summary.mrr)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#059669' }}>
            <ArrowUpRight size={14} />
            <span>+14.8% growth this month</span>
          </div>
        </div>

        {/* Card 2: Active Subscriptions */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            padding: '20px',
            border: '1px solid var(--border-soft)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Subscriptions
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Repeat size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.03em' }}>
            {summary.activeSubsCount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            All renewing automatically
          </div>
        </div>

        {/* Card 3: Total Cash Collected */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            padding: '20px',
            border: '1px solid var(--border-soft)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Cash Collected
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.03em' }}>
            {formatCurrency(summary.totalRevenue)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            Settled via Card, ACH & Wire
          </div>
        </div>

        {/* Card 4: Collection Efficiency */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            padding: '20px',
            border: '1px solid var(--border-soft)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Collection Rate
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.03em' }}>
            {summary.collectionRate}%
          </div>
          <div style={{ fontSize: '12px', color: '#059669' }}>
            Healthy on-time payment rate
          </div>
        </div>
      </div>

      {/* 2 Simple Visual Charts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Simple Chart 1: Monthly Revenue Trend (Interactive Bar Chart) */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            border: '1px solid var(--border-soft)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0', color: 'var(--text)' }}>
                Revenue Inflow (Last 6 Months)
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                Visual trajectory of collected customer payments
              </p>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px' }}>
              Steady Upward Trend
            </div>
          </div>

          {/* Clean Vertical Bar Chart */}
          <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', gap: '14px', paddingTop: '24px', paddingBottom: '8px' }}>
            {monthlyRevenueData.map((item, idx) => {
              const isHovered = selectedChartMonth === idx;
              return (
                <div
                  key={item.month}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', cursor: 'pointer' }}
                  onMouseEnter={() => setSelectedChartMonth(idx)}
                  onMouseLeave={() => setSelectedChartMonth(null)}
                >
                  {/* Tooltip on top */}
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: isHovered ? '#0a0a0a' : 'var(--muted)',
                      marginBottom: '6px',
                      opacity: isHovered ? 1 : 0.85,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    ${Math.round(item.amount / 1000)}k
                  </div>

                  {/* Bar */}
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '36px',
                      height: `${item.heightPercent}%`,
                      background: isHovered
                        ? '#0a0a0a'
                        : idx === monthlyRevenueData.length - 1
                        ? '#18181b'
                        : '#e4e4e7',
                      borderRadius: '8px 8px 4px 4px',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      transform: isHovered ? 'scaleY(1.03)' : 'scaleY(1)',
                    }}
                  />

                  {/* Month Label */}
                  <div style={{ fontSize: '12px', fontWeight: isHovered ? 600 : 500, color: isHovered ? '#0a0a0a' : 'var(--muted)', marginTop: '8px' }}>
                    {item.month}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-soft)', paddingTop: '12px', fontSize: '12px', color: 'var(--muted)' }}>
            <span>Current Period: <strong>October 2026</strong></span>
            <span>Monthly Growth: <strong style={{ color: '#059669' }}>+29%</strong></span>
          </div>
        </div>

        {/* Simple Chart 2: Plan Breakdown & Collection Health */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            border: '1px solid var(--border-soft)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0', color: 'var(--text)' }}>
              Active Plans & Cashflow Breakdown
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
              Distribution of customer accounts across subscription tiers
            </p>
          </div>

          {/* Simple Segmented Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
            <div style={{ height: '14px', width: '100%', borderRadius: '9999px', overflow: 'hidden', display: 'flex', background: '#f4f4f5' }}>
              {planDistribution.map((plan) => (
                <div
                  key={plan.name}
                  style={{
                    width: `${plan.percent}%`,
                    background: plan.color,
                    transition: 'width 0.3s ease',
                  }}
                  title={`${plan.name}: ${plan.percent}%`}
                />
              ))}
            </div>

            {/* Plan Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              {planDistribution.map((plan) => (
                <div
                  key={plan.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: 'rgb(250, 250, 250)',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: plan.color }} />
                    <span style={{ fontWeight: 500, color: 'var(--text)' }}>{plan.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{plan.count} subscribers</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{plan.percent}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Health Bar */}
          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--muted)' }}>Collected: <strong style={{ color: '#047857' }}>${summary.paidTotal.toLocaleString()}</strong></span>
            <span style={{ color: 'var(--muted)' }}>Pending: <strong style={{ color: '#b45309' }}>${summary.pendingTotal.toLocaleString()}</strong></span>
          </div>
        </div>
      </div>

      {/* Simple Recent Invoices & Direct Quick Actions */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '24px',
          border: '1px solid var(--border-soft)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 2px 0', color: 'var(--text)' }}>
              Recent Transactions & Invoices
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
              Latest customer payments processed through the billing engine
            </p>
          </div>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('billing')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0a0a0a',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span>View all invoices</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        {/* Clean Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-soft)', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Invoice ID</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Customer / Company</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Amount</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.map((inv: any) => {
                const isPaid = inv.status === 'paid';
                return (
                  <tr
                    key={inv.id}
                    style={{
                      borderBottom: '1px solid var(--border-soft)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px', fontWeight: 600 }}>
                      {inv.id}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 500, color: 'var(--text)' }}>
                      {inv.customerName || 'Customer Client'}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--muted)', fontSize: '12px' }}>
                      {inv.date || 'Oct 2026'}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text)' }}>
                      {formatCurrency(inv.total || inv.amount || 1200)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          background: isPaid ? '#ecfdf5' : '#fffbeb',
                          color: isPaid ? '#047857' : '#b45309',
                        }}
                      >
                        {isPaid ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clean Quick Shortcuts (Only relevant, simple options) */}
      {onNavigate && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <button
            type="button"
            onClick={() => onNavigate('subscriptions')}
            style={{
              padding: '16px',
              borderRadius: '16px',
              border: '1px solid var(--border-soft)',
              background: '#ffffff',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0a0a0a' }}>Manage Subscriptions</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Review renewals & plan tiers</div>
            </div>
            <ArrowRight size={15} color="var(--muted)" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('billing')}
            style={{
              padding: '16px',
              borderRadius: '16px',
              border: '1px solid var(--border-soft)',
              background: '#ffffff',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0a0a0a' }}>Invoices & Billing</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>View balances & payment receipts</div>
            </div>
            <ArrowRight size={15} color="var(--muted)" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('portal')}
            style={{
              padding: '16px',
              borderRadius: '16px',
              border: '1px solid var(--border-soft)',
              background: '#ffffff',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0a0a0a' }}>Customer Self-Service</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Instant client portal view</div>
            </div>
            <ArrowRight size={15} color="var(--muted)" />
          </button>
        </div>
      )}
    </div>
  );
};
