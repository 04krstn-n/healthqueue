/**
 * TimeSlot model — defines available appointment slots per clinic per service
 */
const mongoose = require('mongoose');

const TimeSlotSchema = new mongoose.Schema(
  {
    clinic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true,
    },
    serviceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    serviceName: { type: String, required: true },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
    // Day of week (0=Sunday, 6=Saturday) or specific date
    dayOfWeek: { type: Number, min: 0, max: 6, default: null },
    specificDate: { type: Date, default: null }, // overrides dayOfWeek if set
    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true },   // "09:30"
    label: { type: String, required: true },     // "9:00 AM"
    maxPatients: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TimeSlot', TimeSlotSchema);
