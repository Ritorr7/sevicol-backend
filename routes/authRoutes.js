// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

const pool = require('../models/db'); // tu pool compartido

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const conn = await pool.promise();
    const [rows] = await conn.query(
      'SELECT id, username, password_hash, role, enabled FROM users WHERE username = ? LIMIT 1',
      [username]
    );
    if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });

    const user = rows[0];
    if (!user.enabled) return res.status(403).json({ error: 'Usuario deshabilitado' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    // payload con rol y user id
    const payload = { sub: user.id, username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    // devolvemos token + user (sin hash)
    return res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error de servidor' });
  }
});

// Útil para refrescar sesión en el cliente
const { requireAuth } = require('../middlewares/auth');
router.get('/me', requireAuth, (req, res) => {
  // req.user viene del token verificado
  res.json({ user: { id: req.user.sub, username: req.user.username, role: req.user.role } });
});

module.exports = router;


