// models/Group.js (UPDATED for Per-Group Count)

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
    prefix: {
        type: String,
        default: config.bot.prefix || '!'
    },
    welcomeDisabled: {
      type: Boolean,
      default: false
    },
    welcomeMessage: {
      type: String,
      default: null
    },
    goodbyeDisabled: {
      type: Boolean,
      default: false
    }
  },
  // Statistics: Total commands executed in this group
  commandCount: {
    type: Number,
    default: 0
  },
  // NEW FIELD: Stores message counts for users in this specific group
  messageCounts: {
    type: Map,
    of: Number, // Key is User ID, Value is Message Count
    default: {}
  },
  // List of members (optional, for specific per-group features)
  members: [{
    id: String, 
    role: { type: String, default: 'member' } 
  }]
}, {
    timestamps: true 
});

module.exports = mongoose.model('Group', groupSchema);
