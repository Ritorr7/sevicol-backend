// backend/routes/clientsRoutes.js
const express = require('express');
const { upload, processLogo } = require('../middlewares/uploadCompanyLogo');
const ctrl = require('../controllers/clientsController');
// opcional: const { requireAuth, requireRole } = require('../middlewares/auth');

const router = express.Router();

// EMPRESAS
router.get('/companies', ctrl.listCompanies);
router.post('/companies', upload, processLogo, ctrl.createCompany);
router.put('/companies/:id', upload, processLogo, ctrl.updateCompany);   // <—
router.delete('/companies/:id', ctrl.deleteCompany);                     // <—

// SUCURSALES
router.get('/branches', ctrl.listBranches); 
router.post('/branches', ctrl.createBranch);
router.put('/branches/:id', ctrl.updateBranch);                          // <—
router.delete('/branches/:id', ctrl.deleteBranch);                       // <—

// PÁGINA PÚBLICA
router.get('/grouped', ctrl.listGrouped);

module.exports = router;



