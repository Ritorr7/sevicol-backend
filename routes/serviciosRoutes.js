const express = require('express');
const router = express.Router();
const db = require('../models/db');
const multer = require('multer');
const path = require('path');

// Configuración multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/servicios'),
  filename: (req, file, cb) => {
    const nombreUnico = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, nombreUnico + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Listar servicios
router.get('/', (req, res) => {
  db.query('SELECT * FROM servicios ORDER BY fecha DESC', (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener servicios' });
    res.json(results);
  });
});

// Crear nuevo servicio
router.post('/crear', upload.single('imagen'), (req, res) => {
  const { titulo, descripcion, icono } = req.body;
  const imagen = req.file ? req.file.filename : null;

  const query = 'INSERT INTO servicios (titulo, descripcion, icono, imagen) VALUES (?, ?, ?, ?)';
  db.query(query, [titulo, descripcion, icono, imagen], (err) => {
    if (err) return res.status(500).json({ error: 'Error al crear servicio' });
    res.json({ message: 'Servicio creado correctamente' });
  });
});

// Eliminar servicio
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM servicios WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: 'Error al eliminar servicio' });
    res.json({ message: 'Servicio eliminado' });
  });
});

// Actualizar servicio
router.put('/:id', upload.single('imagen'), (req, res) => {
  const id = req.params.id;
  const { titulo, descripcion, icono } = req.body;
  const imagen = req.file ? req.file.filename : null;

  const query = imagen
    ? 'UPDATE servicios SET titulo = ?, descripcion = ?, icono = ?, imagen = ? WHERE id = ?'
    : 'UPDATE servicios SET titulo = ?, descripcion = ?, icono = ? WHERE id = ?';

  const params = imagen
    ? [titulo, descripcion, icono, imagen, id]
    : [titulo, descripcion, icono, id];

  db.query(query, params, (err) => {
    if (err) return res.status(500).json({ error: 'Error al actualizar servicio' });
    res.json({ message: 'Servicio actualizado' });
  });
});

module.exports = router;


