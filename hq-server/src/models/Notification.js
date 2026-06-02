/**
 * Notification model — in-app notifications for patients and staff
 */
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['queue', 'appointment', 'system', 'reminder'],
      default: 'system',
    },
    // Reference to the related record
    refType: { type: String, default: null },   // 'QueueEntry' | 'Appointment'
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', NotificationSchema);
