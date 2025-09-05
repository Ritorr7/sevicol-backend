const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Obtener todas las ubicaciones agrupadas por departamento
router.get('/', (req, res) => {
  const query = 'SELECT departamento, ciudad FROM ubicaciones';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener ubicaciones:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }

    // Agrupar por departamento
    const ubicaciones = {};
    results.forEach(({ departamento, ciudad }) => {
      if (!ubicaciones[departamento]) {
        ubicaciones[departamento] = [];
      }
      ubicaciones[departamento].push(ciudad);
    });

    res.json(ubicaciones);
  });
});

module.exports = router;

