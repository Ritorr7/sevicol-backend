const db = require('../models/db');
const path = require('path');
const fs = require('fs');
const slugifyLib = require('../helpers/slugify'); // usado solo para fallback si quisieras

// util pequeño (acentos fuera, slug amigable)
function slugify(str = '') {
  return String(str)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function buildResumen(htmlOrText, max = 220) {
  if (!htmlOrText) return '';
  const text = String(htmlOrText)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

async function slugUnico(base) {
  const limpio = slugify(base) || 'nota';
  let slug = limpio;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [rows] = await db.promise().query('SELECT id FROM noticias WHERE slug = ? LIMIT 1', [slug]);
    if (rows.length === 0) return slug;
    n += 1;
    slug = `${limpio}-${n}`;
  }
}

// GET /api/news?published=&limit=&page=
exports.list = async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page  || 1, 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || 10, 10), 1), 100);
    const offset = (page - 1) * limit;
    const published = req.query.published;

    const where = [];
    const args  = [];

    if (published === 'true')  where.push('published = 1');
    if (published === 'false') where.push('published = 0');

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await db.promise().query(
      `
      SELECT
        id,
        titulo       AS title,
        slug,
        resumen,
        contenido    AS content,
        cover_url    AS coverUrl,
        autor,
        published,
        published_at AS publishedAt,
        created_at   AS createdAt,
        updated_at   AS updatedAt
      FROM noticias
      ${whereSQL}
      ORDER BY (published_at IS NULL) ASC, published_at DESC, created_at DESC
      LIMIT ? OFFSET ?
      `,
      [...args, limit, offset]
    );

    const [[countRow]] = await db.promise().query(
      `SELECT COUNT(*) AS total FROM noticias ${whereSQL}`,
      args
    );

    res.json({
      items: rows,
      page,
      limit,
      total: countRow.total,
      pages: Math.ceil(countRow.total / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listando noticias' });
  }
};

// GET /api/news/latest
exports.latest = async (_req, res) => {
  try {
    const [rows] = await db.promise().query(
      `
      SELECT
        id,
        titulo       AS title,
        slug,
        resumen,
        cover_url    AS coverUrl,
        autor,
        published_at AS publishedAt
      FROM noticias
      WHERE published = 1
      ORDER BY published_at DESC, created_at DESC
      LIMIT 3
      `
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo últimas noticias' });
  }
};

// GET /api/news/slug/:slug
exports.getBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const [rows] = await db.promise().query(
      `
      SELECT
        id,
        titulo       AS title,
        slug,
        resumen,
        contenido    AS content,
        cover_url    AS coverUrl,
        autor,
        published,
        published_at AS publishedAt,
        created_at   AS createdAt,
        updated_at   AS updatedAt
      FROM noticias
      WHERE slug = ?
      LIMIT 1
      `,
      [slug]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Noticia no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo noticia' });
  }
};

// POST /api/news
exports.create = async (req, res) => {
  try {
    // aceptar ambos nombres desde el front
    const {
      titulo,
      title,
      contenido,
      content,
      resumen,
      autor = '',
      published = 0,
      published_at,
      slug,
      coverUrl, // llega cuando subiste la imagen aparte
    } = req.body;

    const finalTitulo = (title || titulo || '').trim();
    if (!finalTitulo) return res.status(400).json({ error: 'Falta el título' });

    const finalSlug = slug ? await slugUnico(slug) : await slugUnico(finalTitulo);
    const cuerpo = content != null ? content : (contenido || '');
    const finalResumen = resumen && resumen.trim() ? resumen.trim() : buildResumen(cuerpo);

    // priorizar file si viene, si no, usar coverUrl del body
    let cover = null;
    if (req.file && req.file.filename) {
      cover = `/uploads/news/${req.file.filename}`;
    } else if (coverUrl) {
      cover = coverUrl;
    }

    const isPublished = Number(published) ? 1 : 0;
    const pubAt = isPublished ? (published_at || new Date()) : null;

    const [result] = await db.promise().query(
      `INSERT INTO noticias (titulo, slug, resumen, contenido, cover_url, autor, published, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [finalTitulo, finalSlug, finalResumen, cuerpo, cover, autor, isPublished, pubAt]
    );

    res.status(201).json({ id: result.insertId, slug: finalSlug });
  } catch (err) {
    console.error('create news error:', err);
    res.status(500).json({ error: 'Error creando noticia' });
  }
};

// PUT /api/news/:id
exports.update = async (req, res) => {
  try {
    const { id } = req.params;

    const [exist] = await db.promise().query('SELECT * FROM noticias WHERE id = ? LIMIT 1', [id]);
    if (exist.length === 0) return res.status(404).json({ error: 'Noticia no encontrada' });
    const prev = exist[0];

    const {
      titulo, title,
      contenido, content,
      resumen,
      autor = prev.autor,
      published = prev.published,
      published_at = prev.published_at,
      slug,
      coverUrl,
    } = req.body;

    const finalTitulo = (title || titulo || prev.titulo).trim();
    let finalSlug = prev.slug;
    if (slug && slug !== prev.slug) finalSlug = await slugUnico(slug);
    else if (!slug && finalTitulo !== prev.titulo) finalSlug = await slugUnico(finalTitulo);

    const cuerpo = (content != null ? content : contenido) ?? prev.contenido ?? '';
    const finalResumen = resumen && resumen.trim() ? resumen.trim() : buildResumen(cuerpo);

    let cover = prev.cover_url;
    if (req.file && req.file.filename) {
      if (prev.cover_url && prev.cover_url.startsWith('/uploads/news/')) {
        const abs = path.join(process.cwd(), prev.cover_url.replace(/^\//, ''));
        fs.promises.unlink(abs).catch(() => {});
      }
      cover = `/uploads/news/${req.file.filename}`;
    } else if (coverUrl) {
      cover = coverUrl;
    }

    const isPublished = Number(published) ? 1 : 0;
    const pubAt = isPublished ? (published_at || prev.published_at || new Date()) : null;

    await db.promise().query(
      `UPDATE noticias
       SET titulo=?, slug=?, resumen=?, contenido=?, cover_url=?, autor=?, published=?, published_at=?, updated_at=NOW()
       WHERE id=?`,
      [finalTitulo, finalSlug, finalResumen, cuerpo, cover, autor, isPublished, pubAt, id]
    );

    res.json({ ok: true, slug: finalSlug });
  } catch (err) {
    console.error('update news error:', err);
    res.status(500).json({ error: 'Error actualizando noticia' });
  }
};

// DELETE /api/news/:id
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    const [exist] = await db.promise().query('SELECT cover_url FROM noticias WHERE id=? LIMIT 1', [id]);
    if (exist.length === 0) return res.status(404).json({ error: 'Noticia no encontrada' });

    const cover = exist[0].cover_url;

    await db.promise().query('DELETE FROM noticias WHERE id=?', [id]);

    if (cover && cover.startsWith('/uploads/news/')) {
      const abs = path.join(process.cwd(), cover.replace(/^\//, ''));
      fs.promises.unlink(abs).catch(() => {});
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error eliminando noticia' });
  }
};

