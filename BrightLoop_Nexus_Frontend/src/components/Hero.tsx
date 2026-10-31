import React from 'react';
import { CurvedLines } from './CurvedLines';
import { Ticker } from './Ticker';

interface HeroProps {
  onOpenPlans: () => void;
  onOpenBooking: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenPlans, onOpenBooking }) => {
  return (
    <section className="hero-section" aria-label="Hero">
      {/* Decorative curved line animations */}
      <CurvedLines />

      {/* Ticker Row */}
      <Ticker />

      {/* Title */}
      <h1 className="hero-title">
        Premium creative <span className="serif italic">alwayzz</span><sup>®</sup> on demand.
      </h1>

      {/* Subtitle */}
      <p className="hero-subtitle">
        A flexible design partnership for founders, brands, and agencies who want top craft delivered on their timeline.
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
            alt="Creative Director Avatar"
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

      {/* Progressive blur at bottom */}
      <div className="progressive-blur" aria-hidden="true" />
    </section>
  );
};
