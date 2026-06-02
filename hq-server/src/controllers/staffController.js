/**
 * Staff Controller — manage staff profiles
 * Used by: facility_admin (own clinic), super_admin (all)
 */
const Staff = require('../models/Staff');
const User  = require('../models/User');

// GET /api/staff
const getStaff = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'facility_admin') filter.clinic = req.user.clinicId;
    else if (req.query.clinicId) filter.clinic = req.query.clinicId;
    const staff = await Staff.find(filter)
      .populate('user', 'email isActive phone')
      .populate('clinic', 'name')
      .sort({ createdAt: -1 });
    return res.json(staff);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch staff.' });
  }
};

// GET /api/staff/:id
const getStaffMember = async (req, res) => {
  try {
    const member = await Staff.findById(req.params.id)
      .populate('user', 'email isActive phone')
      .populate('clinic', 'name');
    if (!member) return res.status(404).json({ message: 'Staff member not found.' });
    return res.json(member);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch staff member.' });
  }
};

// POST /api/staff — create a new staff member + linked User account
const createStaff = async (req, res) => {
  try {
    const { fullName, email, phone, gender, role, specialization, licenseNumber, clinicId } = req.body;
    if (!fullName || !email) return res.status(400).json({ message: 'Name and email are required.' });

    const targetClinic = clinicId || req.user.clinicId;
    if (!targetClinic) return res.status(400).json({ message: 'Clinic ID is required.' });

    // Check email uniqueness
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ message: 'A user with this email already exists.' });

    // Create User account for the staff member
    const userDoc = await User.create({
      fullName: fullName.trim(),
      email:    email.toLowerCase().trim(),
      phone:    phone || '',
      password: 'Staff@123',   // default password — staff should change on first login
      role:     'staff',
      clinicId: targetClinic,
      isVerified: true,
    });

    // Create Staff profile
    const staffDoc = await Staff.create({
      gender:         gender || '',
      user:           userDoc._id,
      clinic:         targetClinic,
      fullName:       fullName.trim(),
      email:          email.toLowerCase().trim(),
      phone:          phone || '',
      role:           role || 'admin',
      specialization: specialization || '',
      licenseNumber:  licenseNumber || '',
      isActive:       true,
    });

    const populated = await Staff.findById(staffDoc._id)
      .populate('user', 'email isActive phone')
      .populate('clinic', 'name');

    return res.status(201).json(populated);
  } catch (err) {
    console.error('createStaff error:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to create staff member.' });
  }
};

// PUT /api/staff/:id
const updateStaff = async (req, res) => {
  try {
    const allowed = ['position', 'specialization', 'licenseNumber', 'schedule', 'isActive', 'phone', 'role', 'fullName', 'email', 'gender'];
    const update = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
    const member = await Staff.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('user', 'email isActive phone')
      .populate('clinic', 'name');
    if (!member) return res.status(404).json({ message: 'Staff member not found.' });
    return res.json(member);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update staff member.' });
  }
};

// DELETE /api/staff/:id — deactivate
const deactivateStaff = async (req, res) => {
  try {
    const member = await Staff.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!member) return res.status(404).json({ message: 'Staff member not found.' });
    if (member.user) await User.findByIdAndUpdate(member.user, { isActive: false });
    return res.json({ message: 'Staff member deactivated.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to deactivate staff member.' });
  }
};

module.exports = { getStaff, getStaffMember, createStaff, updateStaff, deactivateStaff };
