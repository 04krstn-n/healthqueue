/**
 * Clinic model — health facility
 */
const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema(
  {
    name:            { type: String, required: true, trim: true },
    description:     { type: String, default: '' },
    durationMinutes: { type: Number, default: 30 },
    isAvailable:     { type: Boolean, default: true },
  },
  { _id: true }
);

const PeakHourSchema = new mongoose.Schema(
  { hour: { type: String }, load: { type: Number, default: 0 } },
  { _id: false }
);

const ClinicSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, trim: true },
    address:       { type: String, default: '' },
    city:          { type: String, default: '' },
    province:      { type: String, default: '' },
    region:        { type: String, default: 'NCR' },
    latitude:      { type: Number, default: 0 },
    longitude:     { type: Number, default: 0 },
    contactNumber: { type: String, default: '' },
    email:         { type: String, default: '' },
    facilityType:  { type: String, default: 'Diagnostic Center' },
    operatingHours:{ type: String, default: '8:00 AM - 5:00 PM' },
    // Embedded services — single unified schema
    services: [ServiceSchema],
    status: {
      type: String,
      enum: ['open', 'closed', 'busy', 'maintenance', 'active', 'inactive'],
      default: 'open',
    },
    maxQueueCapacity:     { type: Number, default: 100 },
    acceptsWalkIn:        { type: Boolean, default: true },
    acceptsAppointment:   { type: Boolean, default: true },
    // Live queue stats (updated by queue operations)
    queueLength:          { type: Number, default: 0 },
    currentWaitingTime:   { type: Number, default: 0 },
    baseWaitTimePerPerson:{ type: Number, default: 10 },
    // AI forecasting
    peakHours: [PeakHourSchema],
    // Admin link
    facilityAdmin:{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

ClinicSchema.index({ name: 1 });
ClinicSchema.index({ city: 1, isActive: 1 });

module.exports = mongoose.model('Clinic', ClinicSchema);
