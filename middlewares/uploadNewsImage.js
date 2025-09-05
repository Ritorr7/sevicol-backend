const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'news');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Solo JPG/PNG/WEBP'), ok);
  },
}).single('image');

async function processImageSharp(req, res, next) {
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

    const image = sharp(req.file.buffer, { failOnError: false });
    const metadata = await image.metadata();

    await image
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toFile(outPath);

    req.optimizedImage = {
      filename,
      url: `/uploads/news/${filename}`,
      original: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      },
    };

    return next();
  } catch (err) {
    console.error('Sharp error:', err);
    return res.status(500).json({ error: 'Error procesando imagen' });
  }
}

module.exports = { upload, processImageSharp };

