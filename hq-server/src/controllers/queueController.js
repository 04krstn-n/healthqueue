/**
 * Queue Controller
 */
const QueueEntry = require('../models/QueueEntry');
const Clinic     = require('../models/Clinic');
const Patient    = require('../models/Patient');
const Notification = require('../models/Notification');
const { getNextQueueNumber, estimateWaitTime } = require('../utils/queueHelpers');

const todayRange = () => {
  const start = new Date(); start.setHours(0,0,0,0);
  const end   = new Date(); end.setHours(23,59,59,999);
  return { $gte: start, $lte: end };
};

// GET /api/queues
const getQueueEntries = async (req, res) => {
  try {
    const { clinicId, status, date } = req.query;
    const filter = {};

    // Scope by role
    if (['facility_admin','staff'].includes(req.user.role) && req.user.clinicId) {
      filter.clinic = req.user.clinicId;
    } else if (clinicId) {
      filter.clinic = clinicId;
    }

    if (status) filter.status = status;

    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate); start.setHours(0,0,0,0);
    const end   = new Date(targetDate); end.setHours(23,59,59,999);
    filter.joinedAt = { $gte: start, $lte: end };

    const entries = await QueueEntry.find(filter)
      .populate('clinic',  'name address city')
      .populate('patient', 'fullName phone patientType')
      .sort({ joinedAt: 1 });

    return res.json(entries);
  } catch (err) {
    console.error('getQueueEntries:', err.message);
    return res.status(500).json({ message: 'Failed to get queue entries.' });
  }
};

// POST /api/queues/join
const joinQueue = async (req, res) => {
  try {
    const { clinicId, serviceName, serviceId, notes, priority } = req.body;
    if (!clinicId || !serviceName)
      return res.status(400).json({ message: 'Clinic and service name are required.' });

    const clinic = await Clinic.findById(clinicId);
    if (!clinic)                    return res.status(404).json({ message: 'Clinic not found.' });
    if (clinic.status === 'closed') return res.status(400).json({ message: 'This clinic is currently closed.' });

    // Check for existing active queue entry today
    const existing = await QueueEntry.findOne({
      clinic:  clinicId,
      patient: req.user._id,
      status:  { $in: ['waiting','serving'] },
      joinedAt: todayRange(),
    });
    if (existing) return res.status(409).json({ message: "You are already in this clinic's queue." });

    // Auto-create patient profile if missing
    let patient = await Patient.findOne({ user: req.user._id });
    if (!patient) {
      patient = await Patient.create({
        user:     req.user._id,
        fullName: req.user.fullName || 'Patient',
        email:    req.user.email || '',
        phone:    req.user.phone || '',
        patientType: 'Regular',
      });
    }

    const prefix      = (clinic.name.charAt(0) || 'Q').toUpperCase();
    const queueNumber = await getNextQueueNumber(clinicId, prefix);
    const estWait     = await estimateWaitTime(clinicId);
    const activeCount = await QueueEntry.countDocuments({
      clinic: clinicId, status: { $in: ['waiting','serving'] },
    });

    const entry = await QueueEntry.create({
      clinic:       clinicId,
      patient:      req.user._id,
      patientName:  patient.fullName || req.user.fullName,
      patientPhone: patient.phone    || req.user.phone || '',
      patientType:  patient.patientType || 'Regular',
      serviceName,
      serviceId:    serviceId || null,
      queueNumber,
      queueType:    (priority || patient.patientType !== 'Regular') ? 'Priority' : 'Regular',
      priority:     priority || false,
      notes:        notes || '',
      estimatedWaitMinutes: estWait,
      positionAtJoin: activeCount + 1,
      joinedAt:     new Date(),
    });

    // Update clinic queue stats
    await Clinic.findByIdAndUpdate(clinicId, {
      $inc: { queueLength: 1 },
      currentWaitingTime: estWait,
    });

    // Create notification
    await Notification.create({
      user:    req.user._id,
      title:   'Queue Joined',
      message: `You joined the queue at ${clinic.name}. Queue #${queueNumber}. Est. wait: ${estWait} min.`,
      type:    'queue',
      refType: 'QueueEntry',
      refId:   entry._id,
    });

    return res.status(201).json({
      message:      'Joined queue successfully.',
      entry: {
        _id:          entry._id,
        queueNumber:  entry.queueNumber,
        clinicName:   clinic.name,
        serviceName:  entry.serviceName,
        status:       entry.status,
        joinedAt:     entry.joinedAt,
      },
      position:          activeCount + 1,
      peopleAhead:       activeCount,
      estimatedWaitTime: estWait,
    });
  } catch (err) {
    console.error('joinQueue:', err.message);
    return res.status(500).json({ message: 'Failed to join queue.' });
  }
};

