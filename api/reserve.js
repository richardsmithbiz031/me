function getLocalToday() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

function validateReservation(payload = {}) {
  const name = String(payload.name || '').trim();
  const date = String(payload.date || '').trim();
  const guests = String(payload.guests || '').trim();

  if (!name) {
    throw new Error('Please enter your name.');
  }

  if (!date) {
    throw new Error('Please choose a reservation date.');
  }

  if (!/\d{4}-\d{2}-\d{2}/.test(date)) {
    throw new Error('Please use a valid date format.');
  }

  if (new Date(`${date}T12:00:00`) < new Date(`${getLocalToday()}T12:00:00`)) {
    throw new Error('Please choose a date that is not in the past.');
  }

  if (!guests) {
    throw new Error('Please choose the number of guests.');
  }

  return { name, date, guests };
}

function buildConfirmationMessage(name, date, guests) {
  const formattedDate = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });

  return `Thanks, ${name}. Your table request for ${formattedDate} for ${guests} is ready — our team will be in touch to confirm.`;
}

const reservations = globalThis.__mmReservations || (globalThis.__mmReservations = []);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed.' });
    return;
  }

  try {
    const rawBody = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const reservation = validateReservation(rawBody);
    const record = {
      id: Date.now(),
      ...reservation,
      createdAt: new Date().toISOString(),
    };

    reservations.push(record);

    const message = buildConfirmationMessage(
      reservation.name,
      reservation.date,
      reservation.guests
    );

    res.status(200).json({ success: true, message, reservation: record });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Invalid reservation request.',
    });
  }
};
