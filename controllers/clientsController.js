const db = require('../models/db');
const path = require('path');
const fs = require('fs');

const T_COMPANIES = 'companies';
const T_BRANCHES  = 'branches';

// ---------- Empresas ----------
exports.createCompany = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Falta nombre' });

    // Multer deja los campos en req.body (aunque sea multipart/form-data)
    // stripe_color puede venir como "#RRGGBB" o vacío (=> null)
    let stripeColor = undefined;
    if (req.body.stripe_color !== undefined) {
      stripeColor = req.body.stripe_color?.trim() || null;
    }

    const logo_url = req.logoInfo?.url || null;

    const [r] = await db.promise().query(
      `INSERT INTO \`${T_COMPANIES}\` (name, logo_url, stripe_color) VALUES (?,?,?)`,
      [name, logo_url, stripeColor ?? null]
    );

    res.json({ ok: true, id: r.insertId, name, logo_url, stripe_color: stripeColor ?? null });
  } catch (e) {
    console.error('createCompany', e);
    res.status(500).json({ error: 'Error creando empresa' });
  }
};

exports.listCompanies = async (_req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT id, name, logo_url, stripe_color FROM \`${T_COMPANIES}\` ORDER BY name ASC`
    );
    res.json(rows);
  } catch (e) {
    console.error('listCompanies', e);
    res.status(500).json({ error: 'Error listando empresas' });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const name = req.body.name?.trim();
    const newLogo = req.logoInfo?.url || null;

    // Si viene stripe_color:
    //  - undefined  => no tocar
    //  - ''         => setear NULL
    //  - '#xxxxxx'  => guardar valor
    let stripeColorProvided = false;
    let stripeColorValue = null;
    if (req.body.stripe_color !== undefined) {
      stripeColorProvided = true;
      stripeColorValue = req.body.stripe_color?.trim() || null;
    }

    const fields = [];
    const values = [];

    if (name)          { fields.push('name=?');        values.push(name); }
    if (newLogo)       { fields.push('logo_url=?');    values.push(newLogo); }
    if (stripeColorProvided) {
      fields.push('stripe_color=?');
      values.push(stripeColorValue);
    }

    if (!fields.length) return res.json({ ok: true });

    values.push(id);
    await db.promise().query(
      `UPDATE \`${T_COMPANIES}\` SET ${fields.join(', ')} WHERE id=?`,
      values
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('updateCompany', e);
    res.status(500).json({ error: 'Error actualizando empresa' });
  }
};

exports.deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    // borrar logo del disco (si existe)
    const [[row]] = await db.promise().query(
      `SELECT logo_url FROM \`${T_COMPANIES}\` WHERE id=? LIMIT 1`,
      [id]
    );
    if (row?.logo_url) {
      const abs = path.join(__dirname, '..', row.logo_url.replace(/^\//, ''));
      if (fs.existsSync(abs)) fs.unlink(abs, () => {});
    }

    await db.promise().query(`DELETE FROM \`${T_COMPANIES}\` WHERE id=?`, [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('deleteCompany', e);
    res.status(500).json({ error: 'Error eliminando empresa' });
  }
};

// ---------- Sucursales ----------
exports.createBranch = async (req, res) => {
  try {
    const { company_id, name, city, address } = req.body;
    if (!company_id || !name) return res.status(400).json({ error: 'Faltan campos' });

    const [r] = await db.promise().query(
      `INSERT INTO \`${T_BRANCHES}\` (company_id, name, city, address) VALUES (?,?,?,?)`,
      [company_id, name, city || null, address || null]
    );
    res.json({ ok: true, id: r.insertId });
  } catch (e) {
    console.error('createBranch', e);
    res.status(500).json({ error: 'Error creando sucursal' });
  }
};

// ---------- Sucursales: listado ----------
exports.listBranches = async (req, res) => {
  try {
    const { company_id } = req.query;

    const baseSql = `
      SELECT b.id, b.company_id, b.name, b.city, b.address, b.created_at,
             c.name AS company_name
        FROM branches b
        JOIN companies c ON c.id = b.company_id
    `;
    const where  = company_id ? ' WHERE b.company_id = ? ' : '';
    const order  = ' ORDER BY c.name ASC, b.name ASC ';

    const [rows] = await db.promise().query(baseSql + where + order, company_id ? [company_id] : []);
    res.json(rows);
  } catch (e) {
    console.error('listBranches', e);
    res.status(500).json({ error: 'Error listando sucursales' });
  }
};


exports.updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, city, address, company_id } = req.body || {};

    const fields = [];
    const values = [];
    if (name != null)       { fields.push('name=?');       values.push(name); }
    if (city != null)       { fields.push('city=?');       values.push(city); }
    if (address != null)    { fields.push('address=?');    values.push(address); }
    if (company_id != null) { fields.push('company_id=?'); values.push(company_id); }

    if (!fields.length) return res.json({ ok: true });

    values.push(id);
    await db.promise().query(
      `UPDATE \`${T_BRANCHES}\` SET ${fields.join(', ')} WHERE id=?`,
      values
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('updateBranch', e);
    res.status(500).json({ error: 'Error actualizando sucursal' });
  }
};

exports.deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;
    await db.promise().query(`DELETE FROM \`${T_BRANCHES}\` WHERE id=?`, [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('deleteBranch', e);
    res.status(500).json({ error: 'Error eliminando sucursal' });
  }
};

// ---------- Página pública ----------
exports.listGrouped = async (_req, res) => {
  try {
    const [companies] = await db.promise().query(
      `SELECT id, name, logo_url, stripe_color FROM \`${T_COMPANIES}\` ORDER BY name ASC`
    );
    const ids = companies.map(c => c.id);

    let branches = [];
    if (ids.length) {
      const [rows] = await db.promise().query(
        `SELECT id, company_id, name, city, address
           FROM \`${T_BRANCHES}\`
          WHERE company_id IN (?)
          ORDER BY name ASC`,
        [ids]
      );
      branches = rows;
    }

    const result = companies.map(c => ({
      ...c,
      branches: branches.filter(b => b.company_id === c.id),
    }));
    res.json(result);
  } catch (e) {
    console.error('listGrouped', e);
    res.status(500).json({ error: 'Error listando clientes' });
  }
};



