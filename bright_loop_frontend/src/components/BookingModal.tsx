import React, { useState } from 'react';
import { X, Calendar, Clock, CheckCircle } from 'lucide-react';
import { generateAvailableSlots } from '../utils/pricing';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose }) => {
  const [selectedDate, setSelectedDate] = useState('2026-11-03');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isBooked, setIsBooked] = useState(false);
  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  const slots = generateAvailableSlots(selectedDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      setFormError('Please select an available time slot.');
      return;
    }
    if (!fullName.trim() || !email.trim()) {
      setFormError('Please enter your full name and valid email.');
      return;
    }
    setFormError('');
    setIsBooked(true);
  };

  const handleReset = () => {
    setIsBooked(false);
    setSelectedSlot(null);
    setFullName('');
    setEmail('');
    setNotes('');
    setFormError('');
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Book 15-minute intro chat"
    >
      <div className="modal-card" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="modal-close-btn"
          onClick={handleReset}
          aria-label="Close booking modal"
        >
          <X size={18} />
        </button>

        {isBooked ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(23, 201, 100, 0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <CheckCircle size={36} color="#17c964" />
            </div>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: 600,
                letterSpacing: '-0.04em',
                marginBottom: '10px',
              }}
            >
              Call Reserved!
            </h2>
            <p
              style={{
                fontSize: '15px',
                color: 'var(--muted)',
                lineHeight: 1.5,
                maxWidth: '420px',
                margin: '0 auto 24px',
              }}
            >
              A calendar invite for <strong>{selectedSlot}</strong> has been sent to{' '}
              <strong>{email}</strong>. Looking forward to discussing your vision!
            </p>
            <button
              type="button"
              className="btn-primary"
              style={{ height: '48px', padding: '0 28px' }}
              onClick={handleReset}
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <img
                src="https://framerusercontent.com/images/hfneFL6CHBi5BnNvCeOaqU9HqE4.png"
                alt="Creative Director"
                style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.04em' }}>
                  Chat for 15 minutes
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span className="green-dot" />
                  <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    EZbill Leadership · 15 min intro video call
                  </span>
                </div>
              </div>
            </div>

            <div className="booking-grid">
              {/* Left Column: Date & Slot Selection */}
              <div>
                <label className="form-label">
                  <Calendar size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Select Date
                </label>
                <select
                  className="form-input"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(null);
                  }}
                  style={{ marginBottom: '16px', cursor: 'pointer' }}
                >
                  <option value="2026-11-03">Tuesday, Nov 3, 2026</option>
                  <option value="2026-11-04">Wednesday, Nov 4, 2026</option>
                  <option value="2026-11-05">Thursday, Nov 5, 2026</option>
                  <option value="2026-11-06">Friday, Nov 6, 2026</option>
                </select>

                <label className="form-label">
                  <Clock size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Available Slots
                </label>
                <div className="booking-slots">
                  {slots.map((slot) => {
                    const timeOnly = slot.split(' at ')[1];
                    const isSelected = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        className={`slot-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        <span>{timeOnly}</span>
                        <span style={{ fontSize: '12px', opacity: 0.8 }}>15 min</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Contact Details Form */}
              <form onSubmit={handleSubmit} className="booking-form">
                <div>
                  <label className="form-label" htmlFor="booking-name">
                    Full Name *
                  </label>
                  <input
                    id="booking-name"
                    type="text"
                    required
                    className="form-input"
                    placeholder="Alex Morgan"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="booking-email">
                    Work Email *
                  </label>
                  <input
                    id="booking-email"
                    type="email"
                    required
                    className="form-input"
                    placeholder="alex@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="booking-notes">
                    What are you building?
                  </label>
                  <textarea
                    id="booking-notes"
                    rows={3}
                    className="form-input"
                    placeholder="Brand overhaul, mobile product redesign, design system..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {formError && (
                  <div style={{ color: '#e53e3e', fontSize: '13px', fontWeight: 500 }}>
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', height: '48px', fontSize: '14px', marginTop: '8px' }}
                >
                  Confirm 15-Min Intro Call
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
