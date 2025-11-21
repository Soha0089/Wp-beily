// models/Group.js

const mongoose = require('mongoose');
const config = require('../config.json');

const groupSchema = new mongoose.Schema({
  // Unique ID of the group (e.g., "number-timestamp@g.us")
  id: {
    type: String,
    required: true,
    unique: true
  },
  // Group-specific configuration settings
  settings: {
    // Current prefix for the group
    prefix: {
        type: String,
        default: config.bot.prefix || '!'
    },
    // Welcome message settings
    welcomeDisabled: {
      type: Boolean,
      default: false
    },
    welcomeMessage: {
      type: String,
      default: null
    },
    // Goodbye message settings
    goodbyeDisabled: {
      type: Boolean,
      default: false
    }
    // You can add more group settings here (e.g., nsfw/game mode, etc.)
  },
  // Statistics: Total commands executed in this group
  commandCount: {
    type: Number,
    default: 0
  },
  // List of members (optional, for specific per-group features)
  members: [{
    id: String, // Member JID
    role: { type: String, default: 'member' } // Custom role/status
  }]
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

module.exports = mongoose.model('Group', groupSchema);
