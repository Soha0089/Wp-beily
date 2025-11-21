// models/User.js

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Unique ID of the user (e.g., "number@s.whatsapp.net")
  id: {
    type: String,
    required: true,
    unique: true
  },
  // User's name/pushname (for display/leaderboards)
  name: {
    type: String,
    default: ""
  },
  // Economy: Coins/Money
  coins: {
    type: Number,
    default: 0
  },
  // Leveling: Experience points
  exp: {
    type: Number,
    default: 0
  },
  // Leveling: Current level
  level: {
    type: Number,
    default: 1
  },
  // Statistics: Total commands executed
  commandCount: {
    type: Number,
    default: 0
  },
  // Statistics: Total messages sent (for !count)
  messageCount: {
    type: Number,
    default: 0
  },
  // Timestamp of the last activity/command execution
  lastActive: {
    type: Date,
    default: Date.now
  },
  // Date of the last daily reward claim (format: "YYYY-MM-DD")
  lastDailyReward: {
    type: String, 
    default: null
  },
  // Date when the user was first added to the database
  joinDate: {
    type: Date,
    default: Date.now
  }
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

module.exports = mongoose.model('User', userSchema);
