import React from 'react';
import { LogIn, User } from 'lucide-react';

interface NavbarProps {
  onOpenLogin: () => void;
  onOpenSignIn?: () => void;
  onLogoClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenLogin,
  onOpenSignIn,
  onLogoClick,
}) => {
  const handleSignIn = onOpenSignIn || onOpenLogin;

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="navbar-signin-btn"
            onClick={handleSignIn}
            aria-label="Sign in to EZbill"
          >
            <User size={15} />
            <span>Sign in</span>
          </button>

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
