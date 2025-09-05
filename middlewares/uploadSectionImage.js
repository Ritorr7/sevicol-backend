const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'home');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Solo JPG/PNG/WEBP'), ok);
  },
}).single('image');

async function processSectionImage(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });

    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase();
    const safeBase = path
      .basename(originalName, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const filename = `${Date.now()}-${safeBase}.webp`;
    const outPath = path.join(UPLOAD_DIR, filename);

    await sharp(req.file.buffer, { failOnError: false })
      .rotate()
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toFile(outPath);

    req.sectionImage = {
      filename,
      url: `/uploads/home/${filename}`,
    };
    next();
  } catch (err) {
    console.error('Sharp sección error:', err);
    res.status(500).json({ error: 'Error procesando imagen' });
  }
}

module.exports = { upload, processSectionImage };

