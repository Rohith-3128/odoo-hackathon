import React, { useEffect, useState } from 'react';
import { api, Subscription, Plan, Customer } from '../../api/client';
import { PageHeader, StatusBadge } from './DesignSystem';
import { formatCurrency } from '../../utils/pricing';
import { Plus, X } from 'lucide-react';

export const SubscriptionsView: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Change Plan Modal
  const [activeSubForChange, setActiveSubForChange] = useState<Subscription | null>(null);
  const [newPlanId, setNewPlanId] = useState('');

  // New Subscription Modal
  const [isNewSubOpen, setIsNewSubOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [subs, pls, custs] = await Promise.all([
        api.subscriptions.list(statusFilter),
        api.plans.list(),
        api.customers.list(),
      ]);
      setSubscriptions(subs);
      setPlans(pls);
      setCustomers(custs.customers);
      if (custs.customers.length > 0) setSelectedCustomerId(custs.customers[0].id);
      if (pls.length > 0) setSelectedPlanId(pls[0].id);
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handlePause = async (id: string, name: string) => {
    if (!confirm(`Pause subscription for ${name}? Billing will be temporarily held.`)) return;
    try {
      await api.subscriptions.pause(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResume = async (id: string) => {
    try {
      await api.subscriptions.resume(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCancel = async (id: string, sub: Subscription) => {
    if (
      !confirm(
        `Cancel subscription ${sub.subNumber}? Cancellation will be effective on ${new Date(
          sub.currentPeriodEnd
        ).toLocaleDateString()} at the end of the current billing cycle.`
      )
    )
      return;

    try {
      await api.subscriptions.cancel(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleChangePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubForChange || !newPlanId) return;

    try {
      await api.subscriptions.changePlan(activeSubForChange.id, newPlanId);
      setActiveSubForChange(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedPlanId) return;

    try {
      await api.subscriptions.create({
        customerId: selectedCustomerId,
        planId: selectedPlanId,
      });
      setIsNewSubOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Subscription Engine"
        description="Manage recurring subscription lifecycles, plan upgrades, auto-renewals, and pause/cancel states."
        breadcrumbs={['EZbill', 'Subscriptions']}
        action={
          <button
            type="button"
            className="btn-primary"
            style={{ height: '40px', padding: '0 20px', fontSize: '13px' }}
            onClick={() => setIsNewSubOpen(true)}
          >
            <Plus size={15} style={{ marginRight: '6px' }} />
            New Subscription
          </button>
        }
      />

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['all', 'active', 'paused', 'canceled'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '6px 16px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 500,
              textTransform: 'capitalize',
              border: '1px solid var(--border-soft)',
              background: statusFilter === s ? '#0a0a0a' : '#ffffff',
              color: statusFilter === s ? '#ffffff' : 'var(--muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Subscriptions Table */}
      <div style={{ border: '1px solid var(--border-soft)', borderRadius: '16px', overflow: 'hidden', background: '#ffffff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'rgb(250, 250, 250)', borderBottom: '1px solid var(--border-soft)' }}>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Sub #</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Customer</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Plan & Tier</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Billing Cycle</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Next Billing</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Status</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.length > 0 ? (
              subscriptions.map((s) => (
                <tr
                  key={s.id}
                  style={{ borderBottom: '1px solid var(--border-soft)', transition: 'background 0.15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgb(253, 253, 253)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '16px 20px', fontWeight: 600 }}>{s.subNumber}</td>
                  <td style={{ padding: '16px 20px', fontWeight: 500 }}>{s.customerName}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 600 }}>{s.planName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      {formatCurrency(s.price)} / {s.billingInterval}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', textTransform: 'capitalize' }}>
                    {s.billingInterval}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div>{new Date(s.nextBillingDate).toLocaleDateString()}</div>
                    {s.status === 'canceled' && s.effectiveCancellationDate && (
                      <div style={{ fontSize: '11px', color: '#ef4444' }}>
                        Ends: {new Date(s.effectiveCancellationDate).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <StatusBadge status={s.status} />
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      {s.status === 'active' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSubForChange(s);
                              setNewPlanId(s.planId);
                            }}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-soft)',
                              background: '#ffffff',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Plan
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePause(s.id, s.customerName)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-soft)',
                              background: '#ffffff',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            title="Pause Subscription"
                          >
                            Pause
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancel(s.id, s)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '8px',
                              border: '1px solid rgba(239,68,68,0.2)',
                              background: 'rgba(239,68,68,0.06)',
                              color: '#ef4444',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            title="Cancel Subscription"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {s.status === 'paused' && (
                        <button
                          type="button"
                          onClick={() => handleResume(s.id)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(23,201,100,0.3)',
                            background: 'rgba(23,201,100,0.08)',
                            color: '#17c964',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Resume
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                  No subscriptions found matching filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Upgrade / Change Plan Modal */}
      {activeSubForChange && (
        <div className="modal-backdrop" onClick={() => setActiveSubForChange(null)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close-btn" onClick={() => setActiveSubForChange(null)}>
              <X size={18} />
            </button>

            <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>Change Subscription Plan</h2>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
              Modify terms for <strong>{activeSubForChange.customerName}</strong> ({activeSubForChange.subNumber}).
            </p>

            <form onSubmit={handleChangePlanSubmit} className="booking-form">
              <div>
                <label className="form-label">Select Target Plan</label>
                <select
                  className="form-input"
                  value={newPlanId}
                  onChange={(e) => setNewPlanId(e.target.value)}
                  required
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.price)} / {p.billingInterval}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ padding: '12px', background: 'rgb(250, 250, 250)', borderRadius: '10px', fontSize: '12px', color: 'var(--muted)' }}>
                Plan change takes effect immediately on the next billing invoice.
              </div>

              <button type="submit" className="btn-primary" style={{ height: '44px', width: '100%', marginTop: '12px' }}>
                Confirm Plan Upgrade / Change
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Subscription Modal */}
      {isNewSubOpen && (
        <div className="modal-backdrop" onClick={() => setIsNewSubOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close-btn" onClick={() => setIsNewSubOpen(false)}>
              <X size={18} />
            </button>

            <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>Start Subscription</h2>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
              Directly initiate an active enterprise subscription and initial invoice.
            </p>

            <form onSubmit={handleCreateSubscription} className="booking-form">
              <div>
                <label className="form-label">Customer Account *</label>
                <select
                  className="form-input"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  required
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company} ({c.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Plan Tier *</label>
                <select
                  className="form-input"
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  required
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.price)} / {p.billingInterval}
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn-primary" style={{ height: '44px', width: '100%', marginTop: '12px' }}>
                Activate Subscription & Issue Invoice
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
