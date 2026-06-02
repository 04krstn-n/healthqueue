
const Appointment = require('../models/Appointment');
const Clinic      = require('../models/Clinic');
const Patient     = require('../models/Patient');
const TimeSlot    = require('../models/TimeSlot');

// ─── Book appointment (patient) ───────────────────────────────────────────────
const bookAppointment = async (req, res) => {
  try {
    const { clinicId, serviceName, serviceId, staffId, appointmentDate, timeSlot, endTime, reason, notes } = req.body;
    if (!clinicId || !serviceName || !appointmentDate || !timeSlot) {
      return res.status(400).json({ message: 'clinicId, serviceName, appointmentDate, and timeSlot are required.' });
    }
    const clinic = await Clinic.findById(clinicId);
    if (!clinic)                    return res.status(404).json({ message: 'Clinic not found.' });
    if (clinic.status === 'closed') return res.status(400).json({ message: 'This clinic is currently closed.' });

    // Auto-create patient profile if missing
    let patient = await Patient.findOne({ user: req.user._id });
    if (!patient) {
      patient = await Patient.create({
        user: req.user._id,
        fullName: req.user.fullName,
        email:    req.user.email,
        phone:    req.user.phone || '',
        patientType: 'Regular',
      });
    }

    const apptDate = new Date(appointmentDate);
    const dayStart = new Date(apptDate); dayStart.setHours(0,0,0,0);
    const dayEnd   = new Date(apptDate); dayEnd.setHours(23,59,59,999);

    const existing = await Appointment.findOne({
      clinic: clinicId, patient: patient._id,
      appointmentDate: { $gte: dayStart, $lte: dayEnd },
      timeSlot, status: { $nin: ['cancelled','no_show'] },
    });
    if (existing) return res.status(409).json({ message: 'You already have an appointment at this clinic for this time slot.' });

    const appointment = await Appointment.create({
      clinic: clinicId, patient: patient._id,
      staff: staffId || null,
      serviceName, serviceId: serviceId || null,
      appointmentDate: apptDate,
      timeSlot, endTime: endTime || '',
      patientName:  patient.fullName || req.user.fullName,
      patientPhone: patient.phone   || req.user.phone || '',
      reason: reason || '', notes: notes || '',
      status: 'pending',
    });

    return res.status(201).json({
      message: 'Appointment booked successfully.',
      appointment: {
        _id: appointment._id, clinicName: clinic.name,
        clinicAddress: clinic.address, serviceName,
        appointmentDate: appointment.appointmentDate,
        timeSlot, status: 'pending',
      },
    });
  } catch (err) {
    console.error('bookAppointment:', err.message);
    return res.status(500).json({ message: 'Failed to book appointment.' });
  }
};

// ─── Get patient's own appointments ───────────────────────────────────────────
const getMyAppointments = async (req, res) => {
  try {
    let patient = await Patient.findOne({ user: req.user._id });
    if (!patient) return res.json([]);
    const appts = await Appointment.find({ patient: patient._id })
      .populate('clinic', 'name address contactNumber')
      .sort({ appointmentDate: -1 });
    return res.json(appts);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get appointments.' });
  }
};

// ─── Cancel own appointment (patient) ────────────────────────────────────────
const cancelMyAppointment = async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found.' });
    appt.status = 'cancelled';
    appt.cancellationReason = req.body.reason || 'Cancelled by patient';
    await appt.save();
    return res.json({ message: 'Appointment cancelled.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to cancel.' });
  }
};

// ─── Get all appointments (staff/admin) ──────────────────────────────────────
const getAppointments = async (req, res) => {
  try {
    const { clinicId, status, date } = req.query;
    const filter = {};
    if (req.user.role === 'facility_admin' && req.user.clinicId) filter.clinic = req.user.clinicId;
    else if (clinicId) filter.clinic = clinicId;
    if (status) filter.status = status;
    if (date) {
      const d = new Date(date);
      const start = new Date(d); start.setHours(0,0,0,0);
      const end   = new Date(d); end.setHours(23,59,59,999);
      filter.appointmentDate = { $gte: start, $lte: end };
    }
    const appts = await Appointment.find(filter)
      .populate('clinic', 'name address')
      .populate('patient', 'fullName phone')
      .sort({ appointmentDate: 1 });
    return res.json(appts);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get appointments.' });
  }
};

