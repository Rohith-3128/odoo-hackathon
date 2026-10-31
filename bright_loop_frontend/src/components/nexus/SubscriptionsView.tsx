import React, { useEffect, useState } from 'react';
import { api, Subscription, Plan, Customer, SubscriptionAuditEvent, PlanChangeHistory } from '../../api/client';
import { PageHeader, StatusBadge } from './DesignSystem';
import { formatCurrency } from '../../utils/pricing';
import { Plus, X, RefreshCw, AlertCircle, Play, Pause, XCircle, ArrowUpRight, History, Calendar, CheckCircle } from 'lucide-react';

export const SubscriptionsView: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Renewal Due Banner State
  const [dueRenewalCount, setDueRenewalCount] = useState(0);
  const [isRenewingBatch, setIsRenewingBatch] = useState(false);
  const [batchRenewalMessage, setBatchRenewalMessage] = useState('');

  // Manage / Detail Modal State
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);
  const [subHistory, setSubHistory] = useState<SubscriptionAuditEvent[]>([]);
  const [subPlanHistory, setSubPlanHistory] = useState<PlanChangeHistory[]>([]);
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'audit' | 'plans'>('overview');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Change Plan / Proration Modal State
  const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);
  const [selectedNewPlanId, setSelectedNewPlanId] = useState('');
  const [prorationPreview, setProrationPreview] = useState<any>(null);
  const [isCalculatingProration, setIsCalculatingProration] = useState(false);

  // Cancel Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelType, setCancelType] = useState<'end_of_period' | 'immediate'>('end_of_period');
  const [cancelReason, setCancelReason] = useState('');

  // New Subscription Modal State
  const [isNewSubOpen, setIsNewSubOpen] = useState(false);
  const [newSubCustomerId, setNewSubCustomerId] = useState('');
  const [newSubPlanId, setNewSubPlanId] = useState('');
  const [isTrial, setIsTrial] = useState(false);
  const [trialDays, setTrialDays] = useState(14);
  const [autoRenew, setAutoRenew] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subs, pls, custs, dueRes] = await Promise.all([
        api.subscriptions.list(statusFilter, undefined, searchQuery),
        api.plans.list(),
        api.customers.list(),
        api.subscriptions.dueRenewal(0),
      ]);
      setSubscriptions(subs);
      setPlans(pls);
      setCustomers(custs.customers);
      setDueRenewalCount(dueRes.dueCount || 0);

      if (custs.customers.length > 0 && !newSubCustomerId) {
        setNewSubCustomerId(custs.customers[0].id);
      }
      if (pls.length > 0 && !newSubPlanId) {
        setNewSubPlanId(pls[0].id);
      }
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  // Load audit history for active modal subscription
  const openSubDetail = async (sub: Subscription) => {
    setActiveSub(sub);
    setActionSuccess('');
    setActionError('');
    setActiveDetailTab('overview');
    try {
      const historyRes = await api.subscriptions.getHistory(sub.id);
      setSubHistory(historyRes.history || []);
      setSubPlanHistory(historyRes.planHistory || []);
    } catch {
      setSubHistory(sub.history || []);
      setSubPlanHistory(sub.planHistory || []);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      setActionError('');
      const updated = await api.subscriptions.activate(id);
      setActiveSub(updated);
      setActionSuccess(`Subscription ${updated.subNumber} activated.`);
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Activation failed');
    }
  };

  const handlePause = async (id: string) => {
    try {
      setActionError('');
      const updated = await api.subscriptions.pause(id);
      setActiveSub(updated);
      setActionSuccess(`Subscription ${updated.subNumber} paused. Recurring billing halted.`);
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Pause failed');
    }
  };

  const handleResume = async (id: string) => {
    try {
      setActionError('');
      const updated = await api.subscriptions.resume(id);
      setActiveSub(updated);
      setActionSuccess(`Subscription ${updated.subNumber} resumed.`);
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Resume failed');
    }
  };

  const handleRenewSingle = async (id: string) => {
    try {
      setActionError('');
      const res = await api.subscriptions.renew(id);
      setActiveSub(res.subscription);
      setActionSuccess(`Renewed successfully! Invoice ${res.invoice.invoiceNumber} created.`);
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Renewal failed');
    }
  };

  const handleBatchRenew = async () => {
    try {
      setIsRenewingBatch(true);
      setBatchRenewalMessage('');
      const res = await api.subscriptions.renewBatch();
      setBatchRenewalMessage(`Processed ${res.processed} subscription(s). Generated ${res.results.filter(r => r.status === 'renewed').length} recurring invoice(s).`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Batch renewal failed');
    } finally {
      setIsRenewingBatch(false);
    }
  };

  // Trigger proration preview when target plan changes
  const handleTargetPlanChange = async (targetId: string) => {
    setSelectedNewPlanId(targetId);
    if (!activeSub || !targetId || targetId === activeSub.planId) {
      setProrationPreview(null);
      return;
    }
    try {
      setIsCalculatingProration(true);
      const res = await api.subscriptions.prorationPreview(activeSub.id, targetId);
      setProrationPreview(res.proration);
    } catch (err) {
      console.error('Failed to preview proration:', err);
    } finally {
      setIsCalculatingProration(false);
    }
  };

  const handleChangePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSub || !selectedNewPlanId) return;

    try {
      setActionError('');
      const res = await api.subscriptions.changePlan(activeSub.id, selectedNewPlanId);
      setActiveSub(res.subscription);
      setIsChangePlanOpen(false);
      setActionSuccess(`Subscription changed to ${res.planChange.newPlanName}. Net proration adjustment: $${res.proration.netAdjustment}.`);
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Plan change failed');
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSub) return;

    try {
      setActionError('');
      const res = await api.subscriptions.cancel(activeSub.id, cancelType, cancelReason);
      setActiveSub(res);
      setIsCancelModalOpen(false);
      setActionSuccess(`Cancellation scheduled for ${new Date(res.effectiveCancellationDate || '').toLocaleDateString()}.`);
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Cancellation failed');
    }
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubCustomerId || !newSubPlanId) return;

    try {
      await api.subscriptions.create({
        customerId: newSubCustomerId,
        planId: newSubPlanId,
        trialDays: isTrial ? trialDays : 0,
        autoRenew,
      });
      setIsNewSubOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create subscription');
    }
  };

  const statuses = ['all', 'active', 'trialing', 'paused', 'canceled', 'past_due', 'expired'];

  return (
    <div>
      <PageHeader
        title="Subscription Engine & Lifecycle"
        description="Authoritative state machine managing active subscriptions, trial periods, prorated upgrades, automatic renewals, and cancellation policies."
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

      {/* Due Renewal Notification Banner */}
      {dueRenewalCount > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 20px',
          borderRadius: '12px',
          background: 'rgba(234, 179, 8, 0.1)',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} color="#eab308" />
            <div>
              <strong style={{ color: '#ca8a04', fontSize: '14px' }}>
                {dueRenewalCount} subscription{dueRenewalCount > 1 ? 's' : ''} due for recurring renewal
              </strong>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Billing cycles have reached or passed their expiration threshold. Run automated batch renewal to generate next-period invoices.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn-primary"
            style={{ height: '36px', fontSize: '12px', background: '#ca8a04' }}
            onClick={handleBatchRenew}
            disabled={isRenewingBatch}
          >
            <RefreshCw size={14} style={{ marginRight: '6px', animation: isRenewingBatch ? 'spin 1s linear infinite' : 'none' }} />
            {isRenewingBatch ? 'Processing...' : 'Run Automated Renewal Batch'}
          </button>
        </div>
      )}

      {batchRenewalMessage && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(23, 201, 100, 0.1)', color: '#17c964', fontSize: '13px', fontWeight: 600, marginBottom: '20px' }}>
          {batchRenewalMessage}
        </div>
      )}

      {/* Filter Tabs and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
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

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Search subscriptions..."
            className="form-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '220px', height: '34px', fontSize: '12px' }}
          />
          <button
            type="button"
            className="btn-secondary"
            style={{ height: '34px', padding: '0 12px', fontSize: '12px' }}
            onClick={loadData}
          >
            Search
          </button>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div style={{ border: '1px solid var(--border-soft)', borderRadius: '16px', overflow: 'hidden', background: '#ffffff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'rgb(250, 250, 250)', borderBottom: '1px solid var(--border-soft)' }}>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Sub #</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Customer</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Plan & Commercial Terms</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Interval</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Current Period</th>
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
                  <td style={{ padding: '16px 20px', fontWeight: 500 }}>
                    <div>{s.customerName}</div>
                    {s.quotationId && (
                      <span style={{ fontSize: '10px', color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '1px 5px', borderRadius: '4px' }}>
                        From Quote
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 600 }}>{s.planName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      {formatCurrency(s.price)} / {s.billingInterval}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', textTransform: 'capitalize' }}>
                    {s.billingInterval}
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '12px' }}>
                    <div>{new Date(s.currentPeriodStart).toLocaleDateString()} – {new Date(s.currentPeriodEnd).toLocaleDateString()}</div>
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
                    <button
                      type="button"
                      onClick={() => openSubDetail(s)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '9999px',
                        border: '1px solid var(--border-soft)',
                        background: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                  {loading ? 'Loading subscription records...' : 'No subscriptions found matching filter.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Comprehensive Manage Subscription Modal */}
      {activeSub && (
        <div className="modal-backdrop" onClick={() => setActiveSub(null)}>
          <div className="modal-card" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close-btn" onClick={() => setActiveSub(null)}>
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Calendar size={24} color="#0a0a0a" />
              <h2 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.04em' }}>
                {activeSub.subNumber}
              </h2>
              <StatusBadge status={activeSub.status} />
              {activeSub.autoRenew && (
                <span style={{ fontSize: '11px', background: 'rgba(23,201,100,0.1)', color: '#17c964', padding: '2px 8px', borderRadius: '9999px', fontWeight: 600 }}>
                  Auto-Renew On
                </span>
              )}
            </div>

            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' }}>
              Account: <strong>{activeSub.customerName}</strong> · Plan: <strong>{activeSub.planName}</strong> (${activeSub.price}/{activeSub.billingInterval})
            </p>

            {actionSuccess && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(23, 201, 100, 0.1)', color: '#17c964', fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>
                {actionSuccess}
              </div>
            )}

            {actionError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>
                {actionError}
              </div>
            )}

            {/* Sub-Tabs: Overview, Audit Trail, Plan Changes */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-soft)', paddingBottom: '10px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setActiveDetailTab('overview')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: activeDetailTab === 'overview' ? 700 : 500,
                  color: activeDetailTab === 'overview' ? '#0a0a0a' : 'var(--muted)',
                  cursor: 'pointer',
                  borderBottom: activeDetailTab === 'overview' ? '2px solid #0a0a0a' : 'none',
                  paddingBottom: '4px',
                }}
              >
                Overview & Dates
              </button>
              <button
                type="button"
                onClick={() => setActiveDetailTab('audit')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: activeDetailTab === 'audit' ? 700 : 500,
                  color: activeDetailTab === 'audit' ? '#0a0a0a' : 'var(--muted)',
                  cursor: 'pointer',
                  borderBottom: activeDetailTab === 'audit' ? '2px solid #0a0a0a' : 'none',
                  paddingBottom: '4px',
                }}
              >
                Lifecycle Audit Trail ({subHistory.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveDetailTab('plans')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: activeDetailTab === 'plans' ? 700 : 500,
                  color: activeDetailTab === 'plans' ? '#0a0a0a' : 'var(--muted)',
                  cursor: 'pointer',
                  borderBottom: activeDetailTab === 'plans' ? '2px solid #0a0a0a' : 'none',
                  paddingBottom: '4px',
                }}
              >
                Plan Change History ({subPlanHistory.length})
              </button>
            </div>

            {/* Tab: Overview */}
            {activeDetailTab === 'overview' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ padding: '12px', background: 'rgb(250, 250, 250)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Billing Period</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>
                      {new Date(activeSub.currentPeriodStart).toLocaleDateString()} to {new Date(activeSub.currentPeriodEnd).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Next Billing: {new Date(activeSub.nextBillingDate).toLocaleDateString()}</div>
                  </div>

                  <div style={{ padding: '12px', background: 'rgb(250, 250, 250)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Commercial Terms</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>
                      {formatCurrency(activeSub.price)} / {activeSub.billingInterval}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Auto-Renew: {activeSub.autoRenew ? 'Enabled' : 'Disabled'}</div>
                  </div>
                </div>

                {activeSub.status === 'trialing' && activeSub.trialEndDate && (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(99,102,241,0.08)', color: '#6366f1', fontSize: '12px', fontWeight: 600, marginBottom: '16px' }}>
                    Free trial period active until {new Date(activeSub.trialEndDate).toLocaleDateString()}.
                  </div>
                )}

                {activeSub.cancellationRequestedAt && (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '12px', fontWeight: 600, marginBottom: '16px' }}>
                    Scheduled for cancellation effective on {new Date(activeSub.effectiveCancellationDate || '').toLocaleDateString()}. Reason: {activeSub.cancellationReason || 'User request'}
                  </div>
                )}

                {/* Primary Action Buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
                  {(activeSub.status === 'draft' || activeSub.status === 'trialing') && (
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ flex: 1, height: '40px', fontSize: '13px', background: '#17c964' }}
                      onClick={() => handleActivate(activeSub.id)}
                    >
                      <Play size={14} style={{ marginRight: '6px' }} />
                      Activate Subscription
                    </button>
                  )}

                  {activeSub.status === 'active' && (
                    <>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ height: '40px', fontSize: '13px', padding: '0 16px' }}
                        onClick={() => {
                          setSelectedNewPlanId(activeSub.planId);
                          setProrationPreview(null);
                          setIsChangePlanOpen(true);
                        }}
                      >
                        <ArrowUpRight size={14} style={{ marginRight: '6px' }} />
                        Change / Upgrade Plan
                      </button>

                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ height: '40px', fontSize: '13px', padding: '0 16px' }}
                        onClick={() => handleRenewSingle(activeSub.id)}
                      >
                        <RefreshCw size={14} style={{ marginRight: '6px' }} />
                        Renew Now
                      </button>

                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ height: '40px', fontSize: '13px', padding: '0 14px' }}
                        onClick={() => handlePause(activeSub.id)}
                      >
                        <Pause size={14} style={{ marginRight: '6px' }} />
                        Pause
                      </button>

                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ height: '40px', fontSize: '13px', padding: '0 14px', color: '#ef4444' }}
                        onClick={() => setIsCancelModalOpen(true)}
                      >
                        <XCircle size={14} style={{ marginRight: '6px' }} />
                        Cancel
                      </button>
                    </>
                  )}

                  {activeSub.status === 'paused' && (
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ flex: 1, height: '40px', fontSize: '13px', background: '#17c964' }}
                      onClick={() => handleResume(activeSub.id)}
                    >
                      <Play size={14} style={{ marginRight: '6px' }} />
                      Resume Subscription
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Lifecycle Audit Trail */}
            {activeDetailTab === 'audit' && (
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {subHistory.length > 0 ? (
                  subHistory.map((ev, idx) => (
                    <div key={idx} style={{ padding: '10px 12px', borderLeft: '2px solid #0a0a0a', marginLeft: '6px', marginBottom: '8px', background: 'rgb(250, 250, 250)', borderRadius: '0 8px 8px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)' }}>
                        <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>{ev.type.replace(/_/g, ' ')}</span>
                        <span>{new Date(ev.timestamp).toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: '13px', marginTop: '4px', color: '#0a0a0a' }}>
                        {ev.description}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                        Actor: {ev.actor}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                    No audit records logged yet.
                  </div>
                )}
              </div>
            )}

            {/* Tab: Plan Change History */}
            {activeDetailTab === 'plans' && (
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {subPlanHistory.length > 0 ? (
                  subPlanHistory.map((pch, idx) => (
                    <div key={idx} style={{ padding: '12px', border: '1px solid var(--border-soft)', borderRadius: '10px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                        <span>{pch.previousPlanName} (${pch.previousPrice}) → {pch.newPlanName} (${pch.newPrice})</span>
                        <span style={{ textTransform: 'uppercase', color: pch.changeType === 'upgrade' ? '#17c964' : '#f5a524' }}>
                          {pch.changeType}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                        Effective: {new Date(pch.effectiveDate).toLocaleDateString()} · Net Proration Adjustment: {formatCurrency(pch.proration.netAdjustment)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                    No plan changes recorded. Subscription is on its initial plan tier.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Change Plan / Proration Modal */}
      {isChangePlanOpen && activeSub && (
        <div className="modal-backdrop" onClick={() => setIsChangePlanOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close-btn" onClick={() => setIsChangePlanOpen(false)}>
              <X size={18} />
            </button>

            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '6px' }}>Change Plan & Proration Preview</h2>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' }}>
              Modify plan tier for <strong>{activeSub.customerName}</strong> ({activeSub.subNumber}).
            </p>

            <form onSubmit={handleChangePlanSubmit} className="booking-form">
              <div>
                <label className="form-label">Target Subscription Tier</label>
                <select
                  className="form-input"
                  value={selectedNewPlanId}
                  onChange={(e) => handleTargetPlanChange(e.target.value)}
                  required
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.price)} / {p.billingInterval}
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Proration Breakdown Preview */}
              {isCalculatingProration ? (
                <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)' }}>
                  Calculating mathematical proration breakdown...
                </div>
              ) : prorationPreview ? (
                <div style={{ padding: '14px', background: 'rgb(250, 250, 250)', borderRadius: '10px', fontSize: '12px', border: '1px solid var(--border-soft)' }}>
                  <div style={{ fontWeight: 600, marginBottom: '8px' }}>Calculated Mid-Cycle Proration Adjustment:</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--muted)' }}>Remaining Days in Cycle</span>
                    <span>{prorationPreview.daysRemaining} of {prorationPreview.totalDaysInPeriod} days</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--muted)' }}>Unused Credit (Current Plan)</span>
                    <span style={{ color: '#17c964' }}>-{formatCurrency(prorationPreview.unusedOldPlanCredit)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--muted)' }}>Prorated Charge (Target Plan)</span>
                    <span>+{formatCurrency(prorationPreview.proratedNewPlanDebit)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '13px', borderTop: '1px solid var(--border-soft)', paddingTop: '6px', marginTop: '6px' }}>
                    <span>Net Immediate Invoice Adjustment</span>
                    <span style={{ color: prorationPreview.netAdjustment >= 0 ? '#0a0a0a' : '#17c964' }}>
                      {formatCurrency(prorationPreview.netAdjustment)}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '12px', background: 'rgb(250, 250, 250)', borderRadius: '10px', fontSize: '12px', color: 'var(--muted)' }}>
                  Select another plan to preview the authoritative prorated credit/debit calculation.
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                style={{ height: '42px', width: '100%', marginTop: '12px' }}
                disabled={!selectedNewPlanId || selectedNewPlanId === activeSub.planId}
              >
                Confirm Plan Upgrade / Adjustment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {isCancelModalOpen && activeSub && (
        <div className="modal-backdrop" onClick={() => setIsCancelModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>Cancel Subscription {activeSub.subNumber}</h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '14px' }}>
              Choose cancellation timing policy and record customer justification.
            </p>

            <form onSubmit={handleCancelSubmit} className="booking-form">
              <div>
                <label className="form-label">Cancellation Timing Policy</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="cancelType"
                      checked={cancelType === 'end_of_period'}
                      onChange={() => setCancelType('end_of_period')}
                    />
                    <span>Cancel at End of Current Period ({new Date(activeSub.currentPeriodEnd).toLocaleDateString()})</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="cancelType"
                      checked={cancelType === 'immediate'}
                      onChange={() => setCancelType('immediate')}
                    />
                    <span>Cancel Immediately (Halt Access & Billing)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="form-label">Cancellation Reason</label>
                <textarea
                  rows={2}
                  className="form-input"
                  placeholder="e.g. Project finished, financial reassessment, alternative internal solution..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, height: '38px' }}
                  onClick={() => setIsCancelModalOpen(false)}
                >
                  Keep Subscription
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, height: '38px', background: '#ef4444' }}
                >
                  Confirm Cancellation
                </button>
              </div>
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

            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '6px' }}>Start New Subscription</h2>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '18px' }}>
              Directly activate an enterprise subscription, configure trial periods, and issue initial invoice.
            </p>

            <form onSubmit={handleCreateSubscription} className="booking-form">
              <div>
                <label className="form-label">Customer Account *</label>
                <select
                  className="form-input"
                  value={newSubCustomerId}
                  onChange={(e) => setNewSubCustomerId(e.target.value)}
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
                <label className="form-label">Subscription Tier *</label>
                <select
                  className="form-input"
                  value={newSubPlanId}
                  onChange={(e) => setNewSubPlanId(e.target.value)}
                  required
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.price)} / {p.billingInterval}
                    </option>
                  ))}
                </select>
              </div>

              {/* Free Trial Option */}
              <div style={{ padding: '12px', background: 'rgb(250, 250, 250)', borderRadius: '10px', marginTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={isTrial}
                    onChange={(e) => setIsTrial(e.target.checked)}
                  />
                  <span>Include Free Trial Period</span>
                </label>

                {isTrial && (
                  <div style={{ marginTop: '10px' }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Trial Duration (Days)</label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      className="form-input"
                      value={trialDays}
                      onChange={(e) => setTrialDays(Number(e.target.value))}
                    />
                  </div>
                )}
              </div>

              {/* Auto-renew checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', marginTop: '6px' }}>
                <input
                  type="checkbox"
                  checked={autoRenew}
                  onChange={(e) => setAutoRenew(e.target.checked)}
                />
                <span>Enable Automated Cycle Renewal</span>
              </label>

              <button type="submit" className="btn-primary" style={{ height: '44px', width: '100%', marginTop: '14px' }}>
                {isTrial ? `Initiate ${trialDays}-Day Trial Subscription` : 'Activate Subscription & Issue Invoice'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
