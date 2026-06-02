/**
 * Chatbot Admin Controller — manage FAQs and view chat logs
 */
const FAQ     = require('../models/FAQ');
const ChatLog = require('../models/ChatLog');

// ── FAQs ──────────────────────────────────────────────────────────────────────
const getFAQs = async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.active === 'true') filter.isActive = true;
    const faqs = await FAQ.find(filter).sort({ category: 1, createdAt: -1 });
    return res.json(faqs);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch FAQs.' });
  }
};

const createFAQ = async (req, res) => {
  try {
    const { question, answer, category, keywords, isActive } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ message: 'Question and answer are required.' });
    }
    // Normalise keywords — split comma-separated string OR accept array
    const kws = Array.isArray(keywords)
      ? keywords.map(k => k.trim().toLowerCase()).filter(Boolean)
      : typeof keywords === 'string'
        ? keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
        : [];

    const faq = await FAQ.create({
      question:  question.trim(),
      answer:    answer.trim(),
      category:  category || 'General Info',
      keywords:  kws,
      isActive:  isActive !== undefined ? isActive : true,
      createdBy: req.user._id,
    });
    return res.status(201).json(faq);
  } catch (err) {
    console.error('createFAQ error:', err.message);
    return res.status(500).json({ message: 'Failed to create FAQ.' });
  }
};

const updateFAQ = async (req, res) => {
  try {
    const { question, answer, category, keywords, isActive } = req.body;
    const update = {};
    if (question  !== undefined) update.question  = question.trim();
    if (answer    !== undefined) update.answer    = answer.trim();
    if (category  !== undefined) update.category  = category;
    if (isActive  !== undefined) update.isActive  = isActive;
    if (keywords  !== undefined) {
      update.keywords = Array.isArray(keywords)
        ? keywords.map(k => k.trim().toLowerCase()).filter(Boolean)
        : typeof keywords === 'string'
          ? keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
          : [];
    }
    const faq = await FAQ.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!faq) return res.status(404).json({ message: 'FAQ not found.' });
    return res.json(faq);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update FAQ.' });
  }
};

const deleteFAQ = async (req, res) => {
  try {
    await FAQ.findByIdAndDelete(req.params.id);
    return res.json({ message: 'FAQ deleted.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete FAQ.' });
  }
};

// ── Chat Logs ─────────────────────────────────────────────────────────────────
const getChatLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100', 10);
    const logs  = await ChatLog.find({})
      .populate('patient', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit);
    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch chat logs.' });
  }
};

// ── Analytics ─────────────────────────────────────────────────────────────────
const getAnalytics = async (req, res) => {
  try {
    const totalFAQs  = await FAQ.countDocuments();
    const activeFAQs = await FAQ.countDocuments({ isActive: true });
    const totalLogs  = await ChatLog.countDocuments();
    const topFAQs    = await FAQ.find({ isActive: true })
      .sort({ usageCount: -1 })
      .limit(5)
      .select('question usageCount category');
    return res.json({ totalFAQs, activeFAQs, totalLogs, topFAQs });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch analytics.' });
  }
};


// ── GET /api/chatbot-admin/rasa-status ────────────────────────────────────────
// Returns live status of all chatbot engine layers
const getRasaStatus = async (req, res) => {
  const RASA_URL   = process.env.RASA_SERVER_URL;
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  let rasaOnline  = false;
  let rasaVersion = null;

  // Ping Rasa health endpoint
  if (RASA_URL) {
    try {
      const axios = require('axios');
      const r = await axios.get(`${RASA_URL}/`, { timeout: 3000 });
      rasaOnline  = true;
      // Rasa returns { version: "3.6.x" } — check multiple paths
      rasaVersion = r.data?.version || r.data?.rasa_version || null;
    } catch (_) {
      rasaOnline = false;
    }
  }

  // Determine active mode
  let activeMode = 'faq';
  if (RASA_URL && rasaOnline)  activeMode = 'rasa';
  else if (OPENAI_KEY)         activeMode = 'openai';

  return res.json({
    activeMode,
    layers: {
      rasa: {
        configured: !!RASA_URL,
        online:     rasaOnline,
        url:        RASA_URL || null,
        version:    rasaVersion,
      },
      openai: {
        configured: !!OPENAI_KEY,
        model:      'gpt-4o-mini',
      },
      faq: {
        configured: true,
        active:     true,
      },
    },
  });
};