// ─── Get single appointment ───────────────────────────────────────────────────
const getAppointment = async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id)
      .populate('clinic', 'name address contactNumber')
      .populate('patient', 'fullName phone email');
    if (!appt) return res.status(404).json({ message: 'Not found.' });
    return res.json(appt);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get appointment.' });
  }
};

// ─── Update status (staff/admin) ─────────────────────────────────────────────
const updateStatus = async (req, res) => {
  try {
    const appt = await Appointment.findByIdAndUpdate(
      req.params.id, { status: req.body.status }, { new: true }
    );
    if (!appt) return res.status(404).json({ message: 'Not found.' });
    return res.json(appt);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update.' });
  }
};

// ─── Cancel (staff/admin) ─────────────────────────────────────────────────────
const cancelAppointment = async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Not found.' });
    appt.status = 'cancelled';
    appt.cancellationReason = req.body.reason || 'Cancelled';
    await appt.save();
    return res.json({ message: 'Cancelled.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed.' });
  }
};

// ─── Today's appointments (staff/admin) ──────────────────────────────────────
const getTodayAppointments = async (req, res) => {
  try {
    const today = new Date();
    const start = new Date(today); start.setHours(0,0,0,0);
    const end   = new Date(today); end.setHours(23,59,59,999);
    const filter = { appointmentDate: { $gte: start, $lte: end } };
    if (req.user.role === 'facility_admin' && req.user.clinicId) filter.clinic = req.user.clinicId;
    const appts = await Appointment.find(filter)
      .populate('clinic','name').populate('patient','fullName phone')
      .sort({ timeSlot: 1 });
    return res.json(appts);
  } catch (err) {
    return res.status(500).json({ message: 'Failed.' });
  }
};

// ─── Available slots (public) ─────────────────────────────────────────────────
const getAvailableSlots = async (req, res) => {
  try {
    const { clinicId, date } = req.query;
    const slots = [
      '8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM',
      '11:00 AM','11:30 AM','1:00 PM','1:30 PM','2:00 PM','2:30 PM',
      '3:00 PM','3:30 PM','4:00 PM','4:30 PM',
    ];
    if (!clinicId || !date) return res.json(slots);
    const d = new Date(date);
    const start = new Date(d); start.setHours(0,0,0,0);
    const end   = new Date(d); end.setHours(23,59,59,999);
    const booked = await Appointment.find({
      clinic: clinicId,
      appointmentDate: { $gte: start, $lte: end },
      status: { $nin: ['cancelled','no_show'] },
    }).select('timeSlot');
    const counts = {};
    booked.forEach(a => { counts[a.timeSlot] = (counts[a.timeSlot] || 0) + 1; });
    return res.json(slots.filter(s => (counts[s] || 0) < 3));
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get slots.' });
  }
};

// ─── TimeSlot CRUD (admin) ────────────────────────────────────────────────────
const getTimeSlots = async (req, res) => {
  try {
    const { clinicId } = req.query;
    const filter = clinicId ? { clinic: clinicId } : {};
    const slots = await TimeSlot.find(filter).populate('clinic','name');
    return res.json(slots);
  } catch (err) {
    return res.status(500).json({ message: 'Failed.' });
  }
};

const createTimeSlot = async (req, res) => {
  try {
    const slot = await TimeSlot.create(req.body);
    return res.status(201).json(slot);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const updateTimeSlot = async (req, res) => {
  try {
    const slot = await TimeSlot.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!slot) return res.status(404).json({ message: 'Not found.' });
    return res.json(slot);
  } catch (err) {
    return res.status(500).json({ message: 'Failed.' });
  }
};

const deleteTimeSlot = async (req, res) => {
  try {
    await TimeSlot.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Deleted.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed.' });
  }
};

module.exports = {
  bookAppointment, getMyAppointments, cancelMyAppointment,
  getAppointments, getAppointment, updateStatus, cancelAppointment,
  getTodayAppointments, getAvailableSlots,
  getTimeSlots, createTimeSlot, updateTimeSlot, deleteTimeSlot,
};
