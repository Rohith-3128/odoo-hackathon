import React, { useEffect, useState } from 'react';
import { api, Quotation, Customer, Plan } from '../../api/client';
import { PageHeader, StatusBadge } from './DesignSystem';
import { formatCurrency } from '../../utils/pricing';
import { Plus, Check, ArrowRight, X, FileText } from 'lucide-react';

export const QuotationsView: React.FC = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // New Quote Modal
  const [isNewQuoteOpen, setIsNewQuoteOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Selected Quote Detail Modal
  const [activeQuote, setActiveQuote] = useState<Quotation | null>(null);
  const [actionSuccess, setActionSuccess] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [quotesRes, custRes, plansRes] = await Promise.all([
        api.quotations.list(),
        api.customers.list(),
        api.plans.list(),
      ]);
      setQuotations(quotesRes);
      setCustomers(custRes.customers);
      setPlans(plansRes);
      if (custRes.customers.length > 0) setSelectedCustomerId(custRes.customers[0].id);
      if (plansRes.length > 0) setSelectedPlanId(plansRes[0].id);
    } catch (err) {
      console.error('Failed to load quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedPlanId) {
      setFormError('Please select a customer and plan');
      return;
    }
    setFormError('');

    try {
      await api.quotations.create({
        customerId: selectedCustomerId,
        planId: selectedPlanId,
        quantity,
        discount,
        notes,
      });
      setIsNewQuoteOpen(false);
      setDiscount(0);
      setNotes('');
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create quotation');
    }
  };

  const handleAcceptQuote = async (id: string) => {
    try {
      const updated = await api.quotations.accept(id);
      setActiveQuote(updated);
      setActionSuccess('Quotation accepted by customer.');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConvertQuote = async (id: string) => {
    if (!confirm('Convert this quotation into an active subscription and issue initial invoice?')) {
      return;
    }
    try {
      const res = await api.quotations.convert(id);
      setActiveQuote(res.quotation);
      setActionSuccess(`Successfully converted to Subscription ${res.subscription.subNumber} & Invoice ${res.invoice.invoiceNumber}!`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Sales Quotations & Proposals"
        description="Formal enterprise proposals with state transitions from draft to converted recurring subscriptions."
        breadcrumbs={['EZbill', 'Quotations']}
        action={
          <button
            type="button"
            className="btn-primary"
            style={{ height: '40px', padding: '0 20px', fontSize: '13px' }}
            onClick={() => setIsNewQuoteOpen(true)}
          >
            <Plus size={15} style={{ marginRight: '6px' }} />
            New Quotation
          </button>
        }
      />

      <div style={{ border: '1px solid var(--border-soft)', borderRadius: '16px', overflow: 'hidden', background: '#ffffff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'rgb(250, 250, 250)', borderBottom: '1px solid var(--border-soft)' }}>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Quote #</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Customer</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Items & Plan</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Total Amount</th>
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
                  <td style={{ padding: '16px 20px', fontWeight: 600 }}>{q.quoteNumber}</td>
                  <td style={{ padding: '16px 20px' }}>{q.customerName}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <div>{q.items[0]?.planName || 'Custom'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Qty: {q.items[0]?.quantity}</div>
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 600 }}>
                    {formatCurrency(q.total)}
                    {q.totalDiscount > 0 && (
                      <span style={{ fontSize: '11px', color: '#17c964', display: 'block' }}>
                        -${q.totalDiscount} discount
                      </span>
                    )}
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
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                  No quotations created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {activeQuote && (
        <div className="modal-backdrop" onClick={() => setActiveQuote(null)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close-btn" onClick={() => setActiveQuote(null)}>
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <FileText size={24} color="#0a0a0a" />
              <h2 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.04em' }}>
                {activeQuote.quoteNumber}
              </h2>
              <StatusBadge status={activeQuote.status} />
            </div>

            <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
              Issued to <strong>{activeQuote.customerName}</strong> on {new Date(activeQuote.createdAt).toLocaleDateString()}
            </p>

            {actionSuccess && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(23, 201, 100, 0.1)',
                  color: '#17c964',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '20px',
                }}
              >
                {actionSuccess}
              </div>
            )}

            <div style={{ border: '1px solid var(--border-soft)', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgb(250, 250, 250)', borderBottom: '1px solid var(--border-soft)' }}>
                    <th style={{ padding: '10px 16px', color: 'var(--muted)' }}>Item</th>
                    <th style={{ padding: '10px 16px', color: 'var(--muted)' }}>Rate</th>
                    <th style={{ padding: '10px 16px', color: 'var(--muted)' }}>Qty</th>
                    <th style={{ padding: '10px 16px', color: 'var(--muted)', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activeQuote.items.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{it.planName}</td>
                      <td style={{ padding: '12px 16px' }}>{formatCurrency(it.unitPrice)}</td>
                      <td style={{ padding: '12px 16px' }}>{it.quantity}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(it.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ padding: '14px 16px', background: 'rgb(253, 253, 253)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                  <span>Subtotal</span>
                  <span>{formatCurrency(activeQuote.subtotal)}</span>
                </div>
                {activeQuote.totalDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#17c964' }}>
                    <span>Special Discount</span>
                    <span>-{formatCurrency(activeQuote.totalDiscount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '15px', marginTop: '4px' }}>
                  <span>Authorized Total</span>
                  <span>{formatCurrency(activeQuote.total)}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              {activeQuote.status === 'sent' && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ flex: 1, height: '44px', fontSize: '13px' }}
                  onClick={() => handleAcceptQuote(activeQuote.id)}
                >
                  <Check size={14} style={{ marginRight: '6px' }} />
                  Record Customer Acceptance
                </button>
              )}

              {activeQuote.status === 'accepted' && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ flex: 1, height: '44px', fontSize: '13px', background: '#0a0a0a' }}
                  onClick={() => handleConvertQuote(activeQuote.id)}
                >
                  <ArrowRight size={14} style={{ marginRight: '6px' }} />
                  Convert to Active Subscription & Invoice
                </button>
              )}

              {activeQuote.status === 'converted' && (
                <div style={{ color: '#17c964', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={16} />
                  Quotation converted and active in production billing engine.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isNewQuoteOpen && (
        <div className="modal-backdrop" onClick={() => setIsNewQuoteOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close-btn" onClick={() => setIsNewQuoteOpen(false)}>
              <X size={18} />
            </button>

            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '6px' }}>Issue New Proposal</h2>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
              Configure customized pricing tier, quantities, and discounts for a prospect.
            </p>

            <form onSubmit={handleCreateQuotation} className="booking-form">
              <div>
                <label className="form-label">Customer / Account *</label>
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
                <label className="form-label">Subscription Plan *</label>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Seat Quantity</label>
                  <input
                    type="number"
                    min={1}
                    className="form-input"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="form-label">Discount ($)</label>
                  <input
                    type="number"
                    min={0}
                    className="form-input"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Contract Notes & Scope</label>
                <textarea
                  rows={3}
                  className="form-input"
                  placeholder="Pilot pricing terms valid for 14 calendar days..."
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
                style={{ height: '44px', width: '100%', fontSize: '14px', marginTop: '12px' }}
              >
                Issue Formal Quotation
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