// ── POST /api/chatbot-admin/test ──────────────────────────────────────────────
// Send a test message through the chatbot pipeline and return the response + source
const testChatbot = async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ message: 'message is required.' });

  // Re-use the same logic as chatbotController
  const axios  = require('axios');
  const OpenAI = require('openai');
  const FAQ    = require('../models/FAQ');

  const RASA_URL   = process.env.RASA_SERVER_URL;
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  let response = null;
  let source   = 'faq';

  // Mode 1: Rasa
  if (RASA_URL) {
    try {
      const r = await axios.post(`${RASA_URL}/webhooks/rest/webhook`, {
        sender: 'admin-test', message: message.trim(),
      }, { timeout: 5000 });
      const msgs = r.data;
      if (Array.isArray(msgs) && msgs.length > 0) {
        response = msgs.map(m => m.text).filter(Boolean).join('\n');
        source   = 'rasa';
      }
    } catch (_) {}
  }

  // Mode 2: OpenAI
  if (!response && OPENAI_KEY) {
    try {
      const faqs   = await FAQ.find({ isActive: true }).lean();
      const faqCtx = faqs.slice(0, 20).map((f, i) =>
        `Q${i+1}: ${f.question}\nA${i+1}: ${f.answer}`).join('\n\n');
      const client = new OpenAI({ apiKey: OPENAI_KEY });
      const comp   = await client.chat.completions.create({
        model: 'gpt-4o-mini', max_tokens: 200, temperature: 0.5,
        messages: [
          { role: 'system', content: `You are HQ Assistant for HealthQueue+. Use this FAQ:\n${faqCtx}` },
          { role: 'user',   content: message.trim() },
        ],
      });
      response = comp.choices[0]?.message?.content?.trim() || null;
      source   = 'openai';
    } catch (_) {}
  }

  // Mode 3: FAQ keyword
  if (!response) {
    const msg  = message.toLowerCase().trim();
    const faqs = await FAQ.find({ isActive: true });
    let best = null, bestScore = 0;
    for (const faq of faqs) {
      let score = 0;
      for (const kw of faq.keywords || []) { if (msg.includes(kw.toLowerCase())) score += 3; }
      const qWords = faq.question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      for (const w of qWords) { if (msg.includes(w)) score += 1; }
      if (score > bestScore) { bestScore = score; best = faq; }
    }
    if (best && bestScore >= 2) { response = best.answer; source = 'faq'; }
  }

  if (!response) {
    response = "I couldn't find an answer to that question.";
    source   = 'fallback';
  }

  return res.json({ response, source });
};


// ── GET /api/chatbot-admin/escalated — staff views escalated chats ────────────
const getEscalatedLogs = async (req, res) => {
  try {
    const { clinicId, resolved } = req.query;
    const filter = { isEscalated: true };
    if (clinicId) filter.clinicId = clinicId;
    if (resolved === 'true')  filter.resolvedByStaff = true;
    if (resolved === 'false') filter.resolvedByStaff = false;
    const logs = await ChatLog.find(filter)
      .populate('patient', 'fullName email phone')
      .sort({ escalatedAt: -1 })
      .limit(100);
    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch escalated logs.' });
  }
};

module.exports = {
  getEscalatedLogs,
  getRasaStatus,
  testChatbot, getFAQs, createFAQ, updateFAQ, deleteFAQ, getChatLogs, getAnalytics };
