/**
 * Auth Controller — login, register, me
 */
const User      = require('../models/User');
const Patient   = require('../models/Patient');
const { signToken } = require('../utils/token');

// POST /api/auth/register — patient self-registration
const register = async (req, res) => {
  try {
    const { fullName, email, phone, password, dateOfBirth } = req.body;
    if (!fullName || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required.' });

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ message: 'An account with this email already exists.' });

    const user = await User.create({
      fullName:   fullName.trim(),
      email:      email.toLowerCase().trim(),
      phone:      phone || '',
      password,                    // pre-save hook hashes it
      role:       'patient',
      isVerified: true,
      isActive:   true,
    });

    // Create linked Patient record
    await Patient.create({
      user:        user._id,
      fullName:    user.fullName,
      email:       user.email,
      phone:       user.phone || '',
      dob:         dateOfBirth ? new Date(dateOfBirth) : null,
      patientType: 'Regular',
    });

    const token = signToken(user);
    return res.status(201).json({
      token,
      user: {
        _id:      user._id,
        fullName: user.fullName,
        email:    user.email,
        phone:    user.phone,
        role:     user.role,
        clinicId: user.clinicId || null,
      },
    });
  } catch (err) {
    console.error('register error:', err.message);
    return res.status(500).json({ message: err.message || 'Registration failed.' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });
    if (!user.isActive) return res.status(403).json({ message: 'Your account has been deactivated.' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid email or password.' });

    if (!user.isVerified) {
      // Auto-verify for seeded accounts (demo only)
      await User.findByIdAndUpdate(user._id, { isVerified: true });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: {
        _id:      user._id,
        fullName: user.fullName,
        email:    user.email,
        phone:    user.phone,
        role:     user.role,
        clinicId: user.clinicId || null,
        isVerified: true,
      },
    });
  } catch (err) {
    console.error('login error:', err.message);
    return res.status(500).json({ message: 'Login failed.' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('clinicId', 'name');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    return res.json({
      user: {
        _id:      user._id,
        fullName: user.fullName,
        email:    user.email,
        phone:    user.phone,
        role:     user.role,
        clinicId: user.clinicId?._id || user.clinicId || null,
        clinicName: user.clinicId?.name || null,
        isVerified: user.isVerified,
        isActive:   user.isActive,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch profile.' });
  }
};

module.exports = { register, login, getMe };
