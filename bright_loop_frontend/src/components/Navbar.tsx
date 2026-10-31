import React, { useState, useEffect } from 'react';
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
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Always visible when near the top of the page
      if (currentScrollY <= 30) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down -> top bar disappears
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY - 10) {
        // Scrolling up -> smoothly reappears
        setIsVisible(true);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignIn = onOpenSignIn || onOpenLogin;

  return (
    <header
      className="navbar-fixed"
      style={{
        transform: isVisible ? 'translateY(0)' : 'translateY(-120%)',
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease',
      }}
    >
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
