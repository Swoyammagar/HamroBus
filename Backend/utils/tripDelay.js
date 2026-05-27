const NEPAL_TIME_OFFSET_MINUTES = 5 * 60 + 45;
const NEPAL_TIME_OFFSET_MS = NEPAL_TIME_OFFSET_MINUTES * 60 * 1000;

const parseScheduleClock = (timeString) => {
  if (!timeString || typeof timeString !== 'string') return null;

  const match = timeString.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return { hours, minutes };
};

const getNepalDateParts = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  const nepalDate = new Date(date.getTime() + NEPAL_TIME_OFFSET_MS);
  return {
    year: nepalDate.getUTCFullYear(),
    monthIndex: nepalDate.getUTCMonth(),
    day: nepalDate.getUTCDate(),
  };
};

const parseScheduledTimeToUtcDate = (timeString, referenceDate = new Date()) => {
  const clock = parseScheduleClock(timeString);
  const nepalDateParts = getNepalDateParts(referenceDate);
  if (!clock || !nepalDateParts) return null;

  const utcMs = Date.UTC(
    nepalDateParts.year,
    nepalDateParts.monthIndex,
    nepalDateParts.day,
    clock.hours,
    clock.minutes,
    0,
    0
  ) - NEPAL_TIME_OFFSET_MS;

  const scheduledStart = new Date(utcMs);
  return Number.isNaN(scheduledStart.getTime()) ? null : scheduledStart;
};

const calculateStartDelayMinutes = (scheduleDoc, actualStartTime) => {
  if (!scheduleDoc?.startTime || !actualStartTime) return 0;

  const actualStart = new Date(actualStartTime);
  if (Number.isNaN(actualStart.getTime())) return 0;

  const scheduledStart = parseScheduledTimeToUtcDate(scheduleDoc.startTime, actualStart);
  if (!scheduledStart) return 0;

  const diffMs = actualStart.getTime() - scheduledStart.getTime();
  if (diffMs <= 0) return 0;

  return Math.floor(diffMs / (1000 * 60));
};

module.exports = {
  NEPAL_TIME_OFFSET_MINUTES,
  parseScheduledTimeToUtcDate,
  calculateStartDelayMinutes,
};
