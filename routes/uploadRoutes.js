// backend/routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const { upload, processImageSharp } = require('../middlewares/uploadNewsImage');

// POST /api/uploads/news  (campo: "image")
router.post('/news', upload, processImageSharp, (req, res) => {
  // processImageSharp guarda la imagen y setea req.optimizedImage
  // Ej: { filename, url, original:{width,height,format} }
  if (!req.optimizedImage) {
    return res.status(500).json({ error: 'No se pudo procesar la imagen' });
  }
  return res.json(req.optimizedImage);
});

module.exports = router;



