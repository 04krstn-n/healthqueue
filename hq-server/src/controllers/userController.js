const bcrypt = require('bcryptjs');
/**
 * User Controller — user management (admin use)
 */
const User = require('../models/User');
const Patient = require('../models/Patient');
const Staff = require('../models/Staff');
const { signToken } = require('../utils/token');

// ─── Get all users (super_admin) ──────────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.clinicId) filter.clinicId = req.query.clinicId;
    const users = await User.find(filter).select('-password').populate('clinicId','name').sort({ createdAt: -1 });
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get users.' });
  }
};

// ─── Get single user ──────────────────────────────────────────────────────────
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get user.' });
  }
};

// ─── Create admin/staff user (super_admin or facility_admin) ──────────────────
// POST /api/users
// Body: { fullName, email, phone, password, role, clinicId }
const createUser = async (req, res) => {
  try {
    const { fullName, email, phone, password, role, clinicId } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ message: 'fullName, email, password, and role are required.' });
    }

    // Facility admin can only create staff for their own clinic
    if (req.user.role === 'facility_admin') {
      if (!['staff'].includes(role)) {
        return res.status(403).json({ message: 'Facility admin can only create staff accounts.' });
      }
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ message: 'Email already registered.' });

    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || '',
      password,
      role,
      clinicId: clinicId || req.user.clinicId || null,
      isVerified: true, // admin-created accounts are pre-verified
    });

    // If staff, create Staff profile
    if (role === 'staff' && clinicId) {
      await Staff.create({
        user: user._id,
        clinic: clinicId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
      });
    }

    return res.status(201).json(user.toSafeObject());
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create user.' });
  }
};

// ─── Update user ──────────────────────────────────────────────────────────────
const updateUser = async (req, res) => {
  try {
    const { fullName, phone, clinicId, isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (fullName) user.fullName = fullName;
    if (phone !== undefined) user.phone = phone;
    if (clinicId !== undefined) user.clinicId = clinicId;
    if (isActive !== undefined) user.isActive = isActive;
    await user.save();

    return res.json(user.toSafeObject());
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update user.' });
  }
};

// ─── Delete / deactivate user ─────────────────────────────────────────────────
const deactivateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.isActive = false;
    await user.save();
    return res.json({ message: 'User deactivated.', user: user.toSafeObject() });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to deactivate user.' });
  }
};

// ─── Get patient profile for current user ────────────────────────────────────
const getMyPatientProfile = async (req, res) => {
  try {
    const profile = await Patient.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ message: 'Patient profile not found.' });
    return res.json(profile);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get profile.' });
  }
};

// ─── Update patient profile ───────────────────────────────────────────────────
const updateMyPatientProfile = async (req, res) => {
  try {
    const allowed = ['fullName', 'dob', 'age', 'gender', 'phone', 'email', 'address', 'philHealthNumber', 'hmoProvider', 'patientType', 'medicalNotes'];
    const update = {};
    allowed.forEach((field) => { if (req.body[field] !== undefined) update[field] = req.body[field]; });

    const profile = await Patient.findOneAndUpdate(
      { user: req.user._id },
      update,
      { new: true, runValidators: true }
    );
    if (!profile) return res.status(404).json({ message: 'Patient profile not found.' });
    return res.json(profile);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update profile.' });
  }
};


// PUT /api/users/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Current and new password are required.' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(401).json({ message: 'Current password is incorrect.' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save({ validateBeforeSave: false });

    return res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('changePassword:', err.message);
    return res.status(500).json({ message: 'Failed to change password.' });
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deactivateUser,
  getMyPatientProfile,
  updateMyPatientProfile,
  changePassword,
};