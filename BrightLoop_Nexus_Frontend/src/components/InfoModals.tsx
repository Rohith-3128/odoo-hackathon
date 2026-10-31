import React, { useState } from 'react';
import { X, ChevronDown, Send, Check } from 'lucide-react';

interface InfoModalProps {
  type: 'projects' | 'team' | 'faqs' | 'contact' | null;
  onClose: () => void;
}

export const InfoModals: React.FC<InfoModalProps> = ({ type, onClose }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  if (!type) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={type}
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {/* PROJECTS SECTION */}
        {type === 'projects' && (
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: 600, letterSpacing: '-0.05em', marginBottom: '8px' }}>
              Selected Works
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '32px' }}>
              Recent brand identities, digital products, and high-velocity web experiences.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {[
                {
                  title: 'Aura Protocol',
                  category: 'DeFi & Fintech',
                  deliverables: 'Identity, Web App & Design System',
                  year: '2026',
                },
                {
                  title: 'Cortex Copilot',
                  category: 'Enterprise AI Platform',
                  deliverables: 'Interaction Design & 3D Spatial Interface',
                  year: '2026',
                },
                {
                  title: 'Lumina Goods',
                  category: 'Direct-to-Consumer',
                  deliverables: 'E-Commerce Experience & Custom Typography',
                  year: '2025',
                },
                {
                  title: 'Nexus Cloud',
                  category: 'Developer Tools',
                  deliverables: 'Brand System, Documentation & Dashboard UI',
                  year: '2025',
                },
              ].map((proj, idx) => (
                <div
                  key={idx}
                  style={{
                    border: '1px solid var(--border-soft)',
                    borderRadius: '16px',
                    padding: '24px',
                    background: 'rgb(252, 252, 252)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
                      <span>{proj.category}</span>
                      <span>{proj.year}</span>
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: '6px' }}>
                      {proj.title}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.4 }}>
                      {proj.deliverables}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TEAM SECTION */}
        {type === 'team' && (
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: 600, letterSpacing: '-0.05em', marginBottom: '8px' }}>
              The Core Team
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '32px' }}>
              Experienced creative directors, staff brand designers, and senior product engineers.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              {[
                {
                  name: 'Julian Vance',
                  role: 'Founding Creative Director',
                  bio: 'Ex-Pentagram & Apple. Leading brand identity and typographic craftsmanship.',
                },
                {
                  name: 'Elena Rostova',
                  role: 'Head of Product Design',
                  bio: 'Previously Head of UX at Linear. Obsessed with micro-interactions and flow state.',
                },
                {
                  name: 'Marcus Chen',
                  role: 'Creative Technologist',
                  bio: 'WebGL & Three.js specialist bridging the boundary between design and code.',
                },
              ].map((member, idx) => (
                <div
                  key={idx}
                  style={{
                    border: '1px solid var(--border-soft)',
                    borderRadius: '16px',
                    padding: '24px',
                    background: 'rgb(252, 252, 252)',
                  }}
                >
                  <h3 style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: '4px' }}>
                    {member.name}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#0a0a0a', fontWeight: 500, marginBottom: '10px' }}>
                    {member.role}
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.45 }}>
                    {member.bio}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQS SECTION */}
        {type === 'faqs' && (
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: 600, letterSpacing: '-0.05em', marginBottom: '8px' }}>
              Frequently Asked Questions
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '28px' }}>
              Everything you need to know about how Alwayzz operates.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                {
                  q: 'How does the monthly subscription work?',
                  a: 'Subscribe to a plan, and you can add unlimited design requests to your queue. Requests are delivered sequentially, one by one (or two at a time on Dedicated Partner), within 24 to 48 hours.',
                },
                {
                  q: 'How does pausing a subscription work?',
                  a: 'Billing cycles are based on a 31-day period. If you use 14 days and pause, you have 17 days of service remaining that you can resume at any time in the future.',
                },
                {
                  q: 'What if I am unhappy with the design?',
                  a: 'No problem at all. We will iterate and revise until you are 100% satisfied. Revisions are unlimited.',
                },
                {
                  q: 'Why choose Alwayzz over a full-time senior hire?',
                  a: 'A senior design director salary exceeds $180,000 plus benefits, equity, and onboarding overhead. With Alwayzz, you gain immediate senior talent on demand, with the flexibility to pause when design needs slow down.',
                },
              ].map((item, idx) => {
                const isOpen = activeFaq === idx;
                return (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid var(--border-soft)',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      background: isOpen ? 'rgb(250, 250, 250)' : '#ffffff',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveFaq(isOpen ? null : idx)}
                      style={{
                        width: '100%',
                        padding: '18px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '15px',
                        fontWeight: 600,
                        letterSpacing: '-0.02em',
                        color: 'var(--text)',
                      }}
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        size={16}
                        style={{
                          transform: isOpen ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s ease',
                          flexShrink: 0,
                          marginLeft: '12px',
                        }}
                      />
                    </button>
                    {isOpen && (
                      <div
                        style={{
                          padding: '0 20px 20px',
                          fontSize: '14px',
                          color: 'var(--muted)',
                          lineHeight: 1.5,
                        }}
                      >
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CONTACT SECTION */}
        {type === 'contact' && (
          <div style={{ maxWidth: '520px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 600, letterSpacing: '-0.05em', marginBottom: '8px' }}>
              Get in Touch
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '28px' }}>
              Have questions about custom scope, enterprise SLAs, or partnership models? Drop us a note.
            </p>

            {contactSubmitted ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(23, 201, 100, 0.1)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <Check size={28} color="#17c964" />
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '8px' }}>Message Received</h3>
                <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
                  Our managing director will respond within 4 business hours.
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ height: '44px', padding: '0 24px' }}
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (contactName && contactEmail) setContactSubmitted(true);
                }}
                className="booking-form"
              >
                <div>
                  <label className="form-label" htmlFor="contact-name">
                    Your Name *
                  </label>
                  <input
                    id="contact-name"
                    required
                    type="text"
                    className="form-input"
                    placeholder="Jordan Lee"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="contact-email">
                    Email Address *
                  </label>
                  <input
                    id="contact-email"
                    required
                    type="email"
                    className="form-input"
                    placeholder="jordan@company.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="contact-msg">
                    Message
                  </label>
                  <textarea
                    id="contact-msg"
                    rows={4}
                    className="form-input"
                    placeholder="Tell us about your team, timeline, and design challenges..."
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', height: '48px', fontSize: '14px', marginTop: '8px' }}
                >
                  <Send size={15} style={{ marginRight: '8px' }} />
                  Send Message
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
