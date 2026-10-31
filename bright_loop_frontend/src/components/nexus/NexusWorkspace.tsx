import React, { useState, useEffect } from 'react';
import { api, User } from '../../api/client';
import { DashboardView } from './DashboardView';
import { CustomersView } from './CustomersView';
import { ProductsPlansView } from './ProductsPlansView';
import { QuotationsView } from './QuotationsView';
import { SubscriptionsView } from './SubscriptionsView';
import { BillingView } from './BillingView';
import { FinancialReportsView } from './FinancialReportsView';
import { CustomerPortalView } from './CustomerPortalView';
import {
  LayoutDashboard,
  Users,
  Layers,
  FileSpreadsheet,
  Repeat,
  Receipt,
  PieChart,
  UserCheck,
  ArrowLeft,
  ChevronDown,
  LogOut,
} from 'lucide-react';

interface NexusWorkspaceProps {
  onBackToLanding: () => void;
  initialTab?: string;
  authenticatedUser?: User | null;
}

export const NexusWorkspace: React.FC<NexusWorkspaceProps> = ({
  onBackToLanding,
  initialTab = 'dashboard',
  authenticatedUser = null,
}) => {
  // Always default directly to the simple, unified dashboard upon signin or login
  const [activeTab, setActiveTab] = useState(initialTab);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(authenticatedUser);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    api.auth.getUsers().then((res) => {
      setUsers(res);
      if (authenticatedUser) {
        setCurrentUser(authenticatedUser);
      } else if (!currentUser && res.length > 0) {
        setCurrentUser(res[0]); // default Julian Vance (Admin)
      }
    });
  }, [authenticatedUser]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'finance', 'sales', 'customer'] },
    { id: 'customers', label: 'Customers', icon: Users, roles: ['admin', 'sales', 'finance'] },
    { id: 'products', label: 'Products & Plans', icon: Layers, roles: ['admin', 'sales'] },
    { id: 'quotations', label: 'Quotations', icon: FileSpreadsheet, roles: ['admin', 'sales'] },
    { id: 'subscriptions', label: 'Subscriptions', icon: Repeat, roles: ['admin', 'finance', 'sales'] },
    { id: 'billing', label: 'Invoices & Billing', icon: Receipt, roles: ['admin', 'finance'] },
    { id: 'reports', label: 'Financial Reports', icon: PieChart, roles: ['admin', 'finance'] },
    { id: 'portal', label: 'Customer Portal', icon: UserCheck, roles: ['admin', 'customer'] },
  ];

  const allowedNavItems = navItems.filter(
    (item) => !currentUser || currentUser.role === 'admin' || item.roles.includes(currentUser.role)
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fafafa', color: '#0a0a0a' }}>
      {/* Sidebar Navigation */}
      <aside
        style={{
          width: '260px',
          background: '#ffffff',
          borderRight: '1px solid var(--border-soft)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 50,
        }}
      >
        <div>
          {/* Workspace Brand Header */}
          <div
            style={{
              padding: '24px 20px',
              borderBottom: '1px solid var(--border-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '20px',
                  fontWeight: 600,
                  fontStyle: 'italic',
                  letterSpacing: '-0.06em',
                }}
              >
                EZbill<sup style={{ fontStyle: 'normal', fontSize: '10px', marginLeft: '2px' }}>®</sup>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                Subscription Operating System
              </div>
            </div>

            <button
              type="button"
              onClick={onBackToLanding}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1px solid var(--border-soft)',
                background: 'rgb(250, 250, 250)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Return to Landing Page"
            >
              <ArrowLeft size={14} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {allowedNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isActive ? '#0a0a0a' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text)',
                    fontSize: '13px',
                    fontWeight: 500,
                    letterSpacing: '-0.01em',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={16} color={isActive ? '#ffffff' : 'var(--muted)'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Account / Role Switcher */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-soft)', position: 'relative' }}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '12px',
              border: '1px solid var(--border-soft)',
              background: 'rgb(252, 252, 252)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#0a0a0a',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {currentUser?.name || 'Active User'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'capitalize' }}>
                  {currentUser?.role || 'Guest'}
                </div>
              </div>
            </div>
            <ChevronDown size={14} color="var(--muted)" />
          </button>

          {isUserMenuOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: '76px',
                left: '16px',
                right: '16px',
                background: '#ffffff',
                border: '1px solid var(--border-soft)',
                borderRadius: '14px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                padding: '8px',
                zIndex: 60,
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', padding: '6px 8px' }}>
                SWITCH SIMULATED IDENTITY
              </div>
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setCurrentUser(u);
                    setIsUserMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: currentUser?.id === u.id ? 'rgb(245, 245, 245)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '11px' }}>{u.email}</div>
                  </div>
                  <span style={{ fontSize: '10px', textTransform: 'capitalize', color: 'var(--muted)' }}>
                    {u.role}
                  </span>
                </button>
              ))}

              <div style={{ borderTop: '1px solid var(--border-soft)', marginTop: '6px', paddingTop: '6px' }}>
                <button
                  type="button"
                  onClick={onBackToLanding}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    color: '#b91c1c',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  <LogOut size={13} />
                  <span>Log Out & Exit to Front Page</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '36px 48px', maxWidth: '1300px', width: '100%', overflowX: 'hidden' }}>
        {activeTab === 'dashboard' && (
          <DashboardView
            onNavigate={(tab) => setActiveTab(tab)}
            currentUser={currentUser}
          />
        )}
        {activeTab === 'customers' && <CustomersView />}
        {activeTab === 'products' && <ProductsPlansView />}
        {activeTab === 'quotations' && <QuotationsView />}
        {activeTab === 'subscriptions' && <SubscriptionsView />}
        {activeTab === 'billing' && <BillingView />}
        {activeTab === 'reports' && <FinancialReportsView />}
        {activeTab === 'portal' && (
          <CustomerPortalView
            currentCustomerId={currentUser?.customerId || 'cust-1'}
            userRole={currentUser?.role || 'admin'}
          />
        )}
      </main>
    </div>
  );
};
