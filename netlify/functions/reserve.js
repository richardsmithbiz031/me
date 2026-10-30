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
  const email = String(payload.email || '').trim();
  const phone = String(payload.phone || '').trim();
  const date = String(payload.date || '').trim();
  const time = String(payload.time || '').trim();
  const guests = String(payload.guests || '').trim();

  if (!name) throw new Error('Please enter your name.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please enter a valid email address.');
  }
  if (!phone || !/^[+()0-9\s-]{7,}$/.test(phone)) {
    throw new Error('Please enter a valid phone number.');
  }
  if (!date) throw new Error('Please choose a reservation date.');
  if (!time) throw new Error('Please choose a reservation time.');
  if (!/\d{4}-\d{2}-\d{2}/.test(date)) throw new Error('Please use a valid date format.');
  if (new Date(`${date}T12:00:00`) < new Date(`${getLocalToday()}T12:00:00`)) {
    throw new Error('Please choose a date that is not in the past.');
  }
  if (!guests) throw new Error('Please choose the number of guests.');

  return { name, email, phone, date, time, guests };
}

function buildConfirmationMessage(name, date, guests) {
  const formattedDate = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });

  return `Thanks, ${name}. Your table request for ${formattedDate} for ${guests} is ready — our team will be in touch to confirm.`;
}

function buildNotificationMessage(reservation = {}) {
  const name = String(reservation.name || 'Unknown guest').trim();
  const email = String(reservation.email || 'Not provided').trim();
  const date = String(reservation.date || '').trim();
  const time = String(reservation.time || 'Not provided').trim();
  const guests = String(reservation.guests || 'Unknown party size').trim();
  const phone = String(reservation.phone || 'Not provided').trim();
  const createdAt = reservation.createdAt
    ? new Date(reservation.createdAt).toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Not provided';

  const formattedDate = date
    ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown date';

  return {
    subject: `New reservation request for ${name}`,
    message: [
      'New reservation request received.',
      '',
      `Name: ${name}`,
      `Email: ${email}`,
      `Date: ${formattedDate}`,
      `Time: ${time}`,
      `Guests: ${guests}`,
      `Phone: ${phone}`,
      `Received: ${createdAt}`,
      '',
      'Please reply to confirm the table.',
    ].join('\n'),
  };
}

function buildCustomerConfirmationMessage(reservation = {}) {
  const name = String(reservation.name || 'Guest').trim();
  const date = String(reservation.date || '').trim();
  const time = String(reservation.time || '').trim();
  const guests = String(reservation.guests || 'your party').trim();
  const formattedDate = date
    ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
      })
    : 'your selected date';

  return {
    subject: 'Thanks for your reservation at MEGATRON & MOUTH',
    message: [
      `Hi ${name},`,
      '',
      'Thank you for choosing MEGATRON & MOUTH. We have received your reservation request.',
      '',
      `Date: ${formattedDate}`,
      `Time: ${time || 'your selected time'}`,
      `Guests: ${guests}`,
      '',
      'Our team will be in touch shortly to confirm the table. If you need to change or cancel, just reply to this email.',
      '',
      'We look forward to welcoming you soon.',
      '',
      'MEGATRON & MOUTH',
    ].join('\n'),
  };
}

async function sendReservationNotification(reservation = {}) {
  const { subject, message } = buildNotificationMessage(reservation);
  const to = process.env.EMAIL_TO || 'hello@megatronandmouth.com';
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'reservations@localhost';
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    console.log('[Reservation notification]');
    console.log(message);
    return { success: true, sent: false, mode: 'log', subject, message, to };
  }

  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.EMAIL_PORT || 587),
      secure: Number(process.env.EMAIL_PORT || 587) === 465,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      text: message,
      html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
    });

    return { success: true, sent: true, mode: 'email', subject, to, message };
  } catch (error) {
    console.error('Reservation notification failed:', error);
    return {
      success: false,
      sent: false,
      mode: 'email-failed',
      subject,
      to,
      message,
      error: error.message,
    };
  }
}

async function sendCustomerConfirmationEmail(reservation = {}) {
  const email = String(reservation.email || '').trim();
  const { subject, message } = buildCustomerConfirmationMessage(reservation);
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'reservations@localhost';

  if (!email) {
    return { success: false, sent: false, mode: 'missing-email', to: email, subject, message };
  }

  if (!host || !user || !pass) {
    console.log('[Customer confirmation email]');
    console.log(`To: ${email}`);
    console.log(message);
    return { success: true, sent: false, mode: 'log', to: email, subject, message };
  }

  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.EMAIL_PORT || 587),
      secure: Number(process.env.EMAIL_PORT || 587) === 465,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from,
      to: email,
      subject,
      text: message,
      html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
    });

    return { success: true, sent: true, mode: 'email', to: email, subject, message };
  } catch (error) {
    console.error('Customer confirmation email failed:', error);
    return {
      success: false,
      sent: false,
      mode: 'email-failed',
      to: email,
      subject,
      message,
      error: error.message,
    };
  }
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

    const notification = await sendReservationNotification(record);
    const customerReply = await sendCustomerConfirmationEmail(record);

    return jsonResponse(200, {
      success: true,
      message: buildConfirmationMessage(reservation.name, reservation.date, reservation.guests),
      reservation: record,
      notification,
      customerReply,
    });
  } catch (error) {
    return jsonResponse(400, {
      success: false,
      error: error.message || 'Invalid reservation request.',
    });
  }
};
