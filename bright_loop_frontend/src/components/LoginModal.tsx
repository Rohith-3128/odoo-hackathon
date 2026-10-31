import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, ArrowRight, CheckCircle2, Shield, User as UserIcon } from 'lucide-react';
import { api, User } from '../api/client';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [password, setPassword] = useState('••••••••••••');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.auth.getUsers().then((fetchedUsers) => {
        setUsers(fetchedUsers);
        if (fetchedUsers.length > 0 && !selectedEmail) {
          setSelectedEmail(fetchedUsers[0].email);
        }
      });
      setError(null);
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
    setError(null);
    setIsLoading(true);

    try {
      const res = await api.auth.login(selectedEmail);
      if (res && res.user) {
        setIsLoading(false);
        onLoginSuccess(res.user);
      } else {
        throw new Error('User not found');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Invalid credentials. Please select an existing user.');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin & CEO', bg: '#0a0a0a', color: '#ffffff' };
      case 'finance':
        return { label: 'Finance Controller', bg: '#f4f4f5', color: '#18181b' };
      case 'sales':
        return { label: 'Sales Director', bg: '#f4f4f5', color: '#18181b' };
      case 'customer':
        return { label: 'Client Portal', bg: '#ecfdf5', color: '#047857' };
      default:
        return { label: role, bg: '#f4f4f5', color: '#18181b' };
    }
  };

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
        className="login-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid var(--border-soft)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.16)',
          padding: '36px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '22px',
            right: '22px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '1px solid var(--border-soft)',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--muted)',
            transition: 'all 0.15s ease',
          }}
          aria-label="Close login dialog"
        >
          <X size={16} />
        </button>

        {/* Brand & Heading */}
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '22px',
              fontStyle: 'italic',
              fontWeight: 600,
              letterSpacing: '-0.07em',
              marginBottom: '6px',
            }}
          >
            EZbill<sup style={{ fontStyle: 'normal', fontSize: '11px', marginLeft: '2px' }}>®</sup>
          </div>
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 600,
              letterSpacing: '-0.04em',
              margin: '0 0 6px 0',
              color: 'var(--text)',
            }}
          >
            Log in to EZbill Workspace
          </h2>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--muted)',
              lineHeight: 1.45,
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Select a verified persona or enter workspace credentials to access your live operating system.
          </p>
        </div>

        {/* Quick Persona Selector */}
        <div style={{ marginBottom: '22px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--muted)',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Shield size={12} />
            <span>Select Simulated Identity</span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              maxHeight: '180px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {users.map((user) => {
              const isSelected = selectedEmail === user.email;
              const badge = getRoleBadge(user.role);
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    setSelectedEmail(user.email);
                    setError(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: isSelected ? '1.5px solid #0a0a0a' : '1px solid var(--border-soft)',
                    background: isSelected ? 'rgb(250, 250, 250)' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isSelected ? '#0a0a0a' : '#f4f4f5',
                        color: isSelected ? '#ffffff' : '#18181b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 500,
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      background: badge.bg,
                      color: badge.color,
                    }}
                  >
                    {badge.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                color: '#b91c1c',
                fontSize: '12px',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text)',
                marginBottom: '6px',
              }}
            >
              Account Email
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
                value={selectedEmail}
                onChange={(e) => setSelectedEmail(e.target.value)}
                placeholder="name@ezbill.internal"
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
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '22px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
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
                required
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
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !selectedEmail}
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
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign in & Enter EZbill Workspace</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
