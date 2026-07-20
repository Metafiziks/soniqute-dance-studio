const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      // mongoose v7+ usually works without extra options
    });
    console.log("[DB] Mongo connected");
  } catch (err) {
    console.error("[DB] Connection error:", err);
    process.exit(1);
  }
};

module.exports = connectDB;
