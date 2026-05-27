const test = require('node:test');
const assert = require('node:assert/strict');
const {
  BOOKING_STATUS,
  shouldCompleteAtReachedSequence,
  shouldNoShowAtReachedSequence,
  canReviewBooking,
} = require('../utils/bookingStatus');

test('only boarded in-progress bookings complete when destination stop is reached', () => {
  const booking = {
    status: BOOKING_STATUS.IN_PROGRESS,
    isBoarded: true,
    destinationStop: { sequence: 3 },
  };

  assert.equal(shouldCompleteAtReachedSequence(booking, 3), true);
  assert.equal(shouldCompleteAtReachedSequence({ ...booking, isBoarded: false }, 3), false);
  assert.equal(shouldCompleteAtReachedSequence({ ...booking, status: BOOKING_STATUS.NO_SHOW }, 3), false);
  assert.equal(shouldCompleteAtReachedSequence(booking, 2), false);
});

test('unboarded active bookings become no-show when boarding stop is reached', () => {
  const booking = {
    status: BOOKING_STATUS.IN_PROGRESS,
    isBoarded: false,
    boardingStop: { sequence: 1 },
  };

  assert.equal(shouldNoShowAtReachedSequence(booking, 1), true);
  assert.equal(shouldNoShowAtReachedSequence({ ...booking, status: BOOKING_STATUS.CONFIRMED }, 1), true);
  assert.equal(shouldNoShowAtReachedSequence({ ...booking, isBoarded: true }, 1), false);
  assert.equal(shouldNoShowAtReachedSequence(booking, 0), false);
});

test('reviews require both completed status and actual boarding', () => {
  assert.equal(canReviewBooking({ status: BOOKING_STATUS.COMPLETED, isBoarded: true }), true);
  assert.equal(canReviewBooking({ status: BOOKING_STATUS.COMPLETED, isBoarded: false }), false);
  assert.equal(canReviewBooking({ status: BOOKING_STATUS.NO_SHOW, isBoarded: false }), false);
});
