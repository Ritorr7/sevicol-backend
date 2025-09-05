const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const DIR = path.join(__dirname, '..', 'uploads', 'companies');
fs.mkdirSync(DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Solo JPG/PNG/WEBP'), ok);
  },
}).single('logo');

async function processLogo(req, res, next) {
  try {
    if (!req.file) return next();
    const ext = path.extname(req.file.originalname).toLowerCase();
    const base = path.basename(req.file.originalname, ext)
      .toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const filename = `${Date.now()}-${base}.webp`;
    const out = path.join(DIR, filename);

    await sharp(req.file.buffer, { failOnError: false })
      .resize({ width: 600, height: 300, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75 })
      .toFile(out);

    req.logoInfo = { url: `/uploads/companies/${filename}` };
    next();
  } catch (e) {
    console.error('sharp error', e);
    res.status(500).json({ error: 'Error procesando logo' });
  }
}

module.exports = { upload, processLogo };

