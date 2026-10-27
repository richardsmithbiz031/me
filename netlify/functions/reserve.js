let storeInstance = null;
const fallbackReservations = globalThis.__mmReservations || (globalThis.__mmReservations = []);

function getReservationStore() {
  if (storeInstance) {
    return storeInstance;
  }

  try {
    const { getStore } = require('@netlify/blobs');
    storeInstance = getStore({ name: 'megatron-mouth-reservations' });
    return storeInstance;
  } catch (error) {
    return null;
  }
}

async function readReservations() {
  const store = getReservationStore();

  if (!store) {
    return fallbackReservations.slice();
  }

  try {
    const reservations = await store.getJSON('reservations');
    return Array.isArray(reservations) ? reservations : [];
  } catch (error) {
    return fallbackReservations.slice();
  }
}

async function writeReservations(reservations) {
  const store = getReservationStore();

  if (!store) {
    fallbackReservations.length = 0;
    fallbackReservations.push(...reservations);
    return;
  }

  try {
    await store.setJSON('reservations', reservations);
  } catch (error) {
    fallbackReservations.length = 0;
    fallbackReservations.push(...reservations);
  }
}

function getLocalToday() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

function validateReservation(payload = {}) {
  const name = String(payload.name || '').trim();
  const date = String(payload.date || '').trim();
  const guests = String(payload.guests || '').trim();

  if (!name) throw new Error('Please enter your name.');
  if (!date) throw new Error('Please choose a reservation date.');
  if (!/\d{4}-\d{2}-\d{2}/.test(date)) throw new Error('Please use a valid date format.');
  if (new Date(`${date}T12:00:00`) < new Date(`${getLocalToday()}T12:00:00`)) {
    throw new Error('Please choose a date that is not in the past.');
  }
  if (!guests) throw new Error('Please choose the number of guests.');

  return { name, date, guests };
}

function buildConfirmationMessage(name, date, guests) {
  const formattedDate = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });

  return `Thanks, ${name}. Your table request for ${formattedDate} for ${guests} is ready — our team will be in touch to confirm.`;
}

function jsonResponse(statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...extraHeaders,
    },
    body: payload === undefined || payload === null ? '' : JSON.stringify(payload),
  };
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod === 'GET') {
    return jsonResponse(200, { success: true, reservations: await readReservations() });
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { success: false, error: 'Method not allowed.' });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const reservation = validateReservation(payload);
    const record = {
      id: Date.now(),
      ...reservation,
      createdAt: new Date().toISOString(),
    };

    const reservations = await readReservations();
    reservations.push(record);
    await writeReservations(reservations);

    return jsonResponse(200, {
      success: true,
      message: buildConfirmationMessage(reservation.name, reservation.date, reservation.guests),
      reservation: record,
    });
  } catch (error) {
    return jsonResponse(400, {
      success: false,
      error: error.message || 'Invalid reservation request.',
    });
  }
};
