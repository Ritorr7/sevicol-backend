const express = require('express');
const ctrl = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middlewares/auth');
const router = express.Router();

// Solo admins gestionan usuarios
router.get('/', requireAuth, requireRole('admin'), ctrl.listUsers);
router.post('/', requireAuth, requireRole('admin'), ctrl.createUser);
router.put('/:id', requireAuth, requireRole('admin'), ctrl.updateUser);
router.delete('/:id', requireAuth, requireRole('admin'), ctrl.deleteUser);

module.exports = router;
