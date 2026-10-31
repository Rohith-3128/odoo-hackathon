import React, { useEffect, useState } from 'react';
import {
  api,
  Customer,
  Subscription,
  Invoice,
  Payment,
  Quotation,
  Plan,
} from '../../api/client';
import { PageHeader, StatusBadge } from './DesignSystem';
import { formatCurrency } from '../../utils/pricing';
import {
  Shield,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  ArrowUpRight,
  RefreshCw,
  Pause,
  Play,
  XCircle,
  Clock,
  Building,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  Printer,
  Sparkles,
} from 'lucide-react';

interface CustomerPortalProps {
  currentCustomerId: string;
  userRole?: string;
}

export const CustomerPortalView: React.FC<CustomerPortalProps> = ({
  currentCustomerId: initialCustomerId,
  userRole = 'admin',
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId);
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);

  const [data, setData] = useState<{
    customer: Customer;
    subscriptions: Subscription[];
    invoices: Invoice[];
    payments: Payment[];
    quotations: Quotation[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editName, setEditName] = useState('');

  // Plan Upgrade / Change Modal State
  const [changePlanSub, setChangePlanSub] = useState<Subscription | null>(null);
  const [targetPlanId, setTargetPlanId] = useState('');
  const [prorationPreview, setProrationPreview] = useState<any | null>(null);
  const [loadingProration, setLoadingProration] = useState(false);
  const [processingPlanChange, setProcessingPlanChange] = useState(false);

  // Cancel Subscription Modal State
  const [cancelSub, setCancelSub] = useState<Subscription | null>(null);
  const [cancelType, setCancelType] = useState<'end_of_period' | 'immediate'>('end_of_period');
  const [cancelReason, setCancelReason] = useState('Service reorganization');

  // Pay Invoice Modal State
  const [payInvoiceModal, setPayInvoiceModal] = useState<Invoice | null>(null);
  const [payMethod, setPayMethod] = useState<'card' | 'ach' | 'wire'>('card');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessReceipt, setPaymentSuccessReceipt] = useState<{
    invoice: Invoice;
    payment: Payment;
  } | null>(null);

  // Reject Quote Modal State
  const [rejectQuoteModal, setRejectQuoteModal] = useState<Quotation | null>(null);
  const [rejectReason, setRejectReason] = useState('Pricing adjustment requested');

  // Load portal data for currently selected customer
  const loadPortalData = async (customerIdToLoad: string) => {
    try {
      setLoading(true);
      setError(null);

      const [portalRes, plansRes, customersRes] = await Promise.all([
        api.portal.getAccount(customerIdToLoad),
        api.plans.list().catch(() => []),
        userRole === 'admin'
          ? api.customers.list().catch(() => ({ customers: [], total: 0 }))
          : Promise.resolve({ customers: [], total: 0 }),
      ]);

      setData(portalRes);
      setAvailablePlans(plansRes);
      if (customersRes.customers) {
        setAvailableCustomers(customersRes.customers);
      }

      setEditName(portalRes.customer.name || '');
      setEditPhone(portalRes.customer.phone || '');
      setEditAddress(portalRes.customer.address || '');
    } catch (err: any) {
      setError(err.message || 'Access denied or failed to load portal data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      loadPortalData(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4500);
  };

  // 1. Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    try {
      await api.customers.update(data.customer.id, {
        name: editName,
        phone: editPhone,
        address: editAddress,
      });
      showNotification('Billing contact information updated successfully.');
      setIsEditingProfile(false);
      loadPortalData(selectedCustomerId);
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // 2. Plan Change / Proration Calculation
  const handleOpenPlanChange = async (sub: Subscription) => {
    setChangePlanSub(sub);
    const otherPlan = availablePlans.find((p) => p.id !== sub.planId);
    if (otherPlan) {
      setTargetPlanId(otherPlan.id);
      fetchProrationPreview(sub.id, otherPlan.id);
    }
  };

  const fetchProrationPreview = async (subId: string, newPlanId: string) => {
    try {
      setLoadingProration(true);
      const res = await api.subscriptions.prorationPreview(subId, newPlanId);
      setProrationPreview(res.proration);
    } catch (err: any) {
      setProrationPreview(null);
    } finally {
      setLoadingProration(false);
    }
  };

  const handleConfirmPlanChange = async () => {
    if (!changePlanSub || !targetPlanId) return;

    try {
      setProcessingPlanChange(true);
      const res = await api.subscriptions.changePlan(changePlanSub.id, targetPlanId);
      showNotification(
        `Plan successfully changed to ${res.planChange.newPlanName}. Adjustment of ${formatCurrency(
          res.proration.netAdjustment
        )} applied.`
      );
      setChangePlanSub(null);
      loadPortalData(selectedCustomerId);
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setProcessingPlanChange(false);
    }
  };

  // 3. Pause / Resume Subscription
  const handlePauseSubscription = async (subId: string) => {
    if (!confirm('Pause recurring billing for this subscription? Auto-renewal will be halted.'))
      return;
    try {
      await api.subscriptions.pause(subId);
      showNotification('Subscription billing paused.');
      loadPortalData(selectedCustomerId);
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleResumeSubscription = async (subId: string) => {
    try {
      await api.subscriptions.resume(subId);
      showNotification('Subscription resumed and scheduled for recurring billing.');
      loadPortalData(selectedCustomerId);
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // 4. Cancel Subscription
  const handleConfirmCancellation = async () => {
    if (!cancelSub) return;
    try {
      await api.subscriptions.cancel(cancelSub.id, cancelType, cancelReason);
      showNotification(
        cancelType === 'immediate'
          ? 'Subscription cancelled immediately.'
          : 'Cancellation scheduled for the end of the current billing cycle.'
      );
      setCancelSub(null);
      loadPortalData(selectedCustomerId);
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // 5. Quotation Actions
  const handleAcceptQuote = async (quoteId: string) => {
    try {
      await api.quotations.accept(quoteId);
      showNotification('Quotation terms formally accepted.');
      loadPortalData(selectedCustomerId);
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleConfirmRejectQuote = async () => {
    if (!rejectQuoteModal) return;
    try {
      await api.quotations.reject(rejectQuoteModal.id, rejectReason);
      showNotification('Quotation declined with feedback delivered to sales team.');
      setRejectQuoteModal(null);
      loadPortalData(selectedCustomerId);
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleConvertQuote = async (quoteId: string) => {
    try {
      const res = await api.quotations.convert(quoteId);
      showNotification(
        `Quotation activated! Subscription ${res.subscription.subNumber} and Invoice ${res.invoice.invoiceNumber} created.`
      );
      loadPortalData(selectedCustomerId);
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // 6. Pay Invoice
  const handleProcessPayment = async () => {
    if (!payInvoiceModal) return;
    try {
      setIsProcessingPayment(true);
      const res = await api.invoices.pay(payInvoiceModal.id, {
        method: payMethod,
        isSimulated: true,
      });
      setPaymentSuccessReceipt(res);
      setPayInvoiceModal(null);
      showNotification(
        `Payment of ${formatCurrency(res.payment.amount)} processed for ${res.invoice.invoiceNumber}.`
      );
      loadPortalData(selectedCustomerId);
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (loading && !data) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--muted)' }}>
        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
        <p>Authenticating customer session and loading self-service records...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{
          padding: '40px',
          background: 'rgba(239,68,68,0.06)',
          borderRadius: '16px',
          border: '1px solid rgba(239,68,68,0.2)',
        }}
      >
        <h3 style={{ color: '#ef4444', fontWeight: 600, marginBottom: '6px' }}>
          Access Control Restriction
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '16px' }}>
          {error || 'Unable to access requested customer account. Please ensure valid authorization.'}
        </p>
        {userRole === 'admin' && availableCustomers.length > 0 && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
              Switch to available customer:
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {availableCustomers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCustomerId(c.id)}
                  className="btn-primary"
                  style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}
                >
                  {c.company} ({c.name})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Summary Metrics for Customer
  const totalPaidLifetime = data.payments
    .filter((p) => p.status === 'succeeded')
    .reduce((sum, p) => sum + p.amount, 0);

  const outstandingBalance = data.invoices
    .filter((i) => i.status === 'unpaid' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.amountDue, 0);

  const activeSubs = data.subscriptions.filter((s) => s.status === 'active');
  const nextRenewalSub = activeSubs.sort(
    (a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime()
  )[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <PageHeader
        title={`Customer Portal — ${data.customer.company}`}
        description="Self-service management for subscription plans, quotes, invoices, and payment receipts."
        breadcrumbs={['Customer Portal', data.customer.company]}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Admin Customer Switcher */}
            {userRole === 'admin' && availableCustomers.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                  VIEW AS:
                </span>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-soft)',
                    background: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {availableCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company} ({c.name})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: 'var(--muted)',
                background: 'rgb(245, 245, 245)',
                padding: '6px 14px',
                borderRadius: '9999px',
                border: '1px solid var(--border-soft)',
              }}
            >
              <Shield size={13} color="#17c964" />
              <span>Encrypted Client Session</span>
            </div>
          </div>
        }
      />

      {/* Notification Toast */}
      {feedbackMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background:
              feedbackMessage.type === 'success'
                ? 'rgba(23, 201, 100, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
            color: feedbackMessage.type === 'success' ? '#17c964' : '#ef4444',
            border:
              feedbackMessage.type === 'success'
                ? '1px solid rgba(23, 201, 100, 0.2)'
                : '1px solid rgba(239, 68, 68, 0.2)',
          }}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <div
          style={{
            padding: '20px',
            borderRadius: '16px',
            background: '#ffffff',
            border: '1px solid var(--border-soft)',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
            Active Subscriptions
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em' }}>
            {activeSubs.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
            Of {data.subscriptions.length} total services
          </div>
        </div>

        <div
          style={{
            padding: '20px',
            borderRadius: '16px',
            background: '#ffffff',
            border: '1px solid var(--border-soft)',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
            Next Renewal Due
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.03em' }}>
            {nextRenewalSub ? formatCurrency(nextRenewalSub.price) : '$0'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
            {nextRenewalSub
              ? `On ${new Date(nextRenewalSub.nextBillingDate).toLocaleDateString()}`
              : 'No upcoming renewal'}
          </div>
        </div>

        <div
          style={{
            padding: '20px',
            borderRadius: '16px',
            background: '#ffffff',
            border: '1px solid var(--border-soft)',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
            Outstanding Balance
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: outstandingBalance > 0 ? '#ef4444' : '#0a0a0a',
            }}
          >
            {formatCurrency(outstandingBalance)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
            {outstandingBalance > 0 ? 'Awaiting settlement' : 'All accounts settled'}
          </div>
        </div>

        <div
          style={{
            padding: '20px',
            borderRadius: '16px',
            background: '#ffffff',
            border: '1px solid var(--border-soft)',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
            Lifetime Cleared Spend
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#17c964',
            }}
          >
            {formatCurrency(totalPaidLifetime)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
            Across {data.payments.length} transactions
          </div>
        </div>
      </div>

      {/* Account Profile Card */}
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
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.03em' }}>
              Authorized Billing Contact & Profile
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
              Primary contact information used on legal invoices and tax receipts
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingProfile(!isEditingProfile)}
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
            {isEditingProfile ? 'Cancel Edit' : 'Edit Contact Details'}
          </button>
        </div>

        {isEditingProfile ? (
          <form
            onSubmit={handleUpdateProfile}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}
          >
            <div>
              <label className="form-label">Contact Name</label>
              <input
                type="text"
                className="form-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-input"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Billing Address</label>
              <input
                type="text"
                className="form-input"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <button
                type="submit"
                className="btn-primary"
                style={{ height: '36px', padding: '0 20px', fontSize: '13px' }}
              >
                Save Updated Profile
              </button>
            </div>
          </form>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              fontSize: '13px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Building size={16} color="var(--muted)" />
              <div>
                <span style={{ color: 'var(--muted)', fontSize: '11px' }}>Company</span>
                <div style={{ fontWeight: 600 }}>{data.customer.company}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Mail size={16} color="var(--muted)" />
              <div>
                <span style={{ color: 'var(--muted)', fontSize: '11px' }}>Email / Billing Notices</span>
                <div style={{ fontWeight: 600 }}>{data.customer.email}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Phone size={16} color="var(--muted)" />
              <div>
                <span style={{ color: 'var(--muted)', fontSize: '11px' }}>Phone</span>
                <div style={{ fontWeight: 600 }}>{data.customer.phone || 'N/A'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MapPin size={16} color="var(--muted)" />
              <div>
                <span style={{ color: 'var(--muted)', fontSize: '11px' }}>Billing Address</span>
                <div style={{ fontWeight: 600 }}>{data.customer.address || 'N/A'}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Subscriptions Management */}
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
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.03em' }}>
              Your Subscriptions & Tier Controls
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
              Manage active service plans, execute prorated plan changes, pause or cancel services
            </p>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            {data.subscriptions.length} Registered
          </span>
        </div>

        {data.subscriptions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {data.subscriptions.map((sub) => (
              <div
                key={sub.id}
                style={{
                  padding: '18px 22px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-soft)',
                  background: 'rgb(253, 253, 253)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '16px' }}>{sub.planName}</strong>
                      <StatusBadge status={sub.status} />
                      <span
                        style={{
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          background: 'rgb(245, 245, 245)',
                          color: 'var(--muted)',
                          fontWeight: 600,
                        }}
                      >
                        {sub.billingInterval}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                      {sub.subNumber} · Billing Cycle: {new Date(sub.currentPeriodStart).toLocaleDateString()} to{' '}
                      {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                    </div>
                    {sub.status === 'canceled' && sub.effectiveCancellationDate && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#ef4444',
                          marginTop: '4px',
                          fontWeight: 500,
                        }}
                      >
                        Access active until end of billing cycle:{' '}
                        {new Date(sub.effectiveCancellationDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '18px' }}>
                      {formatCurrency(sub.price)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      per {sub.billingInterval}
                    </div>
                  </div>
                </div>

                {/* Self-Service Subscription Actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-soft)',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Plan Change / Upgrade */}
                  {sub.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => handleOpenPlanChange(sub)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-soft)',
                        background: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Sparkles size={13} color="#0a0a0a" />
                      <span>Change / Upgrade Plan</span>
                    </button>
                  )}

                  {/* Pause / Resume */}
                  {sub.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => handlePauseSubscription(sub.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-soft)',
                        background: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Pause size={13} color="#d97706" />
                      <span>Pause Subscription</span>
                    </button>
                  )}

                  {sub.status === 'paused' && (
                    <button
                      type="button"
                      onClick={() => handleResumeSubscription(sub.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: '1px solid rgba(23, 201, 100, 0.3)',
                        background: 'rgba(23, 201, 100, 0.05)',
                        color: '#17c964',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Play size={13} />
                      <span>Resume Subscription</span>
                    </button>
                  )}

                  {/* Cancellation */}
                  {sub.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => setCancelSub(sub)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        background: 'rgba(239, 68, 68, 0.05)',
                        color: '#ef4444',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginLeft: 'auto',
                      }}
                    >
                      <XCircle size={13} />
                      <span>Request Cancellation</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: 'var(--muted)', fontSize: '13px' }}>
            No subscriptions currently active under this account.
          </div>
        )}
      </div>

      {/* Commercial Proposals & Quotations */}
      {data.quotations && data.quotations.length > 0 && (
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
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.03em' }}>
                Proposals & Quotations
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Review pricing offers from sales, accept commercial terms, or activate subscriptions
              </p>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              {data.quotations.length} Proposals
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.quotations.map((q) => (
              <div
                key={q.id}
                style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-soft)',
                  background: 'rgb(253, 253, 253)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{q.quoteNumber}</span>
                    <StatusBadge status={q.status} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                    Valid until {new Date(q.expiresAt).toLocaleDateString()} · Notes:{' '}
                    {q.notes || 'Standard terms'}
                  </div>
                  {q.items && q.items.length > 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '4px' }}>
                      Item: {q.items[0].planName} ({q.items[0].quantity}x @{' '}
                      {formatCurrency(q.items[0].unitPrice)})
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '16px' }}>
                      {formatCurrency(q.total)}
                    </div>
                    {q.totalDiscount > 0 && (
                      <div style={{ fontSize: '11px', color: '#17c964' }}>
                        Includes -{formatCurrency(q.totalDiscount)} discount
                      </div>
                    )}
                  </div>

                  {q.status === 'sent' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleAcceptQuote(q.id)}
                        className="btn-primary"
                        style={{ height: '32px', padding: '0 14px', fontSize: '12px' }}
                      >
                        Accept Terms
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectQuoteModal(q)}
                        style={{
                          height: '32px',
                          padding: '0 12px',
                          fontSize: '12px',
                          background: 'transparent',
                          border: '1px solid var(--border-soft)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  {q.status === 'accepted' && (
                    <button
                      type="button"
                      onClick={() => handleConvertQuote(q.id)}
                      className="btn-primary"
                      style={{ height: '32px', padding: '0 14px', fontSize: '12px' }}
                    >
                      Activate Subscription Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoices & Billing Receipts */}
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
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.03em' }}>
              Invoices & Payment Records
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
              Complete history of billing invoices, tax breakdowns, and payment settlements
            </p>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            {data.invoices.length} Invoices
          </span>
        </div>

        {data.invoices.length > 0 ? (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '13px',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-soft)', color: 'var(--muted)' }}>
                <th style={{ padding: '10px 14px' }}>Invoice #</th>
                <th style={{ padding: '10px 14px' }}>Total Amount</th>
                <th style={{ padding: '10px 14px' }}>Due Date</th>
                <th style={{ padding: '10px 14px' }}>Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Settlement</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                  <td style={{ padding: '14px', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={14} color="var(--muted)" />
                      <span>{inv.invoiceNumber}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px', fontWeight: 600 }}>{formatCurrency(inv.total)}</td>
                  <td style={{ padding: '14px' }}>
                    {new Date(inv.dueDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '14px' }}>
                    <StatusBadge status={inv.status} />
                  </td>
                  <td style={{ padding: '14px', textAlign: 'right' }}>
                    {inv.status === 'unpaid' || inv.status === 'overdue' ? (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => setPayInvoiceModal(inv)}
                        style={{
                          height: '32px',
                          padding: '0 14px',
                          fontSize: '12px',
                          borderRadius: '8px',
                        }}
                      >
                        Pay {formatCurrency(inv.amountDue)}
                      </button>
                    ) : (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#17c964',
                          fontWeight: 600,
                          fontSize: '12px',
                        }}
                      >
                        <CheckCircle2 size={14} />
                        <span>Paid in Full</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ color: 'var(--muted)', fontSize: '13px' }}>
            No invoices issued to this account.
          </div>
        )}
      </div>

      {/* Cleared Payment Receipts Ledger */}
      {data.payments && data.payments.length > 0 && (
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
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.03em' }}>
                Bank Settlement & Payment Receipts
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Audited transaction receipts deposited into the operating ledger
              </p>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              {data.payments.length} Cleared Deposits
            </span>
          </div>

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '13px',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-soft)', color: 'var(--muted)' }}>
                <th style={{ padding: '10px 14px' }}>Receipt #</th>
                <th style={{ padding: '10px 14px' }}>Invoice</th>
                <th style={{ padding: '10px 14px' }}>Date</th>
                <th style={{ padding: '10px 14px' }}>Method</th>
                <th style={{ padding: '10px 14px' }}>Transaction Ref</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                  <td style={{ padding: '14px', fontWeight: 600 }}>{p.paymentNumber}</td>
                  <td style={{ padding: '14px' }}>{p.invoiceNumber}</td>
                  <td style={{ padding: '14px' }}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '14px' }}>
                    <span
                      style={{
                        textTransform: 'uppercase',
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgb(240, 240, 240)',
                        fontWeight: 600,
                      }}
                    >
                      {p.method}
                    </span>
                  </td>
                  <td style={{ padding: '14px', fontFamily: 'monospace', fontSize: '12px' }}>
                    {p.transactionRef}
                  </td>
                  <td
                    style={{
                      padding: '14px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#17c964',
                    }}
                  >
                    {formatCurrency(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* MODAL 1: CHANGE / UPGRADE PLAN WITH REAL-TIME PRORATION     */}
      {/* ─────────────────────────────────────────────────────────── */}
      {changePlanSub && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.02em' }}>
                Change Subscription Plan
              </h3>
              <button
                type="button"
                onClick={() => setChangePlanSub(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
              Current Plan: <strong>{changePlanSub.planName}</strong> ({formatCurrency(changePlanSub.price)}/{changePlanSub.billingInterval})
            </p>

            <div style={{ marginBottom: '18px' }}>
              <label className="form-label">Select Target Plan</label>
              <select
                className="form-input"
                value={targetPlanId}
                onChange={(e) => {
                  setTargetPlanId(e.target.value);
                  fetchProrationPreview(changePlanSub.id, e.target.value);
                }}
              >
                {availablePlans.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === changePlanSub.planId}>
                    {p.name} — {formatCurrency(p.price)}/{p.billingInterval}
                  </option>
                ))}
              </select>
            </div>

            {/* Proration Preview Breakdown */}
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgb(250, 250, 250)',
                border: '1px solid var(--border-soft)',
                marginBottom: '20px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '10px' }}>
                MATHEMATICAL PRORATION BREAKDOWN
              </div>

              {loadingProration ? (
                <div style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center' }}>
                  Calculating unused credit and prorated debit...
                </div>
              ) : prorationPreview ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Days Remaining</span>
                    <span>
                      {prorationPreview.daysRemaining} / {prorationPreview.totalDaysInPeriod} days
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Unused Old Plan Credit</span>
                    <span style={{ color: '#17c964' }}>
                      -{formatCurrency(prorationPreview.unusedOldPlanCredit)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Prorated New Plan Charge</span>
                    <span>+{formatCurrency(prorationPreview.proratedNewPlanDebit)}</span>
                  </div>
                  <div style={{ height: '1px', background: 'var(--border-soft)', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Net Immediate Adjustment</span>
                    <span
                      style={{
                        color: prorationPreview.netAdjustment >= 0 ? '#0a0a0a' : '#17c964',
                      }}
                    >
                      {formatCurrency(prorationPreview.netAdjustment)}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Select a plan to preview exact proration math.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setChangePlanSub(null)}
                style={{
                  height: '38px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-soft)',
                  background: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPlanChange}
                disabled={processingPlanChange || loadingProration}
                className="btn-primary"
                style={{ height: '38px', padding: '0 20px', fontSize: '13px' }}
              >
                {processingPlanChange ? 'Applying Plan...' : 'Confirm Plan Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* MODAL 2: CANCEL SUBSCRIPTION CONFIRMATION                   */}
      {/* ─────────────────────────────────────────────────────────── */}
      {cancelSub && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ef4444', marginBottom: '8px' }}>
              Cancel Subscription
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
              Are you sure you want to cancel <strong>{cancelSub.planName}</strong> ({cancelSub.subNumber})?
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label className="form-label">Cancellation Policy</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="cancelType"
                    checked={cancelType === 'end_of_period'}
                    onChange={() => setCancelType('end_of_period')}
                  />
                  <span>
                    <strong>End of current billing cycle</strong> (Recommended — service remains active until{' '}
                    {new Date(cancelSub.currentPeriodEnd).toLocaleDateString()})
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="cancelType"
                    checked={cancelType === 'immediate'}
                    onChange={() => setCancelType('immediate')}
                  />
                  <span>
                    <strong>Immediate cancellation</strong> (Deactivates service immediately)
                  </span>
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">Reason for cancellation (optional)</label>
              <input
                type="text"
                className="form-input"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setCancelSub(null)}
                style={{
                  height: '38px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-soft)',
                  background: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Keep Subscription
              </button>
              <button
                type="button"
                onClick={handleConfirmCancellation}
                style={{
                  height: '38px',
                  padding: '0 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* MODAL 3: MULTI-RAIL INVOICE PAYMENT SIMULATION             */}
      {/* ─────────────────────────────────────────────────────────── */}
      {payInvoiceModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.02em' }}>
                Settle Invoice {payInvoiceModal.invoiceNumber}
              </h3>
              <button
                type="button"
                onClick={() => setPayInvoiceModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                padding: '16px',
                background: 'rgb(250, 250, 250)',
                borderRadius: '12px',
                marginBottom: '18px',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--muted)' }}>Total Invoiced</span>
                <span>{formatCurrency(payInvoiceModal.total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--muted)' }}>Amount Previously Paid</span>
                <span>{formatCurrency(payInvoiceModal.amountPaid)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 700,
                  fontSize: '15px',
                }}
              >
                <span>Amount Outstanding Due</span>
                <span style={{ color: '#0a0a0a' }}>
                  {formatCurrency(payInvoiceModal.amountDue)}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Select Payment Rail</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {(['card', 'ach', 'wire'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPayMethod(method)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border:
                        payMethod === method
                          ? '2px solid #0a0a0a'
                          : '1px solid var(--border-soft)',
                      background: payMethod === method ? 'rgb(245, 245, 245)' : '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    {method === 'card' && 'Credit Card'}
                    {method === 'ach' && 'ACH Transfer'}
                    {method === 'wire' && 'Bank Wire'}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'rgba(23, 201, 100, 0.08)',
                color: '#17c964',
                fontSize: '12px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Shield size={14} />
              <span>Simulated gateway clears funds immediately to bank ledger.</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setPayInvoiceModal(null)}
                style={{
                  height: '38px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-soft)',
                  background: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessPayment}
                disabled={isProcessingPayment}
                className="btn-primary"
                style={{ height: '38px', padding: '0 20px', fontSize: '13px' }}
              >
                {isProcessingPayment
                  ? 'Processing Settlement...'
                  : `Pay ${formatCurrency(payInvoiceModal.amountDue)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* MODAL 4: DECLINE QUOTATION                                  */}
      {/* ─────────────────────────────────────────────────────────── */}
      {rejectQuoteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              Decline Proposal {rejectQuoteModal.quoteNumber}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
              Please provide feedback to the sales representative regarding this proposal:
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">Feedback / Reason</label>
              <textarea
                className="form-input"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setRejectQuoteModal(null)}
                style={{
                  height: '36px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-soft)',
                  background: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectQuote}
                className="btn-primary"
                style={{ height: '36px', padding: '0 18px', fontSize: '13px' }}
              >
                Submit Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* MODAL 5: INSTANT PAYMENT RECEIPT CONFIRMATION               */}
      {/* ─────────────────────────────────────────────────────────── */}
      {paymentSuccessReceipt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '460px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(23, 201, 100, 0.1)',
                color: '#17c964',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CheckCircle2 size={24} />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '4px' }}>
              Payment Settled Successfully
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px' }}>
              Receipt generated and cleared to customer ledger
            </p>

            <div
              style={{
                padding: '16px',
                background: 'rgb(250, 250, 250)',
                borderRadius: '12px',
                border: '1px solid var(--border-soft)',
                textAlign: 'left',
                fontSize: '13px',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--muted)' }}>Receipt #</span>
                <strong>{paymentSuccessReceipt.payment.paymentNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--muted)' }}>Invoice</span>
                <strong>{paymentSuccessReceipt.invoice.invoiceNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--muted)' }}>Amount Paid</span>
                <strong style={{ color: '#17c964' }}>
                  {formatCurrency(paymentSuccessReceipt.payment.amount)}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--muted)' }}>Rail</span>
                <span style={{ textTransform: 'uppercase' }}>
                  {paymentSuccessReceipt.payment.method}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Txn Reference</span>
                <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                  {paymentSuccessReceipt.payment.transactionRef}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={() => setPaymentSuccessReceipt(null)}
              style={{ width: '100%', height: '40px', fontSize: '13px' }}
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
