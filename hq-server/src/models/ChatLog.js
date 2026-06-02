/**
 * ChatLog model — stores chatbot conversation history
 * Also used for patient escalation requests to staff.
 */
const mongoose = require('mongoose');

const ChatLogSchema = new mongoose.Schema(
  {
    patient:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    senderId:   { type: String, default: 'anonymous' },
    message:    { type: String, required: true },
    // The chatbot's reply — stored as both 'reply' and 'response' for compatibility
    reply:      { type: String, default: '' },
    response:   { type: String, default: '' },
    isFallback: { type: Boolean, default: false },
    // Which engine answered: 'rasa' | 'openai' | 'faq'
    source:     { type: String, default: 'faq' },
    // Escalation to staff
    isEscalated:    { type: Boolean, default: false },
    escalatedAt:    { type: Date,    default: null },
    escalationNote: { type: String,  default: '' },
    resolvedByStaff:{ type: Boolean, default: false },
    resolvedAt:     { type: Date,    default: null },
    resolvedNote:   { type: String,  default: '' },
    clinicId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatLog', ChatLogSchema);
