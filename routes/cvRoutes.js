// backend/routes/cvRoutes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const {
  crearPostulacion,
  listarPostulaciones
} = require('../controllers/postulacionesController');

// === asegurar carpeta uploads/postulaciones ===
const UP_DIR = path.join(__dirname, '..', 'uploads', 'postulaciones');
fs.mkdirSync(UP_DIR, { recursive: true });

// === Multer ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UP_DIR),
  filename: (req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/\s+/g, '_');
    cb(null, `${ts}-${safe}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ok = /image\/(jpeg|png|webp)/.test(file.mimetype);
  if (!ok) return cb(new Error('Formato inválido. Solo JPG/PNG/WEBP'));
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// === Rutas ===
// listado (para admin)
router.get('/listado', listarPostulaciones);

// alta (el nombre del campo de archivo debe ser "foto")
router.post('/upload', upload.single('foto'), crearPostulacion);

module.exports = router;


