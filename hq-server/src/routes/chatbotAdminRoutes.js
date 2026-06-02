const express = require('express');
const router  = express.Router();
const {
  getFAQs, createFAQ, updateFAQ, deleteFAQ,
  getChatLogs, getAnalytics,
  getRasaStatus, testChatbot,
  getEscalatedLogs,
} = require('../controllers/chatbotAdminController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.use(protect);

// ── Staff can read FAQs and chat logs (read-only) ─────────────────────────────
const adminOnly  = authorizeRoles('super_admin', 'facility_admin');
const staffPlus  = authorizeRoles('super_admin', 'facility_admin', 'staff');

// FAQs — admin write, staff read
router.get('/faqs',        staffPlus, getFAQs);
router.post('/faqs',       adminOnly, createFAQ);
router.put('/faqs/:id',    adminOnly, updateFAQ);
router.delete('/faqs/:id', adminOnly, deleteFAQ);

// Logs & analytics — staff can view
router.get('/logs',        staffPlus, getChatLogs);
router.get('/escalated',   staffPlus, getEscalatedLogs);
router.get('/analytics',   staffPlus, getAnalytics);

// Engine status & test — admin + staff
router.get('/rasa-status', staffPlus, getRasaStatus);
router.post('/test',       adminOnly, testChatbot);

module.exports = router;
