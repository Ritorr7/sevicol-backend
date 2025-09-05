const express = require('express');
const ctrl = require('../controllers/newsController');

const router = express.Router();

// Público
router.get('/', ctrl.list);                 // ?published=true&limit=12&page=1
router.get('/latest', ctrl.latest);         // 3 últimas publicadas
router.get('/slug/:slug', ctrl.getBySlug);  // detalle por slug

// Admin (agregá tus middlewares si querés proteger)
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;



