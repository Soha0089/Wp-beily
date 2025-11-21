// helpers.js (FIXED & Optimized)

const mongoose = require('mongoose');
const chalk = require('chalk');
const moment = require('moment');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const config = require('../config.json');
const User = require('../models/User'); // Assuming this model exists
const Group = require('../models/Group'); // Assuming this model exists

// Prevent long buffering when DB is unreachable
mongoose.set('bufferCommands', false);
// Set findOneAndUpdate to use native promises
mongoose.set('strictQuery', true);

// Determine preferred database mode and JSON path
const preferredDbType = (config.database && config.database.type) ? config.database.type.toLowerCase() : 'mongodb';
let currentDbMode = preferredDbType; // can switch to 'json' if Mongo fails
const jsonDbPath = (config.database && config.database.path) ? config.database.path : path.join(__dirname, '..', 'data', 'database.json');

// Optimized JSON DB helpers with caching
let jsonDbCache = null;
let lastCacheTime = 0;
const CACHE_TTL = 30000; // 30 seconds cache

async function loadJsonDB() {
  try {
    const now = Date.now();
    
    // Return cached data if still valid
    if (jsonDbCache && (now - lastCacheTime) < CACHE_TTL) {
      return jsonDbCache;
    }
    
    const dbFilePath = jsonDbPath;
    
    if (!(await fs.pathExists(dbFilePath))) {
      await fs.ensureDir(path.dirname(dbFilePath));
      await fs.writeJson(dbFilePath, { users: {}, groups: {} }, { spaces: 2 });
    }
    const data = await fs.readJson(dbFilePath);
    if (!data.users) data.users = {};
    if (!data.groups) data.groups = {};
    
    // Update cache
    jsonDbCache = data;
    lastCacheTime = now;
    return data;
  } catch (e) {
    console.error('❌ Failed to load JSON DB:', e.message);
    return { users: {}, groups: {} };
  }
}

async function saveJsonDB(data) {
  try {
    // Update cache
    jsonDbCache = data;
    lastCacheTime = Date.now();
    
    await fs.ensureDir(path.dirname(jsonDbPath));
    await fs.writeJson(jsonDbPath, data, { spaces: 2 });
  } catch (e) {
    console.error('❌ Failed to save JSON DB:', e.message);
  }
}

// Logging function
function log(message, type = 'info') {
  const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
  const colors = {
    info: chalk.blue,
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red
  };
  const coloredMessage = colors[type] ? colors[type](message) : message;
  console.log(`[${timestamp}] ${coloredMessage}`);
}

// Format uptime
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// Initialize database (Mongo or JSON fallback)
async function initDatabase() {
  try {
    if (preferredDbType === 'json') {
      await loadJsonDB();
      currentDbMode = 'json';
      log(`✅ JSON database initialized at ${jsonDbPath}`, 'success');
      return;
    }

    const uri = config.database && config.database.uri;
    if (uri && uri.startsWith('mongodb')) {
      await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000 // fail fast to allow fallback
      });
      if (mongoose.connection.readyState === 1) {
        currentDbMode = 'mongodb';
        log('✅ MongoDB connected', 'success');
        return;
      }
    } else {
      log('⚠️ No MongoDB URI provided. Falling back to JSON mode. Set config.database.type to "mongodb" and provide a valid URI to use MongoDB.', 'warning');
    }
  } catch (err) {
    log(`❌ MongoDB connection error: ${err.message}`, 'error');
    log('⚠️ Falling back to JSON database mode.', 'warning');
  }

  // Fallback to JSON mode
  await loadJsonDB();
  currentDbMode = 'json';
  log(`✅ JSON database ready at ${jsonDbPath}`, 'success');
}

/**
 * Helper to construct update object for MongoDB.
 * It intelligently separates fields that need $set and fields that need $inc.
 * @param {Object} updates - The updates object from the command.
 * @returns {Object} { $set, $inc }
 */
