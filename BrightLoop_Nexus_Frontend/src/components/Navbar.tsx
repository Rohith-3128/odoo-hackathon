import React from 'react';
import { ChevronUp, X } from 'lucide-react';

interface NavbarProps {
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  onToggleWorkspace: () => void;
  onLogoClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isDrawerOpen,
  onToggleDrawer,
  onToggleWorkspace,
  onLogoClick,
}) => {
  return (
    <header className="navbar-fixed">
      <nav className="navbar-container" aria-label="Main Navigation">
        <button
          type="button"
          className="navbar-logo"
          onClick={onLogoClick}
          aria-label="Alwayzz Home"
        >
          Alwayzz<sup className="logo-trademark">®</sup>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="menu-button"
            style={{
              background: '#ffffff',
              color: '#0a0a0a',
              border: '1px solid var(--border-soft)',
            }}
            onClick={onToggleWorkspace}
          >
            <span>Nexus OS</span>
          </button>

          <button
            type="button"
            className="menu-button"
            onClick={onToggleDrawer}
            aria-expanded={isDrawerOpen}
            aria-label={isDrawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            <span>{isDrawerOpen ? 'Close' : 'Menu'}</span>
            {isDrawerOpen ? (
              <X size={16} />
            ) : (
              <ChevronUp size={16} className="menu-chevron" />
            )}
          </button>
        </div>
      </nav>
    </header>
  );
};
