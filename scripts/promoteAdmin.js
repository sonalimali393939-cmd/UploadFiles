const mongoose = require('mongoose');
const dns = require('dns');
const dotenv = require('dotenv');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

dotenv.config();

const User = require('../models/User');

const promoteUser = async () => {
  const targetEmail = process.argv[2];

  if (!targetEmail || targetEmail.trim() === '') {
    console.error('❌ Error: Please provide the email address of the user to promote.');
    console.error('Usage: node scripts/promoteAdmin.js <user-email>');
    process.exit(1);
  }

  const normalizedEmail = targetEmail.toLowerCase().trim();

  const connUri = process.env.MONGODB_URI;
  if (!connUri || connUri.includes('<username>') || connUri.includes('cluster0.xxxxx.mongodb.net')) {
    console.error('❌ Error: A valid MONGODB_URI is required in your .env file to connect to the database.');
    process.exit(1);
  }

  try {
    await mongoose.connect(connUri);

    // Exact email match to prevent modifying unintended users
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      console.error(`❌ User not found with email: "${normalizedEmail}". Please register this user first.`);
      await mongoose.connection.close();
      process.exit(1);
    }

    if (user.role === 'admin') {
      console.log(`ℹ️  User "${user.name}" (${user.email}) is already an administrator.`);
      await mongoose.connection.close();
      process.exit(0);
    }

    // Safely update only this specific user
    user.role = 'admin';
    await user.save();

    console.log(`✅ Success: User "${user.name}" (${user.email}) [ID: ${user._id}] has been promoted to 'admin'.`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`❌ Operation failed: ${error.message}`);
    await mongoose.connection.close();
    process.exit(1);
  }
};

promoteUser();
