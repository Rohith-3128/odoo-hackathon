import React from 'react';
import { CurvedLines } from './CurvedLines';
import { Ticker } from './Ticker';

interface HeroProps {
  onOpenPlans: () => void;
  onOpenBooking: () => void;
  onOpenLogin: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenPlans, onOpenBooking, onOpenLogin }) => {
  return (
    <section className="hero-section" aria-label="Hero">
      {/* Decorative curved line animations */}
      <CurvedLines />

      {/* Ticker Row */}
      <Ticker />

      {/* Title */}
      <h1 className="hero-title">
        Intelligent billing &amp; subscriptions with <span className="serif italic">EZbill</span><sup>®</sup> on demand.
      </h1>

      {/* Subtitle */}
      <p className="hero-subtitle">
        A unified recurring billing, invoice ledger, GST tax engine, and subscription management operating system for modern business teams.
      </p>

      {/* CTA Row */}
      <div className="cta-row">
        {/* Primary button: View Plans */}
        <button
          type="button"
          className="btn-primary"
          onClick={onOpenPlans}
        >
          View Plans
        </button>

        {/* Book button: Chat for 15 minutes */}
        <button
          type="button"
          className="btn-book"
          onClick={onOpenBooking}
          aria-label="Chat for 15 minutes - Pick a slot"
        >
          <img
            src="https://framerusercontent.com/images/hfneFL6CHBi5BnNvCeOaqU9HqE4.png"
            alt="Billing Advisor Avatar"
            className="btn-book-avatar"
            width={40}
            height={40}
          />
          <div className="btn-book-text">
            <span className="btn-book-primary">Chat for 15 minutes</span>
            <span className="btn-book-secondary">
              <span className="green-dot" aria-hidden="true" />
              <span>Pick a slot</span>
            </span>
          </div>
        </button>
      </div>

      {/* Quick link to login */}
      <div style={{ marginTop: '20px', position: 'relative', zIndex: 3 }}>
        <button
          type="button"
          onClick={onOpenLogin}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            fontSize: '13px',
            cursor: 'pointer',
            padding: '6px 12px',
            fontFamily: 'var(--font-sans)',
            letterSpacing: '-0.01em',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#0a0a0a')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
        >
          Already a customer or team member? Log in to EZbill Workspace →
        </button>
      </div>

      {/* Progressive blur at bottom */}
      <div className="progressive-blur" aria-hidden="true" />
    </section>
  );
};
