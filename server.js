const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const RESERVATIONS_FILE = path.join(ROOT, 'reservations.json');
const SPECIALS = [
  {
    title: 'Saffron Chicken Tagine',
    note: 'Slow-braised chicken with apricot, olives, and warm spice, served with couscous.',
  },
  {
    title: 'Fire-Roasted Sea Bass',
    note: 'Citrus, fennel, and herb butter with a bright lemon-sesame finish.',
  },
  {
    title: 'Coconut Jollof Bowl',
    note: 'A smoky, peppery rice dish layered with grilled greens and charred tomato.',
  },
  {
    title: 'Miso Tofu Forest Plate',
    note: 'Silken tofu, shiitake broth, and seasonal vegetables with ginger-lime dressing.',
  },
];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
};

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

  if (!name) {
    throw new Error('Please enter your name.');
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please enter a valid email address.');
  }

  if (!phone || !/^[+()0-9\s-]{7,}$/.test(phone)) {
    throw new Error('Please enter a valid phone number.');
  }

  if (!date) {
    throw new Error('Please choose a reservation date.');
  }

  if (!time) {
    throw new Error('Please choose a reservation time.');
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
    const transport = nodemailer.createTransport({
      host,
      port: Number(process.env.EMAIL_PORT || 587),
      secure: Number(process.env.EMAIL_PORT || 587) === 465,
      auth: {
        user,
        pass,
      },
    });

    await transport.sendMail({
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
    const transport = nodemailer.createTransport({
      host,
      port: Number(process.env.EMAIL_PORT || 587),
      secure: Number(process.env.EMAIL_PORT || 587) === 465,
      auth: {
        user,
        pass,
      },
    });

    await transport.sendMail({
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

function getTodaySpecial(date = new Date()) {
  const index = date.getDay() % SPECIALS.length;
  return SPECIALS[index];
}

function readReservations() {
  try {
    const raw = fs.readFileSync(RESERVATIONS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeReservations(reservations) {
  fs.writeFileSync(RESERVATIONS_FILE, JSON.stringify(reservations, null, 2));
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
}

function serveStaticFile(res, requestPath) {
  const safePath = path.normalize(requestPath).replace(/^\/+/, '');
  const filePath = path.join(ROOT, safePath || 'index.html');

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Server error');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    const cacheControl = ['.html', '.css', '.js', '.mp4'].includes(ext)
      ? 'no-store, no-cache, must-revalidate, max-age=0'
      : 'public, max-age=3600';

    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': cacheControl,
      Pragma: 'no-cache',
      Expires: '0',
    });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (url.pathname === '/api/reservations' && req.method === 'GET') {
    sendJson(res, 200, { success: true, reservations: readReservations() });
    return;
  }

  if (url.pathname === '/api/reserve' && req.method === 'POST') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const reservation = validateReservation(payload);
        const reservationRecord = {
          id: Date.now(),
          ...reservation,
          createdAt: new Date().toISOString(),
        };
        const reservations = readReservations();
        reservations.push(reservationRecord);
        writeReservations(reservations);

        const notification = await sendReservationNotification(reservationRecord);
        const customerReply = await sendCustomerConfirmationEmail(reservationRecord);
        const message = buildConfirmationMessage(
          reservation.name,
          reservation.date,
          reservation.guests
        );

        sendJson(res, 200, {
          success: true,
          message,
          reservation: reservationRecord,
          notification,
          customerReply,
        });
      } catch (error) {
        sendJson(res, 400, { success: false, error: error.message || 'Invalid reservation request.' });
      }
    });

    return;
  }

  const requestPath = url.pathname === '/' ? '/index.html' : url.pathname;
  serveStaticFile(res, requestPath);
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = {
  validateReservation,
  buildConfirmationMessage,
  buildNotificationMessage,
  sendReservationNotification,
  sendCustomerConfirmationEmail,
  getTodaySpecial,
  server,
};
