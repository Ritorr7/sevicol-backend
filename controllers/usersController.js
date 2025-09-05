// backend/controllers/usersController.js
const db = require('../models/db');
const bcrypt = require('bcryptjs');

exports.listUsers = async (req, res) => {
  try {
    const { role, tenant_id } = req.user;
    const params = [];
    let sql =
      'SELECT id, username, role, enabled, protected, created_at ' +
      'FROM users WHERE 1=1 ';

    if (tenant_id) { sql += 'AND (tenant_id IS NULL OR tenant_id = ?) '; params.push(tenant_id); }

    // admin (y menores) no ven dev ni protegidos
    if (role !== 'dev') sql += "AND role <> 'dev' AND protected = 0 ";

    sql += 'ORDER BY id ASC';
    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error('listUsers', e);
    res.status(500).json({ error: 'Error listando usuarios' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const requester = req.user;
    let { username, password, role = 'editor', enabled = 1, protected: isProtected } = req.body || {};

    if (!username || !password) return res.status(400).json({ error: 'username y password requeridos' });

    // Solo dev puede crear dev o cuentas protegidas
    if (requester.role !== 'dev' && (role === 'dev' || isProtected)) {
      return res.status(403).json({ error: 'No autorizado a crear ese tipo de usuario' });
    }

    const hash = await bcrypt.hash(password, 10);
    await db.promise().query(
      'INSERT INTO users (username, password_hash, role, enabled, protected, tenant_id) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hash, role, enabled ? 1 : 0, isProtected ? 1 : 0, requester.tenant_id ?? null]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Usuario ya existe' });
    console.error('createUser', e);
    res.status(500).json({ error: 'Error creando usuario' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const requester = req.user;
    const { id } = req.params;
    const { password, role, enabled, protected: isProtected } = req.body || {};

    const [rows] = await db.promise().query('SELECT id, role, protected FROM users WHERE id=? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'No existe' });
    const target = rows[0];

    // Admin no puede tocar dev ni protegidos
    if (requester.role !== 'dev' && (target.role === 'dev' || target.protected))
      return res.status(403).json({ error: 'No permitido' });

    // Admin no puede convertir a dev ni marcar protegido
    if (requester.role !== 'dev' && (role === 'dev' || isProtected))
      return res.status(403).json({ error: 'No permitido' });

    const fields = [], values = [];
    if (password) { fields.push('password_hash=?'); values.push(await bcrypt.hash(password, 10)); }
    if (role)     { fields.push('role=?');          values.push(role); }
    if (enabled != null) { fields.push('enabled=?'); values.push(enabled ? 1 : 0); }
    if (isProtected != null && requester.role === 'dev') { fields.push('protected=?'); values.push(isProtected ? 1 : 0); }

    if (!fields.length) return res.json({ ok: true });

    values.push(id);
    await db.promise().query(`UPDATE users SET ${fields.join(', ')}, updated_at=NOW() WHERE id=?`, values);
    res.json({ ok: true });
  } catch (e) {
    console.error('updateUser', e);
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const requester = req.user;
    const { id } = req.params;

    if (+id === +requester.sub) return res.status(400).json({ error: 'No podés eliminarte a vos mismo' });

    const [rows] = await db.promise().query('SELECT id, role, protected FROM users WHERE id=? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'No existe' });

    const target = rows[0];
    if (requester.role !== 'dev' && (target.role === 'dev' || target.protected))
      return res.status(403).json({ error: 'No permitido' });

    await db.promise().query('DELETE FROM users WHERE id=?', [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('deleteUser', e);
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
};