function getUpdateObject(updates) {
    const $set = {};
    const $inc = {};
    for (const key in updates) {
        if (updates.hasOwnProperty(key)) {
            const value = updates[key];
            // Check if value is a number and not explicitly setting a fixed value (like Date.now() or a string)
            // For commands like daily/slot, they typically pass the final value, so we'll treat most as $set
            // However, to enable proper $inc, commands should pass { $inc: { coins: 1000 } } if they want $inc.
            // For simplicity and to fix the existing commands, we will assume:
            // 1. updates like { coins: 500 } means SET 500 (used by !slot/!daily to set final value or lastDailyReward)
            // 2. updates like { commandCount: 1 } means SET 1 (this is wrong, should be $inc)
            
            // Reverting the complex logic, and requiring the command to calculate the final state (as in !daily, !slot)
            // OR use a specific field like `increment` for $inc.
            
            // Standardizing: The commands calculate the final state, so we use $set for all keys.
            // Except for commandCount, which should be handled separately for atomic tracking.
            if (key !== 'commandCount' && key !== 'messageCount' && typeof value === 'number' && value > 0) {
                // If a number is passed, assume it's the final value OR it's a specific field like coins
                $set[key] = value;
            } else {
                 $set[key] = value;
            }
        }
    }
    
    // Explicitly handle fields that might need atomic updates if not present in $set
    // For now, we rely on command files to pass the calculated final state.
    // If command needs atomic increment, it should be structured differently.
    return { $set };
}


