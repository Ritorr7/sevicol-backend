const db = require('../models/db'); // tu pool/conn mysql2 o mysql
const path = require('path');

exports.listado = (req, res) => {
  const q = 'SELECT * FROM postulaciones ORDER BY fecha DESC';
  db.query(q, (err, rows) => {
    if (err) {
      console.error('Error listado postulaciones:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }
    return res.json(rows || []);
  });
};

exports.uploadCV = (req, res) => {
  const {
    nombre,
    apellido,
    fecha_nac,
    direccion,
    ciudad,
    departamento,
    telefono,
    email,
    situacion_laboral,        // "Con trabajo" | "Sin trabajo"
    detalle_situacion,
    estudios,
    ref_laborales,
    ref_personales,
    motivacion
  } = req.body;

  if (!nombre || !apellido || !email) {
    return res.status(400).json({ error: 'Nombre, apellido y email son obligatorios' });
  }

  const foto = req.file ? path.posix.join('/uploads/postulantes', req.file.filename) : null;

  const q = `
    INSERT INTO postulaciones
    (nombre, apellido, fecha_nac, foto, direccion, ciudad, departamento, telefono, email,
     situacion_laboral, detalle_situacion, estudios, ref_laborales, ref_personales, motivacion)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `;

  const vals = [
    nombre, apellido, fecha_nac || null, foto, direccion || null, ciudad || null, departamento || null,
    telefono || null, email,
    situacion_laboral || 'Sin trabajo', detalle_situacion || null, estudios || null,
    ref_laborales || null, ref_personales || null, motivacion || null
  ];

  db.query(q, vals, (err) => {
    if (err) {
      console.error('Error insert postulacion:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }
    return res.json({ ok: true, msg: 'Postulación registrada', foto });
  });
};


