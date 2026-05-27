const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseScheduledTimeToUtcDate,
  calculateStartDelayMinutes,
} = require('../utils/tripDelay');

test('calculates positive delay from Nepal-local schedule time and UTC actual start', () => {
  const actualStartTime = new Date('2026-05-27T07:15:00.000Z'); // 13:00 NPT

  assert.equal(
    calculateStartDelayMinutes({ startTime: '12:00' }, actualStartTime),
    60
  );
});

test('returns zero when a trip starts on time or early', () => {
  assert.equal(
    calculateStartDelayMinutes({ startTime: '12:00' }, new Date('2026-05-27T06:15:00.000Z')),
    0
  );
  assert.equal(
    calculateStartDelayMinutes({ startTime: '12:00' }, new Date('2026-05-27T06:10:00.000Z')),
    0
  );
});

test('converts an HH:MM schedule on the Nepal calendar day of the actual start', () => {
  const scheduledStart = parseScheduledTimeToUtcDate(
    '12:00',
    new Date('2026-05-27T07:15:00.000Z')
  );

  assert.equal(scheduledStart.toISOString(), '2026-05-27T06:15:00.000Z');
});

test('invalid or missing schedule data does not create a false delay', () => {
  assert.equal(calculateStartDelayMinutes(null, new Date('2026-05-27T07:15:00.000Z')), 0);
  assert.equal(calculateStartDelayMinutes({ startTime: '25:99' }, new Date('2026-05-27T07:15:00.000Z')), 0);
  assert.equal(calculateStartDelayMinutes({ startTime: '12:00' }, 'not-a-date'), 0);
});
