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

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify(payload),
  };
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { success: false, error: 'Method not allowed.' });
  }

  return jsonResponse(200, { success: true, reservations: await readReservations() });
};