// GET /api/queues/my-status
const getMyQueueStatus = async (req, res) => {
  try {
    const entry = await QueueEntry.findOne({
      patient: req.user._id,
      status:  { $in: ['waiting','serving'] },
      joinedAt: todayRange(),
    }).populate('clinic', 'name address');

    if (!entry) return res.json({});

    const ahead = await QueueEntry.countDocuments({
      clinic:  entry.clinic._id,
      status:  'waiting',
      joinedAt: todayRange(),
      _id:     { $lt: entry._id },
    });

    const estWait = await estimateWaitTime(entry.clinic._id);

    return res.json({
      entry: {
        _id:        entry._id,
        queueNumber: entry.queueNumber,
        serviceName: entry.serviceName,
        status:     entry.status,
        joinedAt:   entry.joinedAt,
        clinic:     entry.clinic,
      },
      position:          ahead + 1,
      peopleAhead:       ahead,
      estimatedWaitTime: estWait,
    });
  } catch (err) {
    console.error('getMyQueueStatus:', err.message);
    return res.status(500).json({ message: 'Failed to get queue status.' });
  }
};

// PUT /api/queues/:id/call
const callPatient = async (req, res) => {
  try {
    const entry = await QueueEntry.findByIdAndUpdate(
      req.params.id,
      { status: 'serving', calledAt: new Date() },
      { new: true }
    );
    if (!entry) return res.status(404).json({ message: 'Queue entry not found.' });
    await Notification.create({
      user: entry.patient, title: 'You are being called!',
      message: `Queue #${entry.queueNumber} — please proceed to the counter.`,
      type: 'queue', refType: 'QueueEntry', refId: entry._id,
    });
    return res.json({ message: 'Patient called.', entry });
  } catch (err) { return res.status(500).json({ message: 'Failed to call patient.' }); }
};

// PUT /api/queues/:id/complete
const completePatient = async (req, res) => {
  try {
    const entry = await QueueEntry.findByIdAndUpdate(
      req.params.id,
      { status: 'done', completedAt: new Date() },
      { new: true }
    );
    if (!entry) return res.status(404).json({ message: 'Queue entry not found.' });
    await Clinic.findByIdAndUpdate(entry.clinic, { $inc: { queueLength: -1 } });
    return res.json({ message: 'Patient completed.', entry });
  } catch (err) { return res.status(500).json({ message: 'Failed to complete entry.' }); }
};

// PUT /api/queues/:id/skip
const skipPatient = async (req, res) => {
  try {
    const entry = await QueueEntry.findByIdAndUpdate(req.params.id, { status: 'skipped' }, { new: true });
    if (!entry) return res.status(404).json({ message: 'Queue entry not found.' });
    await Clinic.findByIdAndUpdate(entry.clinic, { $inc: { queueLength: -1 } });
    return res.json({ message: 'Patient skipped.', entry });
  } catch (err) { return res.status(500).json({ message: 'Failed to skip entry.' }); }
};

