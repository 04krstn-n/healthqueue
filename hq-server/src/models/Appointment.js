/**
 * Appointment model — for private clinic appointment booking
 *
 * Status flow:
 *   pending → confirmed → arrived → serving → completed
 *                       → late (patient late)
 *                       → no_show (patient didn't come)
 *                       → cancelled (patient or admin cancelled)
 */
const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema(
  {
    clinic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    // Which staff/doctor will handle this appointment
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
    // Service details (copied from clinic services at booking time)
    serviceName: { type: String, required: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    // Appointment date and time
    appointmentDate: { type: Date, required: true, index: true },
    timeSlot: { type: String, required: true }, // e.g. "09:00 AM"
    endTime: { type: String, default: '' },      // e.g. "09:30 AM"
    // Patient info (copied at booking for quick display)
    patientName: { type: String, required: true },
    patientPhone: { type: String, default: '' },
    patientType: {
      type: String,
      enum: ['Regular', 'Senior Citizen', 'PWD', 'Pregnant', 'Priority'],
      default: 'Regular',
    },
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'arrived',
        'serving',
        'completed',
        'late',
        'no_show',
        'cancelled',
        'rescheduled',
      ],
      default: 'pending',
      index: true,
    },
    reason: { type: String, default: '' },
    notes: { type: String, default: '' },
    // If rescheduled, track the original date
    previousDate: { type: Date, default: null },
    previousTimeSlot: { type: String, default: null },
    // Reminder sent?
    reminderSent: { type: Boolean, default: false },
    // Linked to a queue entry when patient arrives
    queueEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QueueEntry',
      default: null,
    },
    // Timestamps
    confirmedAt: { type: Date, default: null },
    arrivedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: String, default: null }, // 'patient' | 'staff' | 'admin'
    cancellationReason: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appointment', AppointmentSchema);
