const express = require('express');
const router = express.Router();
const {
  getQueueEntries,
  joinQueue,
  getMyQueueStatus,
  callPatient,
  completePatient,
  skipPatient,
  markNoShow,
  cancelEntry,
  getQueueMetrics,
  addWalkIn,
} = require('../controllers/queueController');
const { protect, authorizeRoles, patientOnly, staffOnly } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// GET /api/queues — get queue entries (staff/admin)
router.get('/', authorizeRoles('staff','facility_admin','super_admin'), getQueueEntries);

// GET /api/queues/metrics — queue stats (staff/admin)
router.get('/metrics', authorizeRoles('staff','facility_admin','super_admin'), getQueueMetrics);

// GET /api/queues/my-status — patient checks their own queue status
router.get('/my-status', patientOnly, getMyQueueStatus);

// POST /api/queues/join — patient joins walk-in queue
router.post('/join', patientOnly, joinQueue);

// POST /api/queues/add-walkin — staff adds a walk-in patient manually
router.post('/add-walkin', authorizeRoles('staff','facility_admin'), addWalkIn);

// Queue entry actions (staff/admin)
router.put('/:id/call',     authorizeRoles('staff','facility_admin'), callPatient);
router.put('/:id/complete', authorizeRoles('staff','facility_admin'), completePatient);
router.put('/:id/skip',     authorizeRoles('staff','facility_admin'), skipPatient);
router.put('/:id/no-show',  authorizeRoles('staff','facility_admin'), markNoShow);
router.put('/:id/cancel',   cancelEntry); // patient or staff can cancel

module.exports = router;
