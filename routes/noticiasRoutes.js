// backend/routes/newsRoutes.js
router.get('/slug/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const [rows] = await db.promise().query('SELECT * FROM noticias WHERE slug = ? AND published = 1 LIMIT 1', [slug]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    // normaliza cover a ruta pública si lo guardas así
    const item = rows[0];
    if (item.cover && !item.cover.startsWith('http'))
      item.cover_url = `/uploads/news/${item.cover}`;

    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});