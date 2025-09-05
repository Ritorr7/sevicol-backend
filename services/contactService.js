// backend/services/contactService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE || 'true') === 'true', // true:465, false:587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function buildHtml(payload) {
  const {
    nombre = '',
    email = '',
    telefono = '',
    empresa = '',
    direccion = '',
    ciudad = '',
    mensaje = '',
  } = payload || {};

  return `
    <h2>Nuevo contacto desde la web</h2>
    <p><strong>Nombre:</strong> ${nombre}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Teléfono:</strong> ${telefono}</p>
    <p><strong>Empresa:</strong> ${empresa}</p>
    <p><strong>Dirección:</strong> ${direccion}</p>
    <p><strong>Ciudad:</strong> ${ciudad}</p>
    <p><strong>Mensaje:</strong></p>
    <p>${String(mensaje || '').replace(/\n/g, '<br/>')}</p>
  `;
}

async function sendContactEmail(payload) {
  try {
    if (!payload?.nombre || !payload?.email || !payload?.mensaje) {
      return { ok: false, message: 'Faltan campos obligatorios (nombre, email, mensaje).' };
    }

    const html = buildHtml(payload);

    await transporter.sendMail({
      from: `"Sevicol Web" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: process.env.CONTACT_TO, // destino(s)
      subject: 'Nuevo contacto desde la web',
      replyTo: payload.email,
      html,
    });

    return { ok: true };
  } catch (err) {
    console.error('sendContactEmail error:', err);
    return { ok: false, message: 'Error enviando email.' };
  }
}

module.exports = { sendContactEmail };
