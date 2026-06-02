const express = require('express');
const router  = express.Router();
const { handleMessage, escalateToStaff, resolveEscalation } = require('../controllers/chatbotController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.use(protect);

// Patient: send message
router.post('/message', handleMessage);

// Patient: manually escalate a chat to staff
router.post('/escalate', escalateToStaff);

// Staff/admin: resolve an escalated inquiry
router.put('/resolve/:id', authorizeRoles('staff', 'facility_admin', 'super_admin'), resolveEscalation);

module.exports = router;
