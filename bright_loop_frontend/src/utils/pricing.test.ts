import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENCY_PLANS,
  calculateDiscount,
  formatCurrency,
  validateBookingSlot,
  generateAvailableSlots,
} from './pricing';

test('plans list contains defined plans with slots and features', () => {
  assert.equal(AGENCY_PLANS.length, 3);
  const sprint = AGENCY_PLANS.find((p) => p.id === 'sprint');
  assert.ok(sprint);
  assert.equal(sprint?.monthlyPrice, 4995);
  assert.ok(sprint && sprint.features.length >= 5);
});

test('calculateDiscount correctly computes percentage savings', () => {
  const discount = calculateDiscount(4995, 13485);
  assert.equal(discount, 10);
});

test('formatCurrency formats whole dollars properly', () => {
  assert.equal(formatCurrency(4995), '$4,995');
  assert.equal(formatCurrency(8495), '$8,495');
});

test('validateBookingSlot prevents double-booking', () => {
  const booked = ['2026-11-02 at 11:00 AM'];
  assert.equal(validateBookingSlot('2026-11-02 at 11:00 AM', booked), false);
  assert.equal(validateBookingSlot('2026-11-02 at 01:30 PM', booked), true);
  assert.equal(validateBookingSlot('', booked), false);
});

test('generateAvailableSlots produces formatted slot array', () => {
  const slots = generateAvailableSlots('2026-11-02');
  assert.equal(slots.length, 5);
  assert.equal(slots[0], '2026-11-02 at 09:30 AM');
});
