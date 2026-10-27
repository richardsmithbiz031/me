const test = require('node:test');
const assert = require('node:assert/strict');
const { validateReservation, buildConfirmationMessage, getTodaySpecial } = require('./server');

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
