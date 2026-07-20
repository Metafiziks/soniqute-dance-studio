// db.js (project root)
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(uri);
  console.log('[DB] Connected');
}

async function disconnect() {
  await mongoose.connection.close();
  console.log('[DB] Disconnected');
}

module.exports = { connect, disconnect, mongoose };
