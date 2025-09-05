// backend/controllers/postulacionesController.js
const db = require('../models/db');

const mapNull = v => (v === '' || v === undefined ? null : v);

exports.crearPostulacion = (req, res) => {
  try {
    const {
      nombre,
      apellido,
      fecha_nac,          // YYYY-MM-DD desde <input type="date">
      direccion,
      departamento,
      ciudad,
      telefono,
      email,
      situacion_laboral,  // "Con trabajo" | "Sin trabajo"
      detalle_situacion,
      estudios,
      ref_laborales,
      ref_personales,
      motivacion
    } = req.body;

    // archivo (opcional)
    const foto = req.file ? req.file.filename : null;

    // validaciones mínimas
    if (!nombre || !apellido || !email) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (nombre, apellido, email).' });
    }

    const sql = `
      INSERT INTO postulaciones (
        nombre, apellido, fecha_nac, foto, direccion, ciudad, departamento,
        telefono, email, situacion_laboral, detalle_situacion, estudios,
        ref_laborales, ref_personales, motivacion, fecha
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const params = [
      mapNull(nombre),
      mapNull(apellido),
      mapNull(fecha_nac),
      mapNull(foto),
      mapNull(direccion),
      mapNull(ciudad),
      mapNull(departamento),
      mapNull(telefono),
      mapNull(email),
      mapNull(situacion_laboral),
      mapNull(detalle_situacion),
      mapNull(estudios),
      mapNull(ref_laborales),
      mapNull(ref_personales),
      mapNull(motivacion),
    ];

    db.query(sql, params, (err, result) => {
      if (err) {
        console.error('Insert postulaciones ERROR:', err.sqlMessage || err.message);
        return res.status(500).json({ error: 'Error al guardar la postulación en la base de datos.' });
      }
      return res.status(201).json({ ok: true, id: result.insertId });
    });
  } catch (e) {
    console.error('crearPostulacion EXCEPTION:', e);
    return res.status(500).json({ error: 'Error inesperado en el servidor.' });
  }
};

exports.listarPostulaciones = (req, res) => {
  const sql = 'SELECT * FROM postulaciones ORDER BY fecha DESC';
  db.query(sql, (err, rows) => {
    if (err) {
      console.error('List postulaciones ERROR:', err.sqlMessage || err.message);
      return res.status(500).json({ error: 'Error al listar postulaciones.' });
    }
    return res.json(rows);
  });
};
