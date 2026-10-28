const mongoose = require('mongoose');
const dns = require('dns');
const { enableInMemoryDatabase } = require('./inMemoryDb');

// Ensure reliable DNS SRV resolution for MongoDB Atlas across Windows ISP/local resolvers
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Ignore if custom DNS cannot be bound
}

/**
 * Validates if the given URI contains template placeholders
 * @param {string} uri 
 * @returns {boolean}
 */
const hasPlaceholders = (uri) => {
  if (!uri) return true;
  return (
    uri.includes('<username>') ||
    uri.includes('<password>') ||
    uri.includes('cluster0.xxxxx.mongodb.net') ||
    uri.includes('xxxxx') ||
    uri.includes('<') ||
    uri.includes('>')
  );
};

/**
 * Connect to MongoDB Atlas or initialize in-memory development database
 */
const connectDB = async () => {
  const connUri = process.env.MONGODB_URI;
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, we MUST connect to a real, valid MongoDB instance — never fall back silently!
  if (isProduction) {
    if (!connUri || hasPlaceholders(connUri)) {
      const errorMsg = 'CRITICAL DEPLOYMENT ERROR: Production environment requires a valid MONGODB_URI pointing to MongoDB Atlas. In-memory storage fallback is strictly disabled in production.';
      console.error('\n' + '='.repeat(80));
      console.error(`🛑 ${errorMsg}`);
      console.error('👉 Action Required: Configure a valid MONGODB_URI in your production environment settings.');
      console.error('='.repeat(80) + '\n');
      throw new Error(errorMsg);
    }
  }

  // If real MongoDB URI is provided without placeholders, connect to it
  if (connUri && !hasPlaceholders(connUri)) {
    try {
      const conn = await mongoose.connect(connUri, {
        dbName: 'akatsukis-draft',
        autoIndex: !isProduction,
        serverSelectionTimeoutMS: 5000,
      });

      console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host} [Database: ${conn.connection.name}]`);
      return conn;
    } catch (error) {
      console.error('\n' + '='.repeat(80));
      console.error(`❌ MongoDB Atlas Connection Failed: ${error.message}`);
      if (error.message.includes('querySrv ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        console.error('💡 Hint: The cluster hostname could not be resolved. Verify your cluster URL in .env.');
      } else if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
        console.error('💡 Hint: Authentication failed. Verify your database username and password in .env.');
      } else if (error.name === 'MongooseServerSelectionError') {
        console.error('💡 Hint: Server selection timed out. Verify your IP is whitelisted in MongoDB Atlas Network Access.');
      }
      console.error('='.repeat(80) + '\n');
      throw error;
    }
  }

  // If MONGODB_URI has placeholders or is missing, fall back to in-memory mode ONLY in development/test
  console.log('\n' + '='.repeat(80));
  console.log('⚡ NOTICE: RUNNING WITH IN-MEMORY DEVELOPMENT DATABASE');
  console.log('='.repeat(80));
  console.log('Because MONGODB_URI in your .env contains placeholder credentials, the server');
  console.log('has initialized an in-memory database so you can test all endpoints immediately!');
  console.log('\nAll authentication, posts CRUD, drafts, and admin APIs are fully operational.');
  console.log('\nWhen you are ready to connect to live MongoDB Atlas:');
  console.log('  Replace MONGODB_URI in your .env with your real Atlas connection string.');
  console.log('  Note: In-memory fallback is disabled in production environments.');
  console.log('='.repeat(80) + '\n');

  enableInMemoryDatabase();

  return {
    connection: {
      host: 'in-memory-dev-database',
      name: 'akatsukis-draft-memory',
    },
  };
};

// Monitor Mongoose connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB connection lost. Attempting reconnection...');
});

mongoose.connection.on('error', (err) => {
  console.error(`❌ MongoDB runtime error: ${err.message}`);
});

module.exports = connectDB;
