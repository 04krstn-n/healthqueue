const express = require('express');
const router = express.Router();
const { getServices, addService, updateService, deleteService } = require('../controllers/servicesController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.use(protect);
router.use(authorizeRoles('super_admin', 'facility_admin'));

router.get('/',                           getServices);
router.post('/',                          addService);
router.put('/:clinicId/:serviceId',       updateService);
router.delete('/:clinicId/:serviceId',    deleteService);

module.exports = router;
