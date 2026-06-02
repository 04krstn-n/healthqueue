const jwt = require('jsonwebtoken');

/**
 * Sign a JWT for a user. Throws if JWT_SECRET is not set.
 */
const signToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set.');
  return jwt.sign(
    { id: user._id, role: user.role, clinicId: user.clinicId || null },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = { signToken };
