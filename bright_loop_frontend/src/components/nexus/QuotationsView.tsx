import React, { useEffect, useState } from 'react';
import { api, Quotation, Customer, Plan } from '../../api/client';
import { PageHeader, StatusBadge } from './DesignSystem';
import { formatCurrency } from '../../utils/pricing';
import { Plus, Check, ArrowRight, X, FileText, Send, XCircle, RotateCcw, Clock, Search, ShieldCheck } from 'lucide-react';

export const QuotationsView: React.FC = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // New Quote Modal State
  const [isNewQuoteOpen, setIsNewQuoteOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newQuoteItems, setNewQuoteItems] = useState<Array<{
    planId: string;
    quantity: number;
    discount: number;
    taxRate: number;
  }>>([]);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('Payment due upon receipt. Subject to EZbill Master Services Agreement.');
  const [expiresDays, setExpiresDays] = useState(14);
  const [sendImmediately, setSendImmediately] = useState(true);
  const [formError, setFormError] = useState('');

  // Selected Quote Detail Modal State
  const [activeQuote, setActiveQuote] = useState<Quotation | null>(null);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Revise Modal State
  const [isReviseModalOpen, setIsReviseModalOpen] = useState(false);
  const [reviseDiscount, setReviseDiscount] = useState(0);
  const [reviseNotes, setReviseNotes] = useState('');
  const [reviseReason, setReviseReason] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [quotesRes, custRes, plansRes] = await Promise.all([
        api.quotations.list(statusFilter, searchQuery),
        api.customers.list(),
        api.plans.list(),
      ]);
      setQuotations(quotesRes);
      setCustomers(custRes.customers);
      setPlans(plansRes);
      if (custRes.customers.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(custRes.customers[0].id);
      }
      if (plansRes.length > 0 && newQuoteItems.length === 0) {
        setNewQuoteItems([{ planId: plansRes[0].id, quantity: 1, discount: 0, taxRate: 18 }]);
      }
    } catch (err) {
      console.error('Failed to load quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Add line item in new quote form
  const addLineItem = () => {
    if (plans.length > 0) {
      setNewQuoteItems([...newQuoteItems, { planId: plans[0].id, quantity: 1, discount: 0, taxRate: 18 }]);
    }
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    if (newQuoteItems.length > 1) {
      setNewQuoteItems(newQuoteItems.filter((_, idx) => idx !== index));
    }
  };

  // Update line item
  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...newQuoteItems];
    updated[index] = { ...updated[index], [field]: value };
    setNewQuoteItems(updated);
  };

  // Compute live totals for new quote form
  const computeNewQuoteTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    newQuoteItems.forEach((it) => {
      const plan = plans.find((p) => p.id === it.planId);
      const price = plan ? plan.price : 0;
      const itemSubtotal = price * Math.max(1, it.quantity);
      const itemDiscount = Math.min(itemSubtotal, Math.max(0, it.discount));
      const taxable = itemSubtotal - itemDiscount;
      const itemTax = (taxable * (it.taxRate || 0)) / 100;

      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;
      totalTax += itemTax;
    });

    return {
      subtotal,
      totalDiscount,
      totalTax,
      total: subtotal - totalDiscount + totalTax,
    };
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || newQuoteItems.length === 0) {
      setFormError('Please select a customer and configure at least one plan item.');
      return;
    }
    setFormError('');

    try {
      const itemsPayload = newQuoteItems.map((it) => {
        const plan = plans.find((p) => p.id === it.planId);
        return {
          planId: it.planId,
          planName: plan ? plan.name : 'Subscription Plan',
          quantity: it.quantity,
          unitPrice: plan ? plan.price : 0,
          discount: it.discount,
          taxRate: it.taxRate,
        };
      });

      await api.quotations.create({
        customerId: selectedCustomerId,
        items: itemsPayload,
        notes,
        termsAndConditions: terms,
        expiresDays,
        sendNow: sendImmediately,
      });

      setIsNewQuoteOpen(false);
      setNotes('');
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create quotation');
    }
  };

  const handleSendQuote = async (id: string) => {
    try {
      setActionError('');
      const updated = await api.quotations.send(id);
      setActiveQuote(updated);
      setActionSuccess('Quotation formally dispatched to customer via verified channel.');
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to send quotation.');
    }
  };

  const handleAcceptQuote = async (id: string) => {
    try {
      setActionError('');
      const updated = await api.quotations.accept(id);
      setActiveQuote(updated);
      setActionSuccess('Customer acceptance recorded successfully.');
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to record acceptance.');
    }
  };

  const handleRejectQuote = async () => {
    if (!activeQuote) return;
    try {
      setActionError('');
      const updated = await api.quotations.reject(activeQuote.id, rejectReason);
      setActiveQuote(updated);
      setIsRejectModalOpen(false);
      setRejectReason('');
      setActionSuccess('Quotation marked as rejected.');
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject quotation.');
    }
  };

  const handleExpireQuote = async (id: string) => {
    try {
      setActionError('');
      const updated = await api.quotations.expire(id);
      setActiveQuote(updated);
      setActionSuccess('Quotation expired.');
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to expire quotation.');
    }
  };

  const handleReviseQuote = async () => {
    if (!activeQuote) return;
    try {
      setActionError('');
      const res = await api.quotations.revise(activeQuote.id, {
        discount: reviseDiscount,
        notes: reviseNotes || activeQuote.notes,
        reason: reviseReason || 'Renegotiated commercial terms.',
      });
      setActiveQuote(res.revisedQuote);
      setIsReviseModalOpen(false);
      setActionSuccess(`Revised quotation ${res.revisedQuote.quoteNumber} created.`);
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to revise quotation.');
    }
  };

  const handleConvertQuote = async (id: string) => {
    if (!confirm('Convert this accepted quotation into an active subscription and issue initial invoice?')) {
      return;
    }
    try {
      setActionError('');
      const res = await api.quotations.convert(id);
      setActiveQuote(res.quotation);
      setActionSuccess(`Successfully converted to Subscription ${res.subscription.subNumber} & Invoice ${res.invoice.invoiceNumber}!`);
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to convert quotation.');
    }
  };

  const newTotals = computeNewQuoteTotals();

  const statuses = ['all', 'draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'];

  return (
    <div>
      <PageHeader
        title="Quotation & Proposal Management"
        description="Formal proposal lifecycle: multi-item calculation, GST breakdown, customer review, revisions, and safe subscription conversion."
        breadcrumbs={['EZbill', 'Quotations']}
        action={
          <button
            type="button"
            className="btn-primary"
            style={{ height: '40px', padding: '0 20px', fontSize: '13px' }}
            onClick={() => {
              setIsNewQuoteOpen(true);
              setFormError('');
            }}
          >
            <Plus size={15} style={{ marginRight: '6px' }} />
            New Quotation
          </button>
        }
      />

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

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--muted)' }} />
            <input
              type="text"
              placeholder="Search quotes, customers..."
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '220px', height: '34px', paddingLeft: '32px', fontSize: '12px' }}
            />
          </div>
          <button
            type="submit"
            className="btn-secondary"
            style={{ height: '34px', padding: '0 12px', fontSize: '12px' }}
          >
            Filter
          </button>
        </form>
      </div>

      {/* Quotations Table */}
      <div style={{ border: '1px solid var(--border-soft)', borderRadius: '16px', overflow: 'hidden', background: '#ffffff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'rgb(250, 250, 250)', borderBottom: '1px solid var(--border-soft)' }}>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Quote #</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Customer</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Items & Plans</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Total Amount</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Expiry Date</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Status</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotations.length > 0 ? (
              quotations.map((q) => (
                <tr
                  key={q.id}
                  style={{ borderBottom: '1px solid var(--border-soft)', transition: 'background 0.15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgb(253, 253, 253)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '16px 20px', fontWeight: 600 }}>
                    {q.quoteNumber}
                    {q.revisionNumber && q.revisionNumber > 1 && (
                      <span style={{ marginLeft: '6px', fontSize: '11px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', padding: '2px 6px', borderRadius: '4px' }}>
                        Rev {q.revisionNumber}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 600 }}>{q.customerName}</div>
                    {q.customerEmail && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{q.customerEmail}</div>}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div>{q.items[0]?.planName || 'Plan'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {q.items.length > 1 ? `+ ${q.items.length - 1} more item(s)` : `Qty: ${q.items[0]?.quantity || 1}`}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 600 }}>
                    {formatCurrency(q.total)}
                    {q.totalDiscount > 0 && (
                      <span style={{ fontSize: '11px', color: '#17c964', display: 'block' }}>
                        -${formatCurrency(q.totalDiscount)} discount
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '12px' }}>
                    {new Date(q.expiresAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <StatusBadge status={q.status} />
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveQuote(q);
                        setActionSuccess('');
                        setActionError('');
                      }}
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
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                  {loading ? 'Loading quotations...' : 'No quotations found matching filter.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Quotation Details / Management Modal */}
      {activeQuote && (
        <div className="modal-backdrop" onClick={() => setActiveQuote(null)}>
          <div className="modal-card" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close-btn" onClick={() => setActiveQuote(null)}>
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <FileText size={24} color="#0a0a0a" />
              <h2 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.04em' }}>
                {activeQuote.quoteNumber}
              </h2>
              <StatusBadge status={activeQuote.status} />
              {activeQuote.deliveryStatus === 'delivered' && (
                <span style={{ fontSize: '11px', color: '#17c964', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={14} /> Delivered
                </span>
              )}
            </div>

            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '18px' }}>
              Issued to <strong>{activeQuote.customerName}</strong> on {new Date(activeQuote.createdAt).toLocaleDateString()} · Expires on {new Date(activeQuote.expiresAt).toLocaleDateString()}
            </p>

            {actionSuccess && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(23, 201, 100, 0.1)', color: '#17c964', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
                {actionSuccess}
              </div>
            )}

            {actionError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
                {actionError}
              </div>
            )}

            {/* Line Items Table */}
            <div style={{ border: '1px solid var(--border-soft)', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgb(250, 250, 250)', borderBottom: '1px solid var(--border-soft)' }}>
                    <th style={{ padding: '10px 14px', color: 'var(--muted)' }}>Product / Plan</th>
                    <th style={{ padding: '10px 14px', color: 'var(--muted)' }}>Unit Rate</th>
                    <th style={{ padding: '10px 14px', color: 'var(--muted)' }}>Qty</th>
                    <th style={{ padding: '10px 14px', color: 'var(--muted)' }}>Tax (GST)</th>
                    <th style={{ padding: '10px 14px', color: 'var(--muted)', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activeQuote.items.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{it.planName}</td>
                      <td style={{ padding: '10px 14px' }}>{formatCurrency(it.unitPrice)}</td>
                      <td style={{ padding: '10px 14px' }}>{it.quantity}</td>
                      <td style={{ padding: '10px 14px' }}>{it.taxRate ? `${it.taxRate}%` : '0%'}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(it.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Calculation Breakdown */}
              <div style={{ padding: '12px 16px', background: 'rgb(253, 253, 253)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                  <span>Gross Subtotal</span>
                  <span>{formatCurrency(activeQuote.subtotal)}</span>
                </div>
                {activeQuote.totalDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#17c964' }}>
                    <span>Special Discount</span>
                    <span>-{formatCurrency(activeQuote.totalDiscount)}</span>
                  </div>
                )}
                {activeQuote.totalTax !== undefined && activeQuote.totalTax > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                    <span>Applicable GST Tax</span>
                    <span>+{formatCurrency(activeQuote.totalTax)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '15px', marginTop: '4px', borderTop: '1px solid var(--border-soft)', paddingTop: '6px' }}>
                  <span>Authorized Grand Total</span>
                  <span>{formatCurrency(activeQuote.total)}</span>
                </div>
              </div>
            </div>

            {/* Notes & Terms */}
            {activeQuote.notes && (
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px', background: 'rgb(250, 250, 250)', padding: '10px 12px', borderRadius: '8px' }}>
                <strong>Scope Notes:</strong> {activeQuote.notes}
              </div>
            )}

            {/* Revisions History Timeline */}
            {activeQuote.revisions && activeQuote.revisions.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                  Revision Lineage:
                </div>
                {activeQuote.revisions.map((rev, idx) => (
                  <div key={idx} style={{ fontSize: '11px', color: 'var(--muted)', padding: '6px 10px', background: 'rgb(250, 250, 250)', borderRadius: '6px', marginBottom: '4px' }}>
                    Revision #{rev.revisionNumber} by {rev.revisedBy} on {new Date(rev.revisedAt).toLocaleDateString()} — {rev.reason}
                  </div>
                ))}
              </div>
            )}

            {/* State Machine Transition Actions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '20px' }}>
              {activeQuote.status === 'draft' && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ flex: 1, height: '40px', fontSize: '13px' }}
                  onClick={() => handleSendQuote(activeQuote.id)}
                >
                  <Send size={14} style={{ marginRight: '6px' }} />
                  Dispatch Quotation to Customer
                </button>
              )}

              {activeQuote.status === 'sent' && (
                <>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ flex: 1, height: '40px', fontSize: '13px', background: '#17c964' }}
                    onClick={() => handleAcceptQuote(activeQuote.id)}
                  >
                    <Check size={14} style={{ marginRight: '6px' }} />
                    Record Acceptance
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ height: '40px', fontSize: '13px', color: '#ef4444' }}
                    onClick={() => setIsRejectModalOpen(true)}
                  >
                    <XCircle size={14} style={{ marginRight: '6px' }} />
                    Reject
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ height: '40px', fontSize: '13px' }}
                    onClick={() => {
                      setIsReviseModalOpen(true);
                      setReviseDiscount(activeQuote.totalDiscount);
                    }}
                  >
                    <RotateCcw size={14} style={{ marginRight: '6px' }} />
                    Revise Terms
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ height: '40px', fontSize: '13px' }}
                    onClick={() => handleExpireQuote(activeQuote.id)}
                  >
                    <Clock size={14} style={{ marginRight: '6px' }} />
                    Expire
                  </button>
                </>
              )}

              {activeQuote.status === 'accepted' && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ flex: 1, height: '44px', fontSize: '13px', background: '#0a0a0a' }}
                  onClick={() => handleConvertQuote(activeQuote.id)}
                >
                  <ArrowRight size={14} style={{ marginRight: '6px' }} />
                  Convert to Active Subscription & Issue Invoice
                </button>
              )}

              {(activeQuote.status === 'rejected' || activeQuote.status === 'expired') && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ flex: 1, height: '40px', fontSize: '13px' }}
                  onClick={() => {
                    setIsReviseModalOpen(true);
                    setReviseDiscount(activeQuote.totalDiscount);
                  }}
                >
                  <RotateCcw size={14} style={{ marginRight: '6px' }} />
                  Issue New Revision (R{(activeQuote.revisionNumber || 1) + 1})
                </button>
              )}

              {activeQuote.status === 'converted' && (
                <div style={{ color: '#17c964', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={16} />
                  Converted to active subscription. Billing cycle initiated.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {isRejectModalOpen && activeQuote && (
        <div className="modal-backdrop" onClick={() => setIsRejectModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Record Quotation Rejection</h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '14px' }}>
              State the reason for rejecting {activeQuote.quoteNumber}.
            </p>
            <textarea
              rows={3}
              className="form-input"
              placeholder="e.g. Budget constraints, selected competing provider, scope reduction required..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1, height: '38px' }}
                onClick={() => setIsRejectModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ flex: 1, height: '38px', background: '#ef4444' }}
                onClick={handleRejectQuote}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revise Modal */}
      {isReviseModalOpen && activeQuote && (
        <div className="modal-backdrop" onClick={() => setIsReviseModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              Revise Quotation {activeQuote.quoteNumber}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
              Issue revision R{(activeQuote.revisionNumber || 1) + 1} with updated commercial terms.
            </p>
            <div className="booking-form">
              <div>
                <label className="form-label">Revision Reason</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Client requested 10% pilot discount"
                  value={reviseReason}
                  onChange={(e) => setReviseReason(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Updated Discount Amount ($)</label>
                <input
                  type="number"
                  min={0}
                  className="form-input"
                  value={reviseDiscount}
                  onChange={(e) => setReviseDiscount(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="form-label">Updated Contract Notes</label>
                <textarea
                  rows={2}
                  className="form-input"
                  value={reviseNotes}
                  onChange={(e) => setReviseNotes(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, height: '38px' }}
                  onClick={() => setIsReviseModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ flex: 1, height: '38px' }}
                  onClick={handleReviseQuote}
                >
                  Issue Revision
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create New Quotation Modal (Multi-item support) */}
      {isNewQuoteOpen && (
        <div className="modal-backdrop" onClick={() => setIsNewQuoteOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close-btn" onClick={() => setIsNewQuoteOpen(false)}>
              <X size={18} />
            </button>

            <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '4px' }}>Issue Formal Commercial Proposal</h2>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '18px' }}>
              Multi-item quotation with authoritative plan pricing, line discounts, and GST taxes.
            </p>

            <form onSubmit={handleCreateQuotation} className="booking-form">
              <div>
                <label className="form-label">Target Customer / Account *</label>
                <select
                  className="form-input"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  required
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company} ({c.name} — {c.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Line Items Section */}
              <div style={{ border: '1px solid var(--border-soft)', borderRadius: '10px', padding: '14px', background: 'rgb(253, 253, 253)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>Proposal Line Items</label>
                  <button
                    type="button"
                    onClick={addLineItem}
                    style={{ fontSize: '12px', background: 'none', border: 'none', color: '#0a0a0a', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={14} /> Add Item
                  </button>
                </div>

                {newQuoteItems.map((item, idx) => {
                  const plan = plans.find((p) => p.id === item.planId);
                  return (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                      <select
                        className="form-input"
                        style={{ height: '36px', fontSize: '12px' }}
                        value={item.planId}
                        onChange={(e) => updateLineItem(idx, 'planId', e.target.value)}
                        required
                      >
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (${p.price})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min={1}
                        className="form-input"
                        placeholder="Qty"
                        style={{ height: '36px', fontSize: '12px' }}
                        value={item.quantity}
                        onChange={(e) => updateLineItem(idx, 'quantity', Number(e.target.value))}
                        title="Quantity"
                      />

                      <input
                        type="number"
                        min={0}
                        className="form-input"
                        placeholder="Disc $"
                        style={{ height: '36px', fontSize: '12px' }}
                        value={item.discount}
                        onChange={(e) => updateLineItem(idx, 'discount', Number(e.target.value))}
                        title="Discount ($)"
                      />

                      <select
                        className="form-input"
                        style={{ height: '36px', fontSize: '12px' }}
                        value={item.taxRate}
                        onChange={(e) => updateLineItem(idx, 'taxRate', Number(e.target.value))}
                        title="GST Tax Rate"
                      >
                        <option value={0}>0% Tax</option>
                        <option value={5}>5% GST</option>
                        <option value={12}>12% GST</option>
                        <option value={18}>18% GST</option>
                      </select>

                      {newQuoteItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(idx)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Live Totals Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-soft)', paddingTop: '10px', marginTop: '10px', fontSize: '12px' }}>
                  <span>Subtotal: <strong>{formatCurrency(newTotals.subtotal)}</strong></span>
                  <span>Discount: <strong>-{formatCurrency(newTotals.totalDiscount)}</strong></span>
                  <span>GST: <strong>+{formatCurrency(newTotals.totalTax)}</strong></span>
                  <span style={{ fontWeight: 700, fontSize: '13px' }}>Total: {formatCurrency(newTotals.total)}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Expiry Period (Days)</label>
                  <input
                    type="number"
                    min={1}
                    className="form-input"
                    value={expiresDays}
                    onChange={(e) => setExpiresDays(Number(e.target.value))}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={sendImmediately}
                      onChange={(e) => setSendImmediately(e.target.checked)}
                    />
                    <span>Dispatch Immediately (Status: Sent)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="form-label">Proposal Scope & Notes</label>
                <textarea
                  rows={2}
                  className="form-input"
                  placeholder="Pilot commercial pricing terms valid for enterprise rollout..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {formError && (
                <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: 500 }}>
                  {formError}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                style={{ height: '44px', width: '100%', fontSize: '14px', marginTop: '10px' }}
              >
                {sendImmediately ? 'Issue & Dispatch Quotation' : 'Save as Draft Proposal'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
