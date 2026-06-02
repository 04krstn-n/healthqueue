const express = require('express');
const router  = express.Router();
const { getPatients, getPatient, createPatient, updatePatient, deactivatePatient } = require('../controllers/patientController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.use(protect);
router.use(authorizeRoles('super_admin', 'facility_admin'));

router.get('/',       getPatients);
router.post('/',      createPatient);
router.get('/:id',    getPatient);
router.put('/:id',    updatePatient);
router.delete('/:id', deactivatePatient);

module.exports = router;
