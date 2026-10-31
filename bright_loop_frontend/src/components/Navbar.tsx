import React from 'react';
import { LogIn } from 'lucide-react';

interface NavbarProps {
  onOpenLogin: () => void;
  onLogoClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenLogin,
  onLogoClick,
}) => {
  return (
    <header className="navbar-fixed">
      <nav className="navbar-container" aria-label="Main Navigation">
        <button
          type="button"
          className="navbar-logo"
          onClick={onLogoClick}
          aria-label="EZbill Home"
        >
          EZbill<sup className="logo-trademark">®</sup>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="navbar-login-btn"
            onClick={onOpenLogin}
            aria-label="Log in to EZbill Workspace"
          >
            <LogIn size={15} />
            <span>Log in</span>
          </button>
        </div>
      </nav>
    </header>
  );
};
