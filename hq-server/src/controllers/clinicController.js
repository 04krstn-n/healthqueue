const Clinic  = require('../models/Clinic');
const mongoose = require('mongoose');

const toId = (id) => new mongoose.Types.ObjectId(String(id));

// GET /api/clinics — all clinics
const getClinics = async (req, res) => {
  try {
    const clinics = await Clinic.find({ isActive: true }).sort({ name: 1 });
    return res.json(clinics);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch clinics.' });
  }
};

// GET /api/clinics/directory — public directory (no auth needed)
const getClinicDirectory = async (req, res) => {
  try {
    const clinics = await Clinic.find({ isActive: true, status: { $ne: 'closed' } })
      .select('name address city latitude longitude services contactNumber status queueLength currentWaitingTime distanceKm baseWaitTimePerPerson peakHours')
      .sort({ name: 1 });
    return res.json(clinics);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch clinic directory.' });
  }
};

// GET /api/clinics/:id
const getClinic = async (req, res) => {
  try {
    const clinic = await Clinic.findById(toId(req.params.id));
    if (!clinic) return res.status(404).json({ message: 'Clinic not found.' });
    return res.json(clinic);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch clinic.' });
  }
};

// POST /api/clinics
const createClinic = async (req, res) => {
  try {
    const clinic = await Clinic.create(req.body);
    return res.status(201).json(clinic);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

// PUT /api/clinics/:id
const updateClinic = async (req, res) => {
  try {
    const clinic = await Clinic.findByIdAndUpdate(toId(req.params.id), req.body, { new: true, runValidators: true });
    if (!clinic) return res.status(404).json({ message: 'Clinic not found.' });
    return res.json(clinic);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

// DELETE /api/clinics/:id
const deleteClinic = async (req, res) => {
  try {
    await Clinic.findByIdAndUpdate(toId(req.params.id), { isActive: false });
    return res.json({ message: 'Clinic deactivated.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete clinic.' });
  }
};

// GET /api/clinics/recommend
const getRecommendations = async (req, res) => {
  try {
    const { service, type } = req.query;
    const filter = { isActive: true, status: { $ne: 'closed' } };
    if (service) filter.services = { $in: [service] };
    const clinics = await Clinic.find(filter).sort({ currentWaitingTime: 1 }).limit(5);
    return res.json(clinics);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch recommendations.' });
  }
};

module.exports = { getClinics, getClinicDirectory, getClinic, createClinic, updateClinic, deleteClinic, getRecommendations };
