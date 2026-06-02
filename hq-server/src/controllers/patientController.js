/**
 * Patient Controller — admin view of patient records
 */
const Patient = require('../models/Patient');
const User    = require('../models/User');

// GET /api/patients
const getPatients = async (req, res) => {
  try {
    const { search, patientType } = req.query;
    const filter = {};
    if (patientType && patientType !== 'all') filter.patientType = patientType;
    let patients = await Patient.find(filter)
      .populate('user', 'email isActive createdAt')
      .sort({ createdAt: -1 });
    if (search) {
      const s = search.toLowerCase();
      patients = patients.filter(p =>
        p.fullName?.toLowerCase().includes(s) ||
        p.email?.toLowerCase().includes(s) ||
        p.phone?.includes(s) ||
        p.philHealthNumber?.toLowerCase().includes(s)
      );
    }
    return res.json(patients);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch patients.' });
  }
};

// GET /api/patients/:id
const getPatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).populate('user', 'email isActive createdAt');
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });
    return res.json(patient);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch patient.' });
  }
};

// POST /api/patients — admin creates a patient record directly
const createPatient = async (req, res) => {
  try {
    const { fullName, email, phone, dateOfBirth, gender, address, patientType, philHealthNumber, emergencyContact } = req.body;
    if (!fullName) return res.status(400).json({ message: 'Full name is required.' });

    // Optionally create a User account if email provided
    let userId = null;
    if (email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        // Link to existing user
        userId = existing._id;
      } else {
        const userDoc = await User.create({
          fullName: fullName.trim(),
          email:    email.toLowerCase().trim(),
          phone:    phone || '',
          password: 'Patient@123',
          role:     'patient',
          isVerified: true,
        });
        userId = userDoc._id;
      }
    }

    const patient = await Patient.create({
      user:             userId,
      fullName:         fullName.trim(),
      email:            email || '',
      phone:            phone || '',
      dateOfBirth:      dateOfBirth || null,
      gender:           gender || 'Other',
      address:          address || '',
      patientType:      patientType || 'Regular',
      philHealthNumber: philHealthNumber || '',
      emergencyContact: emergencyContact || {},
      isActive:         true,
    });

    return res.status(201).json(patient);
  } catch (err) {
    console.error('createPatient error:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to create patient.' });
  }
};

// PUT /api/patients/:id
const updatePatient = async (req, res) => {
  try {
    const allowed = ['fullName','email','phone','dateOfBirth','gender','address','patientType','philHealthNumber','emergencyContact','bloodType','allergies','medicalHistory','isActive'];
    const update = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
    const patient = await Patient.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });
    return res.json(patient);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update patient.' });
  }
};

// DELETE /api/patients/:id — deactivate
const deactivatePatient = async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });
    if (patient.user) await User.findByIdAndUpdate(patient.user, { isActive: false });
    return res.json({ message: 'Patient deactivated.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to deactivate patient.' });
  }
};

module.exports = { getPatients, getPatient, createPatient, updatePatient, deactivatePatient };
