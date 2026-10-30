const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const {
  validateReservation,
  buildConfirmationMessage,
  getTodaySpecial,
  sendReservationNotification,
  sendCustomerConfirmationEmail,
  server,
} = require('./server');

test('valid reservation data passes validation', () => {
  const payload = {
    name: 'Aisha',
    email: 'aisha@example.com',
    phone: '+1 555 010 2026',
    date: '2026-11-13',
    time: '7:00 PM',
    guests: '2 guests',
  };

  assert.deepEqual(validateReservation(payload), {
    name: 'Aisha',
    email: 'aisha@example.com',
    phone: '+1 555 010 2026',
    date: '2026-11-13',
    time: '7:00 PM',
    guests: '2 guests',
  });
});

test('past dates are rejected', () => {
  const payload = {
    name: 'Aisha',
    email: 'aisha@example.com',
    phone: '+1 555 010 2026',
    date: '2020-11-13',
    time: '7:00 PM',
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
    email: 'maya@example.com',
    date: '2026-11-13',
    guests: '4 guests',
    phone: '+1 555 010 2026',
    createdAt: '2026-11-12T19:00:00.000Z',
  });

  assert.equal(result.success, true);
  assert.match(result.subject, /New reservation/i);
  assert.match(result.message, /Maya/i);
  assert.match(result.message, /4 guests/i);
  assert.match(result.message, /\+1 555 010 2026/i);
});

test('customer confirmation email is sent to the guest', async () => {
  const result = await sendCustomerConfirmationEmail({
    name: 'Maya',
    email: 'maya@example.com',
    date: '2026-11-13',
    guests: '4 guests',
  });

  assert.equal(result.success, true);
  assert.equal(result.to, 'maya@example.com');
  assert.match(result.subject, /Thanks for your reservation/i);
  assert.match(result.message, /Maya/i);
});

test('reservation API returns the customer confirmation result in the response', async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const response = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: '127.0.0.1',
          port,
          path: '/api/reserve',
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            try {
              resolve({ statusCode: res.statusCode, payload: JSON.parse(body) });
            } catch (error) {
              reject(error);
            }
          });
        }
      );

      req.on('error', reject);
      req.write(
        JSON.stringify({
          name: 'Aisha',
          email: 'aisha@example.com',
          phone: '+1 555 010 2026',
          date: '2026-11-13',
          time: '7:00 PM',
          guests: '2 guests',
        })
      );
      req.end();
    });

    assert.equal(response.statusCode, 200);
    assert.ok(response.payload.customerReply);
    assert.equal(response.payload.customerReply.to, 'aisha@example.com');
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
