const express  = require('express');
const router   = express.Router();
const { getAiInsights } = require('../controllers/analyticsController');
const { protect, authorizeRoles } = require('../middleware/auth');

// Facility admin only
router.use(protect);
router.use(authorizeRoles('facility_admin', 'admin', 'superadmin'));

router.get('/ai-insights', getAiInsights);

module.exports = router;
