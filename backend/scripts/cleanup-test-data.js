/**
 * cleanup-test-data.js
 * Run: node backend/scripts/cleanup-test-data.js
 * Deletes ALL users and ads from MongoDB (use only to reset test data)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const User    = require('../models/User');
const Ad      = require('../models/Ad');
const Chat    = require('../models/Chat');
const Message = require('../models/Message');

async function cleanup() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const users    = await User.deleteMany({});
  const ads      = await Ad.deleteMany({});
  const chats    = await Chat.deleteMany({});
  const messages = await Message.deleteMany({});

  console.log(`🗑️  Deleted ${users.deletedCount} users`);
  console.log(`🗑️  Deleted ${ads.deletedCount} ads`);
  console.log(`🗑️  Deleted ${chats.deletedCount} chats`);
  console.log(`🗑️  Deleted ${messages.deletedCount} messages`);
  console.log('✅ Test data cleared. Database is clean.');

  await mongoose.disconnect();
}

cleanup().catch(err => {
  console.error('❌ Cleanup failed:', err.message);
  process.exit(1);
});
