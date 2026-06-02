/**
 * FAQ model — Chatbot Administration
 * Supports keyword-based matching for the chatbot fallback engine
 */
const mongoose = require('mongoose');

const FAQSchema = new mongoose.Schema(
  {
    question:   { type: String, required: true, trim: true },
    answer:     { type: String, required: true, trim: true },
    category:   { type: String, default: 'General Info', trim: true },
    keywords:   { type: [String], default: [] },   // for chatbot keyword matching
    usageCount: { type: Number,  default: 0 },     // how many times matched
    isActive:   { type: Boolean, default: true },
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FAQ', FAQSchema);
