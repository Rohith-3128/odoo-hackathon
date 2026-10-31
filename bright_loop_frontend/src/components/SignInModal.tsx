import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User as UserIcon, Building2, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api, User } from '../api/client';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
  onLoginSuccess: (user: User) => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  onOpenLogin,
  onLoginSuccess,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState<'customer' | 'sales' | 'finance' | 'admin'>('customer');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setRegisteredSuccess(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Please provide your name and email address.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await api.auth.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        company: company.trim() || `${name.trim()}'s Organization`,
        role,
      });

      if (res && res.user) {
        setRegisteredSuccess(true);
        setTimeout(() => {
          setIsLoading(false);
          onLoginSuccess(res.user);
        }, 600);
      } else {
        throw new Error('Registration failed. Please try again.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Failed to create your account. Please check details or try another email.');
    }
  };

  const roles = [
    {
      id: 'customer' as const,
      title: 'Customer',
      desc: 'Client portal, view quotes, pay invoices, manage plan',
    },
    {
      id: 'sales' as const,
      title: 'Sales Team',
      desc: 'Create quotations, manage leads, configure products',
    },
    {
      id: 'finance' as const,
      title: 'Finance & Billing',
      desc: 'Review receivables, tax policies, invoice collection',
    },
    {
      id: 'admin' as const,
      title: 'Administrator',
      desc: 'Full workspace access & system analytics',
    },
  ];

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 150,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.25s ease-out',
      }}
    >
      <div
        className="signin-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: '92vh',
          overflowY: 'auto',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.18)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          padding: '32px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close Sign In Dialog"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            padding: '6px',
            cursor: 'pointer',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--muted)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '9999px', background: '#ecfdf5', color: '#047857', fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '10px' }}>
            <ShieldCheck size={13} />
            <span>New Person Registration</span>
          </div>
          <h2
            style={{
              fontSize: '24px',
              fontFamily: 'var(--font-serif)',
              fontWeight: 400,
              color: 'var(--text)',
              letterSpacing: '-0.02em',
              margin: '0 0 6px 0',
            }}
          >
            Sign in as a new person
          </h2>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--muted)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Create your EZbill account to experience enterprise recurring billing, unified subscription dashboards, and client self-service.
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fee2e2',
              color: '#b91c1c',
              fontSize: '13px',
              lineHeight: 1.4,
            }}
          >
            {error}
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Full Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              Full Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <UserIcon
                size={15}
                color="var(--muted)"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                required
                placeholder="e.g. Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-soft)',
                  fontSize: '13px',
                  outline: 'none',
                  background: 'rgb(252, 252, 252)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-sans)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              Work Email <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={15}
                color="var(--muted)"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="email"
                required
                placeholder="alex@acmecorp.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-soft)',
                  fontSize: '13px',
                  outline: 'none',
                  background: 'rgb(252, 252, 252)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-sans)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Company / Organization */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              Organization / Company
            </label>
            <div style={{ position: 'relative' }}>
              <Building2
                size={15}
                color="var(--muted)"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Acme Global Inc."
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-soft)',
                  fontSize: '13px',
                  outline: 'none',
                  background: 'rgb(252, 252, 252)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-sans)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Role selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              Select Account Role
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
              }}
            >
              {roles.map((r) => {
                const isSelected = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: isSelected ? '1.5px solid #0a0a0a' : '1px solid var(--border-soft)',
                      backgroundColor: isSelected ? '#fafafa' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#0a0a0a' }}>
                        {r.title}
                      </span>
                      {isSelected && <CheckCircle2 size={13} color="#0a0a0a" />}
                    </div>
                    <span style={{ fontSize: '10.5px', color: 'var(--muted)', display: 'block', lineHeight: 1.3 }}>
                      {r.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Password field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text)',
                }}
              >
                Password
              </label>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                Demo environment
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock
                size={15}
                color="var(--muted)"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="password"
                placeholder="Create a secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-soft)',
                  fontSize: '13px',
                  outline: 'none',
                  background: 'rgb(252, 252, 252)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-sans)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || registeredSuccess}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '9999px',
              background: '#0a0a0a',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              letterSpacing: '-0.02em',
              transition: 'opacity 0.15s ease',
              marginTop: '6px',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {registeredSuccess ? (
              <>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Account Created! Entering Workspace...</span>
              </>
            ) : isLoading ? (
              <span>Setting up account...</span>
            ) : (
              <>
                <span>Sign in as New Person</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>

          {/* Already have an account? Log in */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '4px',
              fontSize: '13px',
              color: 'var(--muted)',
            }}
          >
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLogin();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#0a0a0a',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '0 2px',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            >
              Log in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