// PUT /api/queues/:id/no-show
const markNoShow = async (req, res) => {
  try {
    const entry = await QueueEntry.findByIdAndUpdate(req.params.id, { status: 'no_show' }, { new: true });
    if (!entry) return res.status(404).json({ message: 'Queue entry not found.' });
    await Clinic.findByIdAndUpdate(entry.clinic, { $inc: { queueLength: -1 } });
    return res.json({ message: 'Marked as no-show.', entry });
  } catch (err) { return res.status(500).json({ message: 'Failed to mark no-show.' }); }
};

// PUT /api/queues/:id/cancel
const cancelEntry = async (req, res) => {
  try {
    const entry = await QueueEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Queue entry not found.' });
    if (req.user.role === 'patient' && entry.patient?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this entry.' });
    }
    entry.status = 'cancelled';
    await entry.save();
    await Clinic.findByIdAndUpdate(entry.clinic, { $inc: { queueLength: -1 } });
    return res.json({ message: 'Queue entry cancelled.' });
  } catch (err) { return res.status(500).json({ message: 'Failed to cancel entry.' }); }
};

// GET /api/queues/metrics
const getQueueMetrics = async (req, res) => {
  try {
    const clinicId = req.query.clinicId || req.user.clinicId;
    const filter   = { joinedAt: todayRange() };
    if (clinicId) filter.clinic = clinicId;

    const [waiting, serving, done, total] = await Promise.all([
      QueueEntry.countDocuments({ ...filter, status: 'waiting' }),
      QueueEntry.countDocuments({ ...filter, status: 'serving' }),
      QueueEntry.countDocuments({ ...filter, status: { $in: ['done','completed'] } }),
      QueueEntry.countDocuments(filter),
    ]);

    // Avg wait time from completed entries
    const completed = await QueueEntry.find({
      ...filter, status: { $in: ['done','completed'] },
      calledAt: { $ne: null },
    }).select('joinedAt calledAt');
    const avgWait = completed.length
      ? Math.round(completed.reduce((s,e) => s + (new Date(e.calledAt) - new Date(e.joinedAt)) / 60000, 0) / completed.length)
      : 0;

    return res.json({ waiting, serving, done, total, avgWait });
  } catch (err) { return res.status(500).json({ message: 'Failed to get queue metrics.' }); }
};

// POST /api/queues/add-walkin
const addWalkIn = async (req, res) => {
  try {
    const { patientName, phone, serviceName, patientType, clinicId } = req.body;
    if (!patientName || !serviceName) return res.status(400).json({ message: 'Patient name and service are required.' });
    const cId = clinicId || req.user.clinicId;
    if (!cId) return res.status(400).json({ message: 'clinicId is required.' });

    const clinic = await Clinic.findById(cId);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found.' });

    const prefix      = (clinic.name.charAt(0) || 'Q').toUpperCase();
    const queueNumber = await getNextQueueNumber(cId, prefix);
    const estWait     = await estimateWaitTime(cId);
    const activeCount = await QueueEntry.countDocuments({ clinic: cId, status: { $in: ['waiting','serving'] } });

    const entry = await QueueEntry.create({
      clinic:      cId,
      patientName: patientName.trim(),
      patientPhone: phone || '',
      patientType:  patientType || 'Regular',
      serviceName,
      queueNumber,
      queueType:   patientType && patientType !== 'Regular' ? 'Priority' : 'Regular',
      estimatedWaitMinutes: estWait,
      positionAtJoin: activeCount + 1,
      joinedAt: new Date(),
    });

    await Clinic.findByIdAndUpdate(cId, { $inc: { queueLength: 1 } });
    return res.status(201).json({ message: 'Walk-in added.', entry, position: activeCount + 1, estimatedWaitTime: estWait });
  } catch (err) {
    console.error('addWalkIn:', err.message);
    return res.status(500).json({ message: 'Failed to add walk-in.' });
  }
};

module.exports = { getQueueEntries, joinQueue, getMyQueueStatus, callPatient, completePatient, skipPatient, markNoShow, cancelEntry, getQueueMetrics, addWalkIn };
