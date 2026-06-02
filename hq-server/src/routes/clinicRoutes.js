const express = require('express');
const router  = express.Router();
const {
  getClinics, getClinicDirectory, getClinic,
  createClinic, updateClinic, deleteClinic, getRecommendations,
} = require('../controllers/clinicController');
const { protect, authorizeRoles } = require('../middleware/auth');

// Public (no auth needed for patient app directory)
router.get('/directory',   getClinicDirectory);
router.get('/recommend',   getRecommendations);

// Protected
router.use(protect);
router.get('/',    getClinics);
router.post('/',   authorizeRoles('super_admin', 'facility_admin'), createClinic);
router.get('/:id', getClinic);
router.put('/:id', authorizeRoles('super_admin', 'facility_admin'), updateClinic);
router.delete('/:id', authorizeRoles('super_admin'), deleteClinic);

module.exports = router;
