const express = require('express');
const router = express.Router();
const { handleMessage, escalateToStaff, resolveEscalation } = require('../controllers/chatbotController');
const { protect, authorizeRoles, patientOnly } = require('../middleware/auth');

router.use(protect);

// Patient interactions
router.post('/message', patientOnly, handleMessage);
router.post('/escalate', patientOnly, escalateToStaff);

// Staff resolution
router.put('/resolve/:id', authorizeRoles('staff', 'facility_admin', 'super_admin'), resolveEscalation);

module.exports = router;