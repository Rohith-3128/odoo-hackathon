import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { AGENCY_PLANS, formatCurrency } from '../utils/pricing';

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (planName: string) => void;
}

export const PlansModal: React.FC<PlansModalProps> = ({
  isOpen,
  onClose,
  onSelectPlan,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly'>('monthly');

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Membership Plans"
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close plans modal"
        >
          <X size={18} />
        </button>

        <div style={{ textAlign: 'center', maxWidth: '520px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '36px',
              fontWeight: 600,
              letterSpacing: '-0.05em',
              marginBottom: '10px',
            }}
          >
            Membership Plans
          </h2>
          <p
            style={{
              fontSize: '15px',
              color: 'var(--muted)',
              lineHeight: 1.5,
              marginBottom: '24px',
            }}
          >
            Flexible creative partnerships designed for speed, scale, and uncompromising quality.
          </p>

          {/* Billing cycle switch */}
          <div
            style={{
              display: 'inline-flex',
              padding: '4px',
              background: 'rgb(245, 245, 245)',
              borderRadius: '9999px',
              border: '1px solid var(--border-soft)',
              marginBottom: '8px',
            }}
          >
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              style={{
                padding: '8px 20px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: billingCycle === 'monthly' ? '#0a0a0a' : 'transparent',
                color: billingCycle === 'monthly' ? '#ffffff' : 'var(--muted)',
                transition: 'all 0.2s ease',
              }}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('quarterly')}
              style={{
                padding: '8px 20px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: billingCycle === 'quarterly' ? '#0a0a0a' : 'transparent',
                color: billingCycle === 'quarterly' ? '#ffffff' : 'var(--muted)',
                transition: 'all 0.2s ease',
              }}
            >
              Quarterly <span style={{ color: '#17c964', marginLeft: '4px' }}>-10%</span>
            </button>
          </div>
        </div>

        <div className="plans-grid">
          {AGENCY_PLANS.map((plan) => {
            const price =
              billingCycle === 'monthly'
                ? plan.monthlyPrice
                : Math.round(plan.quarterlyPrice / 3);

            return (
              <div
                key={plan.id}
                className={`plan-card ${plan.popular ? 'popular' : ''}`}
              >
                <div>
                  {plan.popular && <div className="plan-badge">Most Popular</div>}
                  <h3 className="plan-name">{plan.name}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.4 }}>
                    {plan.tagline}
                  </p>

                  <div className="plan-price">
                    {formatCurrency(price)}
                    <span className="plan-interval"> / month</span>
                  </div>
                  {billingCycle === 'quarterly' && (
                    <div style={{ fontSize: '11px', color: '#17c964', fontWeight: 600 }}>
                      Billed {formatCurrency(plan.quarterlyPrice)} quarterly
                    </div>
                  )}

                  <ul className="plan-features-list">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="plan-feature-item">
                        <Check size={14} color="#0a0a0a" style={{ flexShrink: 0 }} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  style={{
                    width: '100%',
                    height: '48px',
                    fontSize: '14px',
                    marginTop: '16px',
                  }}
                  onClick={() => onSelectPlan(plan.name)}
                >
                  Join {plan.name}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
