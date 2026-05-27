const BOOKING_STATUS = Object.freeze({
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no-show',
});

const ACTIVE_BOOKING_STATUSES = [
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.IN_PROGRESS,
];

const REVIEWABLE_BOOKING_STATUS = BOOKING_STATUS.COMPLETED;

const getStopSequence = (stop) => Number(stop?.sequence || 0);

const shouldCompleteAtReachedSequence = (booking, reachedSequence) => {
  return (
    booking?.status === BOOKING_STATUS.IN_PROGRESS &&
    Boolean(booking?.isBoarded) &&
    getStopSequence(booking?.destinationStop) <= Number(reachedSequence || 0)
  );
};

const shouldNoShowAtReachedSequence = (booking, reachedSequence) => {
  return (
    ACTIVE_BOOKING_STATUSES.includes(booking?.status) &&
    !booking?.isBoarded &&
    getStopSequence(booking?.boardingStop) <= Number(reachedSequence || 0)
  );
};

const canReviewBooking = (booking) => {
  return booking?.status === REVIEWABLE_BOOKING_STATUS && Boolean(booking?.isBoarded);
};

module.exports = {
  BOOKING_STATUS,
  ACTIVE_BOOKING_STATUSES,
  REVIEWABLE_BOOKING_STATUS,
  shouldCompleteAtReachedSequence,
  shouldNoShowAtReachedSequence,
  canReviewBooking,
};
