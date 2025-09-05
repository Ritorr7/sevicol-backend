const express = require('express'); 
const { upload, processSectionImage } = require('../middlewares/uploadSectionImage');
const ctrl = require('../controllers/homeController');

const router = express.Router();

// GET
router.get('/',    ctrl.getAll);
router.get('/:key', ctrl.getOne);

// ⚠️ PRIMERO la ruta con imagen
router.put('/:key/image', upload, processSectionImage, ctrl.update);

// LUEGO la ruta genérica JSON
router.put('/:key', ctrl.update);

module.exports = router;

