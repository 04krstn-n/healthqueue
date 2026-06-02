/**
 * QueueEntry model — one entry per patient per clinic visit
 * Collection: queueentries (Mongoose default)
 * Status flow: waiting → serving → done | no_show | skipped | cancelled
 */
const mongoose = require('mongoose');

const QueueEntrySchema = new mongoose.Schema(
  {
    // Primary clinic reference (ObjectId)
    clinic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true,
    },
    // Patient user reference
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Denormalized patient info (for quick display without populate)
    patientName:  { type: String, required: true, trim: true },
    patientPhone: { type: String, default: '' },
    patientType: {
      type: String,
      enum: ['Regular', 'Senior Citizen', 'PWD', 'Pregnant', 'Priority'],
      default: 'Regular',
    },
    // Queue info
    queueNumber: { type: String, required: true },
    serviceName: { type: String, required: true },
    serviceId:   { type: mongoose.Schema.Types.ObjectId, default: null },
    queueType:   { type: String, enum: ['Regular', 'Priority'], default: 'Regular' },
    priority:    { type: Boolean, default: false },
    notes:       { type: String, default: '' },
    // Status
    status: {
      type: String,
      enum: ['waiting', 'serving', 'done', 'completed', 'no_show', 'skipped', 'cancelled'],
      default: 'waiting',
      index: true,
    },
    // Timing
    joinedAt:   { type: Date, default: Date.now, index: true },
    calledAt:   { type: Date, default: null },
    servedAt:   { type: Date, default: null },
    completedAt:{ type: Date, default: null },
    // Wait estimates
    estimatedWaitMinutes: { type: Number, default: 0 },
    positionAtJoin:       { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Index for fast today's queue lookup
QueueEntrySchema.index({ clinic: 1, joinedAt: 1, status: 1 });
QueueEntrySchema.index({ patient: 1, status: 1 });

module.exports = mongoose.model('QueueEntry', QueueEntrySchema);
