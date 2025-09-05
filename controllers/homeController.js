// controllers/homeController.js
const db = require('../models/db');
const path = require('path');
const fs = require('fs');

exports.getAll = async (_req, res) => {
  try {
    res.set('Cache-Control', 'no-store'); // evita caché en dev
    const [rows] = await db.promise().query(
      `SELECT id, \`key\`, title, subtitle, content, image_url, cta_text, cta_link, \`order\`, enabled
       FROM home_sections
       ORDER BY \`order\` ASC, id ASC`
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error listando secciones' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const { key } = req.params;
    const [rows] = await db.promise().query(
      `SELECT id, \`key\`, title, subtitle, content, image_url, cta_text, cta_link, \`order\`, enabled
       FROM home_sections WHERE \`key\`=? LIMIT 1`,
      [key]
    );
    if (!rows.length) return res.status(404).json({ error: 'No existe esa sección' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error obteniendo sección' });
  }
};

/**
 * UPSERT: si la sección no existe -> INSERT; si existe -> UPDATE
 * Si viene imagen procesada por Sharp (req.sectionImage), se reemplaza la anterior.
 */
exports.update = async (req, res) => {
  try {
    const { key } = req.params;

    // ¿existe?
    const [rows] = await db.promise().query(
      'SELECT * FROM home_sections WHERE `key`=? LIMIT 1',
      [key]
    );
    const exists = rows.length > 0;
    const prev = rows[0] || {};

    // campos
    const title     = req.body.title     ?? prev.title     ?? null;
    const subtitle  = req.body.subtitle  ?? prev.subtitle  ?? null;
    const content   = req.body.content   ?? prev.content   ?? null;
    const cta_text  = req.body.cta_text  ?? prev.cta_text  ?? null;
    const cta_link  = req.body.cta_link  ?? prev.cta_link  ?? null;
    const order     = req.body.order     ?? prev.order     ?? 0;
    const enabled   = (req.body.enabled ?? prev.enabled ?? 1) ? 1 : 0;

    // imagen
    let image_url = prev.image_url || null;
    if (req.sectionImage) {
      // Borro la anterior si era local
      if (prev.image_url && prev.image_url.startsWith('/uploads/home/')) {
        const abs = path.join(process.cwd(), prev.image_url.replace(/^\//, ''));
        fs.promises.unlink(abs).catch(() => {});
      }
      image_url = req.sectionImage.url;
    }

    if (!exists) {
      // INSERT
      await db.promise().query(
        `INSERT INTO home_sections
         (\`key\`, title, subtitle, content, image_url, cta_text, cta_link, \`order\`, enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [key, title, subtitle, content, image_url, cta_text, cta_link, order, enabled]
      );
    } else {
      // UPDATE
      await db.promise().query(
        `UPDATE home_sections
         SET title=?, subtitle=?, content=?, image_url=?, cta_text=?, cta_link=?, \`order\`=?, enabled=?, updated_at=NOW()
         WHERE \`key\`=?`,
        [title, subtitle, content, image_url, cta_text, cta_link, order, enabled, key]
      );
    }

    res.json({ ok: true, key, image_url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error actualizando sección' });
  }
};


