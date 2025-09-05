const db = require('../models/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

function sign(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password)
      return res.status(400).json({ error: 'Faltan credenciales' });

    const [rows] = await db.promise().query(
      'SELECT id, username, password_hash, role, enabled FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    if (!rows.length || !rows[0].enabled)
      return res.status(401).json({ error: 'Credenciales inválidas' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = sign(user);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ error: 'Error en login' });
  }
};

// Crear usuario (admin)
exports.createUser = async (req, res) => {
  try {
    const { role: requesterRole, tenant_id } = req.user;
    let { username, password, role = 'editor', enabled = 1 } = req.body;

    if (requesterRole !== 'dev' && role === 'dev')
      return res.status(403).json({ error: 'No podés crear usuarios dev' });

    const hash = await bcrypt.hash(password, 10);
    await db.promise().query(
      'INSERT INTO users (username, password_hash, role, enabled, protected, tenant_id) VALUES (?, ?, ?, ?, 0, ?)',
      [username, hash, role, enabled ? 1 : 0, tenant_id ?? null]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Usuario ya existe' });
    console.error('createUser error', e);
    res.status(500).json({ error: 'Error creando usuario' });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const { role, tenant_id } = req.user;      // viene del token
    const params = [];
    let sql =
      'SELECT id, username, role, enabled, created_at ' +
      'FROM users WHERE 1=1 ';

    // si multi-tenant:
    if (tenant_id) { sql += 'AND tenant_id = ? '; params.push(tenant_id); }

    // admin NO ve dev ni protegidos
    if (role !== 'dev') { sql += "AND role <> 'dev' AND protected = 0 "; }

    sql += 'ORDER BY id ASC';

    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error('listUsers error', e);
    res.status(500).json({ error: 'Error listando usuarios' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const requester = req.user; // { role, sub }
    const { password, role, enabled } = req.body || {};

    // Bloquear edición de dev o protected por admin
    const [rows] = await db.promise().query(
      'SELECT id, role, protected FROM users WHERE id=? LIMIT 1', [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No existe' });

    const target = rows[0];
    if (requester.role !== 'dev' && (target.role === 'dev' || target.protected))
      return res.status(403).json({ error: 'No permitido' });

    if (requester.role !== 'dev' && role === 'dev')
      return res.status(403).json({ error: 'No podés asignar rol dev' });

    const fields = [], values = [];
    if (password) { fields.push('password_hash=?'); values.push(await bcrypt.hash(password, 10)); }
    if (role)     { fields.push('role=?');          values.push(role); }
    if (enabled != null) { fields.push('enabled=?'); values.push(enabled ? 1 : 0); }

    if (!fields.length) return res.json({ ok: true });

    values.push(id);
    await db.promise().query(`UPDATE users SET ${fields.join(', ')}, updated_at=NOW() WHERE id=?`, values);
    res.json({ ok: true });
  } catch (e) {
    console.error('updateUser error', e);
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
};


exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const requester = req.user;

    if (+id === +requester.sub) return res.status(400).json({ error: 'No podés eliminarte a vos mismo' });

    const [rows] = await db.promise().query(
      'SELECT id, role, protected FROM users WHERE id=? LIMIT 1', [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No existe' });

    const target = rows[0];
    if (requester.role !== 'dev' && (target.role === 'dev' || target.protected))
      return res.status(403).json({ error: 'No permitido' });

    await db.promise().query('DELETE FROM users WHERE id=?', [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('deleteUser error', e);
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
};

