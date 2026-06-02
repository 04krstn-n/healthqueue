const express = require('express');
const router  = express.Router();

const {
  getMyAppointments,
  cancelMyAppointment,
  bookAppointment,
  getAppointments,
  getAppointment,
  updateStatus,
  cancelAppointment,
  getAvailableSlots,
  getTodayAppointments,
  getTimeSlots,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
} = require('../controllers/appointmentController');

const { protect, authorizeRoles, patientOnly } = require('../middleware/auth');

router.use(protect);

// ── Time Slots (admin/facility_admin) ─────────────────────────────────────────
router.get('/timeslots',        authorizeRoles('super_admin', 'facility_admin'), getTimeSlots);
router.post('/timeslots',       authorizeRoles('super_admin', 'facility_admin'), createTimeSlot);
router.put('/timeslots/:id',    authorizeRoles('super_admin', 'facility_admin'), updateTimeSlot);
router.delete('/timeslots/:id', authorizeRoles('super_admin', 'facility_admin'), deleteTimeSlot);

// ── Available Slots ───────────────────────────────────────────────────────────
router.get('/available-slots', getAvailableSlots);

// ── Patient: my appointments ──────────────────────────────────────────────────
router.get('/my', getMyAppointments);

// ── Today (staff/admin) ───────────────────────────────────────────────────────
router.get('/today', authorizeRoles('staff', 'facility_admin', 'super_admin'), getTodayAppointments);

// ── List / Book ───────────────────────────────────────────────────────────────
router.get('/',  getAppointments);
router.post('/', patientOnly, bookAppointment);

// ── Single ────────────────────────────────────────────────────────────────────
router.get('/:id', getAppointment);

// ── Status / Cancel ───────────────────────────────────────────────────────────
router.put('/:id/status', authorizeRoles('staff', 'facility_admin', 'super_admin'), updateStatus);
router.put('/:id/cancel', cancelMyAppointment);

module.exports = router;