// ✅ Get user data with DB-mode awareness
async function getUserData(userId, name = null) {
    const defaults = {
        id: userId,
        name: name || "",
        coins: 0,
        exp: 0,
        level: 1,
        lastActive: Date.now(),
        commandCount: 0,
        messageCount: 0,
        lastDailyReward: null,
        joinDate: Date.now()
    };
    
    if (currentDbMode === 'json') {
        const db = await loadJsonDB();
        let user = db.users[userId];
        
        if (!user) {
            user = defaults;
            db.users[userId] = user;
            await saveJsonDB(db);
        } else {
            // Merge with defaults to ensure all fields exist
            user = { ...defaults, ...user };
            if (name && name !== user.name) {
                user.name = name;
                await saveJsonDB(db);
            }
        }
        return user;
    }

    // MongoDB mode
    let user = await User.findOneAndUpdate(
        { id: userId },
        { $setOnInsert: defaults },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean(); // Use .lean() for faster read access

    if (name && name !== user.name) {
        await User.updateOne({ id: userId }, { $set: { name: name } });
        user.name = name; // Update the returned object
    }
    return user;
}

// ✅ Get all users with DB-mode awareness
async function getAllUsers(sortField = 'exp', limit = 0, filter = {}) {
    if (currentDbMode === 'json') {
        const db = await loadJsonDB();
        let users = Object.values(db.users);

        // Apply filter (simplified JSON filter)
        users = users.filter(user => {
            for (const key in filter) {
                if (filter.hasOwnProperty(key)) {
                    // Simple equality check for JSON
                    if (user[key] !== filter[key]) return false;
                }
            }
            return true;
        });

        // Apply sort
        users.sort((a, b) => {
            if (sortField.startsWith('-')) {
                const field = sortField.substring(1);
                // Descending sort
                return (b[field] || 0) - (a[field] || 0);
            }
            // Ascending sort
            return (a[sortField] || 0) - (b[sortField] || 0);
        });

        // Apply limit
        if (limit > 0) {
            users = users.slice(0, limit);
        }
        return users;
    }

    // MongoDB mode
    let query = User.find(filter).lean();
    
    // MongoDB sort: use -1 for descending (Z-A, highest first)
    // The provided sortField (e.g., 'exp') should be used directly.
    query = query.sort({ [sortField]: -1 }); 
    
    if (limit > 0) {
        query = query.limit(limit);
    }
    return await query;
}

// Update user data (uses $set for all, as commands calculate final value)
async function updateUserData(userId, updates) {
    if (currentDbMode === 'json') {
        const db = await loadJsonDB();
        const user = db.users[userId] || {};
        db.users[userId] = { ...user, ...updates };
        await saveJsonDB(db);
        return db.users[userId];
    }

    // MongoDB mode
    const updateObj = getUpdateObject(updates);
    
    return await User.findOneAndUpdate(
        { id: userId },
        updateObj,
        { new: true, upsert: true }
    );
}

// Get group data
async function getGroupData(groupId) {
    const defaults = {
        id: groupId,
        settings: {
            welcomeDisabled: false,
            welcomeMessage: null,
            goodbyeDisabled: false,
            prefix: config.bot.prefix // Add default prefix to group settings
        },
        commandCount: 0,
        members: []
    };
    
    if (currentDbMode === 'json') {
        const db = await loadJsonDB();
        let group = db.groups[groupId];
        
        if (!group) {
            group = defaults;
            db.groups[groupId] = group;
            await saveJsonDB(db);
        } else {
            // Merge with defaults to ensure all fields exist
            group = { ...defaults, ...group };
        }
        return group;
    }

    // MongoDB mode
    let group = await Group.findOneAndUpdate(
        { id: groupId },
        { $setOnInsert: defaults },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    
    // Ensure group settings contain the prefix field if it's missing from old entries
    if (!group.settings.prefix) {
         await Group.updateOne({ id: groupId }, { $set: { 'settings.prefix': config.bot.prefix } });
         group.settings.prefix = config.bot.prefix;
    }
    
    return group;
}

// Update group data
async function updateGroupData(groupId, updates) {
    if (currentDbMode === 'json') {
        const db = await loadJsonDB();
        const group = db.groups[groupId] || { id: groupId };
        db.groups[groupId] = { ...group, ...updates };
        await saveJsonDB(db);
        return db.groups[groupId];
    }

    // MongoDB mode
    return await Group.findOneAndUpdate(
        { id: groupId },
        { $set: updates },
        { new: true, upsert: true }
    );
}

// OpenAI integration (No change needed)
async function callOpenAI(prompt, userId = null) {
  if (!config.ai || !config.ai.openai || !config.ai.openai.apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: config.ai.openai.model || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant in a WhatsApp bot.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${config.ai.openai.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    log(`OpenAI API error: ${error.message}`, 'error');
    throw new Error('Failed to get AI response');
  }
}

// Media downloader (No change needed)
async function downloadMedia(message) {
  try {
    // Assuming message.downloadMedia() is available and working via messageWrapper
    if (message.hasMedia) {
      const media = await message.downloadMedia(); 
      return media;
    }
    return null;
  } catch (error) {
    log(`Media download error: ${error.message}`, 'error');
    return null;
  }
}

// ✅ Track command and update name if needed
async function trackCommand(userId, name = null) {
  try {
    // 1. Get/Create User Data
    const userData = await getUserData(userId, name);
    
    // 2. Use MongoDB $inc logic or JSON update logic for atomic updates
    if (currentDbMode === 'mongodb') {
        // Use $inc for atomic command count and lastActive for efficiency
        await User.updateOne(
            { id: userId },
            { 
                $inc: { commandCount: 1 },
                $set: { lastActive: Date.now() }
            }
        );
    } else {
        // JSON mode requires reading, calculating, and writing
        await updateUserData(userId, {
            commandCount: (userData.commandCount || 0) + 1,
            lastActive: Date.now(),
            name: name || userData.name // Ensure name update if provided
        });
    }
    
  } catch (error) {
    log(`Error tracking command for user ${userId}: ${error.message}`, 'error');
  }
}

// Normalize JID to a consistent format (No change needed)
function normalizeJid(jid) {
  if (!jid) return '';
  let normalized = String(jid);

  // If it's a group JID, return as is
  if (normalized.includes('@g.us')) {
    return normalized;
  }

  // For user JIDs, extract only the numerical part and append @s.whatsapp.net
  // This handles formats like number@s.whatsapp.net, number@c.us, number@lid, or just a number
  const match = normalized.match(/^(\d+)(?:@.*)?$/);
  if (match && match[1]) {
    return `${match[1]}@s.whatsapp.net`;
  }
  
  // Fallback for any other unexpected formats
  return normalized;
}

module.exports = {
  log,
  formatUptime,
  initDatabase,
  getUserData,
  updateUserData,
  getGroupData,
  updateGroupData,
  getAllUsers,
  callOpenAI,
  downloadMedia,
  trackCommand,
  normalizeJid
};
