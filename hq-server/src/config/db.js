const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('FATAL: MONGO_URI environment variable is not set.');
    process.exit(1);
  }
  try {
    mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected — retrying…'));
    mongoose.connection.on('reconnected',  () => console.log('🔄 MongoDB reconnected'));
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
