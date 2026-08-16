const mongoose = require('mongoose');

const databaseCache = new Map();

const getDatabase = (databaseName) => {
  if (!databaseName) {
    throw new Error('Database name is required.');
  }

  if (databaseCache.has(databaseName)) {
    return databaseCache.get(databaseName);
  }

  const db = mongoose.connection.useDb(databaseName, {
    useCache: true,
  });

  databaseCache.set(databaseName, db);

  return db;
};

const getHQDatabase = () => {
  return getDatabase('healthqueue_hq');
};

const getClinicDatabase = (databaseName) => {
  return getDatabase(databaseName);
};

module.exports = {
  getDatabase,
  getHQDatabase,
  getClinicDatabase,
};