const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateReservation,
  buildConfirmationMessage,
  getTodaySpecial,
  sendReservationNotification,
} = require('./server');

test('valid reservation data passes validation', () => {
  const payload = {
    name: 'Aisha',
    date: '2026-11-13',
    guests: '2 guests',
  };

  assert.deepEqual(validateReservation(payload), {
    name: 'Aisha',
    date: '2026-11-13',
    guests: '2 guests',
  });
});

test('past dates are rejected', () => {
  const payload = {
    name: 'Aisha',
    date: '2020-11-13',
    guests: '2 guests',
  };

  assert.throws(() => validateReservation(payload), /past/i);
});

test('confirmation message includes guest count and date', () => {
  const result = buildConfirmationMessage('Aisha', '2026-11-13', '4 guests');
  assert.match(result, /Aisha/i);
  assert.match(result, /4 guests/i);
  assert.match(result, /November/i);
});

test('daily special changes by day and includes a title and note', () => {
  const special = getTodaySpecial(new Date('2026-11-13T12:00:00Z'));
  assert.ok(special.title);
  assert.ok(special.note);
  assert.match(special.title, /special|flavour|fire|market|sun/i);
});

test('reservation notification builder includes contact details and party information', async () => {
  const result = await sendReservationNotification({
    name: 'Maya',
    date: '2026-11-13',
    guests: '4 guests',
    phone: '+1 555 010 2026',
    createdAt: '2026-11-12T19:00:00.000Z',
  });

  assert.equal(result.success, true);
  assert.match(result.subject, /New reservation/i);
  assert.match(result.message, /Maya/i);
  assert.match(result.message, /4 guests/i);
});
