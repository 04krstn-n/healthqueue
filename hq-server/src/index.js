/**
 * HealthQueue+ API Server — Single Entry Point
 * All CommonJS — no ES module / require() mixing.
 */
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// ─── Routes ───────────────────────────────────────────────────────────────────
const authRoutes          = require('./routes/authRoutes');
const userRoutes          = require('./routes/userRoutes');
const clinicRoutes        = require('./routes/clinicRoutes');
const queueRoutes         = require('./routes/queueRoutes');
const appointmentRoutes   = require('./routes/appointmentRoutes');
const dashboardRoutes     = require('./routes/dashboardRoutes');
const notificationRoutes  = require('./routes/notificationRoutes');
const chatbotRoutes       = require('./routes/chatbotRoutes');
// New modules
const staffRoutes         = require('./routes/staffRoutes');
const patientRoutes       = require('./routes/patientRoutes');
const servicesRoutes      = require('./routes/servicesRoutes');
const chatbotAdminRoutes  = require('./routes/chatbotAdminRoutes');
const systemConfigRoutes  = require('./routes/systemConfigRoutes');
const analyticsRoutes     = require('./routes/analyticsRoutes');

// ─── Connect DB ───────────────────────────────────────────────────────────────
connectDB();

const app = express();

// ─── Security & Utilities ─────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const allowedOrigins = process.env.FRONTEND_ORIGINS
  ? process.env.FRONTEND_ORIGINS.split(',').map((o) => o.trim())
  : '*';

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting — 200 requests per 15 min per IP (increased for dev)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down and try again later.' },
});
app.use('/api', limiter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'HealthQueue+ API', version: '2.0.0', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/users',          userRoutes);
app.use('/api/clinics',        clinicRoutes);
app.use('/api/queues',         queueRoutes);
app.use('/api/appointments',   appointmentRoutes);
app.use('/api/dashboard',      dashboardRoutes);
app.use('/api/notifications',  notificationRoutes);
app.use('/api/chatbot',        chatbotRoutes);
// New modules
app.use('/api/staff',          staffRoutes);
app.use('/api/patients',       patientRoutes);
app.use('/api/services',       servicesRoutes);
app.use('/api/chatbot-admin',  chatbotAdminRoutes);
app.use('/api/config',         systemConfigRoutes);
app.use('/api/analytics',      analyticsRoutes);

// ─── Error handlers ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '4000', 10);
app.listen(PORT, () => {
  console.log(`HealthQueue+ API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = app;
