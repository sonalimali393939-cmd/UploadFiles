const mongoose = require('mongoose');
const { enableInMemoryDatabase, usersStore, postsStore } = require('../config/inMemoryDb');

if (typeof jest !== 'undefined') {
  jest.setTimeout(30000);
}

const isPlaceholder = (uri) => {
  if (!uri) return true;
  return (
    uri.includes('<username>') ||
    uri.includes('<password>') ||
    uri.includes('cluster0.xxxxx.mongodb.net') ||
    uri.includes('xxxxx')
  );
};

// Connect to the database before tests
const connectTestDB = async () => {
  const testUri = process.env.TEST_MONGODB_URI;

  if (testUri && !isPlaceholder(testUri)) {
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(testUri, { autoIndex: true, serverSelectionTimeoutMS: 3000 });
      }
      return;
    } catch (err) {
      console.warn('⚠️ Real MongoDB connection failed for tests, falling back to in-memory database.');
    }
  }

  // Use fast in-memory mock engine for tests
  enableInMemoryDatabase();
};

// Clear all collections between tests
const clearTestDB = async () => {
  usersStore.length = 0;
  postsStore.length = 0;

  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
};

// Disconnect and close the database after all tests
const closeTestDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};

module.exports = {
  connectTestDB,
  clearTestDB,
  closeTestDB,
  usersStore,
  postsStore,
};
