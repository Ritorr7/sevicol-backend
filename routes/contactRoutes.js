// backend/routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const { sendContactEmail } = require('../services/contactService');

// POST /api/contacto
router.post('/', async (req, res) => {
  try {
    const result = await sendContactEmail(req.body);
    if (!result.ok) {
      return res.status(400).json({ message: result.message || 'No se pudo enviar el mensaje.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Error /api/contacto:', err);
    res.status(500).json({ message: 'No se pudo enviar el mensaje.' });
  }
});

module.exports = router;
