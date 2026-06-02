/**
 * Chatbot Controller — HealthQueue+ patient-facing chatbot
 *
 * Priority chain:
 *   1. Rasa server  (if RASA_SERVER_URL is set)
 *   2. OpenAI GPT   (if OPENAI_API_KEY is set) — uses FAQ docs as context
 *   3. Keyword FAQ  (always available — offline fallback)
 *
 * Escalation: patient can flag a chat as needing staff attention.
 */
const axios   = require('axios');
const OpenAI  = require('openai');
const FAQ     = require('../models/FAQ');
const ChatLog = require('../models/ChatLog');

const RASA_URL   = process.env.RASA_SERVER_URL;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

let openaiClient = null;
if (OPENAI_KEY) {
  openaiClient = new OpenAI({ apiKey: OPENAI_KEY });
  console.log('✅ OpenAI chatbot mode enabled');
} else {
  console.log('ℹ️  OPENAI_API_KEY not set — using FAQ keyword fallback');
}

// ── FAQ keyword match ─────────────────────────────────────────────────────────
async function faqMatch(message) {
  const msg  = message.toLowerCase().trim();
  const faqs = await FAQ.find({ isActive: true });
  let bestMatch = null, bestScore = 0;
  for (const faq of faqs) {
    let score = 0;
    for (const kw of faq.keywords || []) {
      if (msg.includes(kw.toLowerCase())) score += 3;
    }
    const qWords = faq.question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    for (const w of qWords) { if (msg.includes(w)) score += 1; }
    if (score > bestScore) { bestScore = score; bestMatch = faq; }
  }
  if (bestMatch && bestScore >= 2) {
    await FAQ.findByIdAndUpdate(bestMatch._id, { $inc: { usageCount: 1 } });
    return bestMatch.answer;
  }
  return null;
}

// ── OpenAI with FAQ context ───────────────────────────────────────────────────
async function openAiResponse(message, faqs) {
  const faqContext = faqs.slice(0, 30).map((f, i) =>
    `Q${i + 1}: ${f.question}\nA${i + 1}: ${f.answer}`
  ).join('\n\n');

  const systemPrompt = `You are HQ Assistant, the friendly AI health concierge for HealthQueue+ — 
a clinic queue and appointment management system in the Philippines (Hi-Precision Diagnostics branches).

Your role:
- Help patients with clinic services, appointments, queue status, and general health admin questions
- Be warm, concise, and helpful — replies should be 1-4 sentences max
- Always recommend seeing a doctor for medical advice; you handle logistics only
- If unsure, guide the patient to visit the reception or call the clinic

Use the following FAQ knowledge base to answer accurately:
---
${faqContext}
---

If the question is not covered by the FAQ, answer helpfully using general knowledge about clinic operations.
Never make up specific clinic hours, prices, or locations — direct the patient to confirm with the clinic.

IMPORTANT: If the patient's question cannot be resolved by the FAQ or standard clinic info,
and they seem frustrated or need human help, end your response with exactly this tag: [ESCALATE]`;

  const completion = await openaiClient.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 220,
    temperature: 0.5,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: message.trim() },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() || null;
}

// ── POST /api/chatbot/message ─────────────────────────────────────────────────
const handleMessage = async (req, res) => {
  const { message, patientId, clinicId } = req.body;
  if (!message || !message.trim())
    return res.status(400).json({ message: 'Message is required.' });

  let reply    = null;
  let source   = 'faq';
  let autoEscalate = false;

  // Mode 1: Rasa
  if (RASA_URL) {
    try {
      const rasaRes = await axios.post(`${RASA_URL}/webhooks/rest/webhook`, {
        sender: patientId || 'anonymous', message: message.trim(),
      }, { timeout: 5000 });
      const msgs = rasaRes.data;
      if (Array.isArray(msgs) && msgs.length > 0) {
        reply  = msgs.map(m => m.text).filter(Boolean).join('\n');
        source = 'rasa';
      }
    } catch (err) {
      console.warn('Rasa unavailable:', err.message);
    }
  }

  // Mode 2: OpenAI
  if (!reply && openaiClient) {
    try {
      const faqs = await FAQ.find({ isActive: true }).lean();
      reply  = await openAiResponse(message, faqs);
      source = 'openai';
      // Check if AI decided to escalate
      if (reply && reply.includes('[ESCALATE]')) {
        autoEscalate = true;
        reply = reply.replace('[ESCALATE]', '').trim();
      }
    } catch (err) {
      console.warn('OpenAI failed, falling back to FAQ:', err.message);
    }
  }

  // Mode 3: FAQ fallback
  if (!reply) {
    reply  = await faqMatch(message);
    source = 'faq';
  }

  // Default catch-all
  if (!reply) {
    reply = "I'm sorry, I couldn't find an answer to that. Please visit our reception desk or call the clinic directly for assistance.";
    autoEscalate = true; // no answer → escalate to staff
  }

  // Save log — use both reply + response for compatibility
  let logId = null;
  try {
    const log = await ChatLog.create({
      patient:     req.user?._id || patientId || null,
      senderId:    patientId || req.user?._id?.toString() || 'anonymous',
      message:     message.trim(),
      reply,
      response:    reply,
      isFallback:  source === 'faq',
      source,
      isEscalated: autoEscalate,
      escalatedAt: autoEscalate ? new Date() : null,
      clinicId:    clinicId || req.user?.clinicId || null,
    });
    logId = log._id;
  } catch (e) {
    console.warn('ChatLog save failed:', e.message);
  }

  return res.json({
    response: reply,
    source,
    isEscalated: autoEscalate,
    logId,
  });
};

// ── POST /api/chatbot/escalate  — patient manually requests staff help ────────
const escalateToStaff = async (req, res) => {
  try {
    const { logId, note, clinicId } = req.body;
    if (!logId) return res.status(400).json({ message: 'logId is required.' });

    const log = await ChatLog.findByIdAndUpdate(
      logId,
      {
        isEscalated:    true,
        escalatedAt:    new Date(),
        escalationNote: note || '',
        clinicId:       clinicId || req.user?.clinicId || null,
      },
      { new: true }
    );
    if (!log) return res.status(404).json({ message: 'Chat log not found.' });
    return res.json({ message: 'Escalated to staff successfully.', log });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to escalate.' });
  }
};

// ── PUT /api/chatbot/resolve/:id — staff marks escalation resolved ────────────
const resolveEscalation = async (req, res) => {
  try {
    const { note } = req.body;
    const log = await ChatLog.findByIdAndUpdate(
      req.params.id,
      { resolvedByStaff: true, resolvedAt: new Date(), resolvedNote: note || '' },
      { new: true }
    );
    if (!log) return res.status(404).json({ message: 'Not found.' });
    return res.json({ message: 'Resolved.', log });
  } catch (err) {
    return res.status(500).json({ message: 'Failed.' });
  }
};

module.exports = { handleMessage, escalateToStaff, resolveEscalation };
