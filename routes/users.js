// backend/routes/users.js
const router = require('express').Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const ctrl = require('../controllers/usersController');

// === Rutas visibles para el cliente (admin) ===
// Requiere auth; admin puede gestionar usuarios (con las restricciones del controlador)
router.get('/',      requireAuth, requireRole('dev','admin'), ctrl.listUsers);
router.post('/',     requireAuth, requireRole('dev','admin'), ctrl.createUser);
router.put('/:id',   requireAuth, requireRole('dev','admin'), ctrl.updateUser);
router.delete('/:id',requireAuth, requireRole('dev','admin'), ctrl.deleteUser);

module.exports = router;
