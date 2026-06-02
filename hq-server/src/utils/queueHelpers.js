/**
 * Queue utility helpers
 */
const QueueEntry = require('../models/QueueEntry');

/**
 * Generate the next queue number for a clinic today.
 * Format: <prefix><3-digit-number>  e.g. H001, H002 …
 */
const getNextQueueNumber = async (clinicId, prefix = 'Q') => {
  const start = new Date(); start.setHours(0,0,0,0);
  const count = await QueueEntry.countDocuments({
    clinic:   clinicId,
    joinedAt: { $gte: start },
  });
  const num = String(count + 1).padStart(3, '0');
  return `${prefix}${num}`;
};

/**
 * Estimate wait time in minutes based on active queue + base wait time per person.
 */
const estimateWaitTime = async (clinicId) => {
  const Clinic = require('../models/Clinic');
  const clinic = await Clinic.findById(clinicId).select('baseWaitTimePerPerson');
  const base   = clinic?.baseWaitTimePerPerson || 10;
  const active = await QueueEntry.countDocuments({
    clinic: clinicId,
    status: { $in: ['waiting','serving'] },
  });
  return active * base;
};

/**
 * Get average wait time for completed entries today at a clinic.
 */
const getAvgWaitTime = async (clinicId) => {
  const start = new Date(); start.setHours(0,0,0,0);
  const completed = await QueueEntry.find({
    clinic:   clinicId,
    status:   { $in: ['done','completed'] },
    calledAt: { $ne: null },
    joinedAt: { $gte: start },
  }).select('joinedAt calledAt');

  if (!completed.length) return 0;
  const total = completed.reduce((s,e) => s + (new Date(e.calledAt) - new Date(e.joinedAt)) / 60000, 0);
  return Math.round(total / completed.length);
};

module.exports = { getNextQueueNumber, estimateWaitTime, getAvgWaitTime };
