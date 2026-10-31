import React, { useEffect, useState } from 'react';
import { api, Invoice, Payment } from '../../api/client';
import { PageHeader, StatusBadge } from './DesignSystem';
import { formatCurrency } from '../../utils/pricing';
import { FileText, ArrowDownToLine, X, CheckCircle2 } from 'lucide-react';

export const BillingView: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');

  // Pay Modal
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<Invoice | null>(null);
  const [payMethod, setPayMethod] = useState<'card' | 'wire' | 'ach'>('card');
  const [isSimulated, setIsSimulated] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paySuccessMsg, setPaySuccessMsg] = useState('');

  // Invoice Receipt Preview
  const [selectedInvoicePreview, setSelectedInvoicePreview] = useState<Invoice | null>(null);

  const loadData = async () => {
    try {
      const [invs, pays] = await Promise.all([api.invoices.list(), api.payments.list()]);
      setInvoices(invs);
      setPayments(pays);
    } catch (err) {
      console.error('Failed to load billing:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPay) return;

    try {
      setProcessing(true);
      const res = await api.invoices.pay(selectedInvoiceForPay.id, {
        method: payMethod,
        isSimulated,
      });
      setPaySuccessMsg(
        `Payment ${res.payment.paymentNumber} processed successfully! ${
          res.payment.isSimulated ? '(Simulated Transaction)' : '(Authoritative)'
        }`
      );
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Billing & Payment Ledger"
        description="Comprehensive accounting ledger distinguishing invoiced accounts receivable from cleared cash receipts."
        breadcrumbs={['Brightloop Nexus', 'Billing & Payments']}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              style={{
                padding: '8px 18px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: 600,
                border: '1px solid var(--border-soft)',
                background: activeTab === 'invoices' ? '#0a0a0a' : '#ffffff',
                color: activeTab === 'invoices' ? '#ffffff' : 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              Invoices ({invoices.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('payments')}
              style={{
                padding: '8px 18px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: 600,
                border: '1px solid var(--border-soft)',
                background: activeTab === 'payments' ? '#0a0a0a' : '#ffffff',
                color: activeTab === 'payments' ? '#ffffff' : 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              Cleared Receipts ({payments.length})
            </button>
          </div>
        }
      />

      {/* Invoices List */}
      {activeTab === 'invoices' && (
        <div style={{ border: '1px solid var(--border-soft)', borderRadius: '16px', overflow: 'hidden', background: '#ffffff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgb(250, 250, 250)', borderBottom: '1px solid var(--border-soft)' }}>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Invoice #</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Account</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Total Amount</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Outstanding Due</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Due Date</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Status</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    style={{ borderBottom: '1px solid var(--border-soft)', transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgb(253, 253, 253)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>{inv.invoiceNumber}</td>
                    <td style={{ padding: '16px 20px' }}>{inv.customerName}</td>
                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>{formatCurrency(inv.total)}</td>
                    <td style={{ padding: '16px 20px' }}>
                      {inv.amountDue > 0 ? (
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>{formatCurrency(inv.amountDue)}</span>
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>$0.00</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px' }}>{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <StatusBadge status={inv.status} />
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedInvoicePreview(inv)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-soft)',
                            background: '#ffffff',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <FileText size={12} />
                          <span>Receipt</span>
                        </button>

                        {inv.status === 'unpaid' && (
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => {
                              setSelectedInvoiceForPay(inv);
                              setPaySuccessMsg('');
                            }}
                            style={{
                              height: '28px',
                              padding: '0 12px',
                              fontSize: '12px',
                              borderRadius: '8px',
                            }}
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                    No invoices generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Cleared Payments Ledger */}
      {activeTab === 'payments' && (
        <div style={{ border: '1px solid var(--border-soft)', borderRadius: '16px', overflow: 'hidden', background: '#ffffff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgb(250, 250, 250)', borderBottom: '1px solid var(--border-soft)' }}>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Receipt #</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Invoice Ref</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Account</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Amount</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Method</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Environment</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Cleared At</th>
              </tr>
            </thead>
            <tbody>
              {payments.length > 0 ? (
                payments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>{p.paymentNumber}</td>
                    <td style={{ padding: '16px 20px' }}>{p.invoiceNumber}</td>
                    <td style={{ padding: '16px 20px' }}>{p.customerName}</td>
                    <td style={{ padding: '16px 20px', fontWeight: 700, color: '#17c964' }}>
                      {formatCurrency(p.amount)}
                    </td>
                    <td style={{ padding: '16px 20px', textTransform: 'uppercase', fontSize: '12px' }}>
                      {p.method}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {p.isSimulated ? (
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            background: 'rgb(245, 245, 245)',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--muted)',
                          }}
                        >
                          Demo Simulation
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            background: 'rgba(23,201,100,0.1)',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#17c964',
                          }}
                        >
                          Production Cleared
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--muted)' }}>
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                    No payment receipts cleared yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Process Payment Modal */}
      {selectedInvoiceForPay && (
        <div className="modal-backdrop" onClick={() => setSelectedInvoiceForPay(null)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close-btn" onClick={() => setSelectedInvoiceForPay(null)}>
              <X size={18} />
            </button>

            <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>Process Payment</h2>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
              Clear outstanding balance for <strong>{selectedInvoiceForPay.invoiceNumber}</strong> ({selectedInvoiceForPay.customerName}).
            </p>

            {paySuccessMsg ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <CheckCircle2 size={40} color="#17c964" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>Settled!</h3>
                <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>{paySuccessMsg}</p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setSelectedInvoiceForPay(null)}
                  style={{ height: '40px', padding: '0 24px', fontSize: '13px' }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleProcessPayment} className="booking-form">
                <div style={{ padding: '16px', background: 'rgb(250, 250, 250)', borderRadius: '12px', border: '1px solid var(--border-soft)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--muted)' }}>Amount Due</span>
                    <strong style={{ fontSize: '18px' }}>{formatCurrency(selectedInvoiceForPay.amountDue)}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    Payable to Brightloop Nexus Operating Account
                  </div>
                </div>

                <div>
                  <label className="form-label">Payment Channel</label>
                  <select
                    className="form-input"
                    value={payMethod}
                    onChange={(e: any) => setPayMethod(e.target.value)}
                  >
                    <option value="card">Credit Card (Stripe / AuthNet)</option>
                    <option value="ach">ACH Direct Debit</option>
                    <option value="wire">Bank Wire Transfer</option>
                  </select>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px',
                    background: 'rgb(252, 252, 252)',
                    borderRadius: '10px',
                    border: '1px solid var(--border-soft)',
                  }}
                >
                  <input
                    type="checkbox"
                    id="sim-check"
                    checked={isSimulated}
                    onChange={(e) => setIsSimulated(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="sim-check" style={{ fontSize: '13px', cursor: 'pointer' }}>
                    <strong>Mark as Demonstration Simulation</strong>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      Clearly labels the receipt as simulated for test auditing.
                    </div>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={processing}
                  className="btn-primary"
                  style={{ height: '44px', width: '100%', fontSize: '14px', marginTop: '10px' }}
                >
                  {processing ? 'Clearing Payment...' : `Authorize & Clear ${formatCurrency(selectedInvoiceForPay.amountDue)}`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Invoice Document Receipt Modal */}
      {selectedInvoicePreview && (
        <div className="modal-backdrop" onClick={() => setSelectedInvoicePreview(null)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close-btn" onClick={() => setSelectedInvoicePreview(null)}>
              <X size={18} />
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-soft)', paddingBottom: '20px', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '26px', fontWeight: 600 }}>
                  Brightloop Nexus<sup style={{ fontStyle: 'normal', fontSize: '12px', marginLeft: '2px' }}>®</sup>
                </h1>
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Enterprise Billing & Subscription Infrastructure</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{selectedInvoicePreview.invoiceNumber}</h2>
                <div style={{ marginTop: '4px' }}>
                  <StatusBadge status={selectedInvoicePreview.status} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--muted)' }}>Billed To:</span>
                <div style={{ fontWeight: 600, fontSize: '14px', marginTop: '2px' }}>{selectedInvoicePreview.customerName}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--muted)' }}>Due Date:</span>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>{new Date(selectedInvoicePreview.dueDate).toLocaleDateString()}</div>
              </div>
            </div>

            <div style={{ border: '1px solid var(--border-soft)', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgb(250, 250, 250)', borderBottom: '1px solid var(--border-soft)' }}>
                    <th style={{ padding: '10px 16px', color: 'var(--muted)' }}>Description</th>
                    <th style={{ padding: '10px 16px', color: 'var(--muted)', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoicePreview.items.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                      <td style={{ padding: '14px 16px' }}>{it.description}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(it.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ padding: '14px 16px', background: 'rgb(253, 253, 253)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                  <span>Total Amount</span>
                  <span>{formatCurrency(selectedInvoicePreview.total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#17c964' }}>
                  <span>Amount Paid</span>
                  <span>{formatCurrency(selectedInvoicePreview.amountPaid)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '15px', marginTop: '4px' }}>
                  <span>Balance Due</span>
                  <span>{formatCurrency(selectedInvoicePreview.amountDue)}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{ width: '100%', height: '44px', fontSize: '13px' }}
              onClick={() => {
                alert('Invoice document exported to PDF / Print queue.');
              }}
            >
              <ArrowDownToLine size={14} style={{ marginRight: '6px' }} />
              Export Official PDF Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
