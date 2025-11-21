// count.js (FINAL FIXED VERSION - Using Group.js Model for Per-Group Count)

const { getGroupData, updateGroupData, getUserData, log, normalizeJid } = require('../scripts/helpers');

// Helper to safely get count from Map or Object structure (Handles MongoDB/JSON consistency)
function getCount(counts, userID) {
    if (!counts) return 0;
    if (typeof counts.get === 'function') { // Check if it's a Map (MongoDB)
        return counts.get(userID) || 0;
    }
    // Assume it's a plain object for JSON fallback
    return counts[userID] || 0;
}

// Helper to safely set count in Map or Object structure
function setCount(counts, userID, count) {
    if (!counts) {
        // Initialize as an Object for JSON fallback consistency if null/undefined
        counts = {}; 
    }
    
    if (typeof counts.set === 'function') { // Check if it's a Map (MongoDB)
        counts.set(userID, count);
        return counts;
    }
    // Assume it's a plain object for JSON fallback
    counts[userID] = count;
    return counts;
}

module.exports = {
  config: {
    name: "count",
    aliases: ["msgcount", "messages", "c"],
    version: "1.9.1", 
    author: "MahMUD + Fixes",
    countDown: 5,
    role: 0,
    shortDescription: "Count user's messages in this group",
    longDescription: "Tracks how many messages each user sends in the current group",
    category: "group",
    guide: {
      en: "{pn} - Show your message count in this group\n{pn} all - Show leaderboard for this group"
    }
  },

  onStart: async function ({ message, args, contact }) {
    try {
      const groupID = normalizeJid(message.from); 
      const userID = normalizeJid(message.sender); 
      const userName = contact?.pushname || contact?.name || "Your"; 

      // Command is strictly for groups
      if (!groupID || !groupID.includes('@g.us')) {
          return message.reply("❌ This command works only in groups.");
      }

      // 1. Get Group Data
      const groupData = await getGroupData(groupID);
      
      // 2. Safely get the user's count in this group
      const userMessageCount = getCount(groupData.messageCounts, userID);

      if (args[0]?.toLowerCase() === "all") {
        // --- LEADERBOARD LOGIC (Per-Group) ---
        
        const counts = groupData.messageCounts || {};
        let topUsers = [];
        
        // Convert counts (Map or Object) to an array for sorting
        const entries = typeof counts.entries === 'function' ? counts.entries() : Object.entries(counts);

        topUsers = Array.from(entries)
          .map(([id, count]) => ({ id, count }))
          .filter(u => u.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 50); 
        
        if (!topUsers.length)
          return message.reply("❌ No message data found for any user in this group yet.");

        let msg = `📊 *Message Leaderboard* (${groupID.split('@')[0]}):\n━━━━━━━━━━━━━━━━━━━━━\n`;
        
        for (let i = 0; i < topUsers.length; i++) {
          const user = topUsers[i];
          const rank = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
          
          // Fetch User model data only for name (optional, but good for display)
          const fullUserData = await getUserData(user.id);
          const name = fullUserData?.name || user.id.split('@')[0]; 
          
          msg += `${rank} ${name}\n   - Messages: ${user.count.toLocaleString()}\n`;
        }
        
        msg += "━━━━━━━━━━━━━━━━━━━━━\n💡 Keep messaging to rank up!";
        return message.reply(msg);
      }

      // --- INDIVIDUAL COUNT LOGIC ---
      if (userMessageCount === 0)
        return message.reply(`❌ ${userName}, you have not sent any tracked messages in this group yet.`);

      return message.reply(`✅ ${userName}, you have sent ${userMessageCount.toLocaleString()} messages in this group.`);
    } catch (err) {
      log(`Count command error: ${err.message}`, 'error');
      return message.reply("❌ An error occurred while fetching message count.");
    }
  },

  onChat: async function ({ message, contact }) {
    try {
      // Don't track bot's own messages or messages outside groups
      if (message.key.fromMe || !message.from.includes('@g.us')) return; 
      
      const groupID = normalizeJid(message.from);
      const userID = normalizeJid(message.sender);
      const userName = contact?.pushname || contact?.name || "Unknown";
      
      if (!groupID || !userID) return;

      // 1. Get Group Data (will ensure group document exists)
      const groupData = await getGroupData(groupID);
      
      // 2. Safely get current count and update
      const currentCount = getCount(groupData.messageCounts, userID);
      
      // Update the Map/Object value
      const updatedCounts = setCount(groupData.messageCounts, userID, currentCount + 1);
      
      // 3. Update the Group document with the new counts Map/Object
      await updateGroupData(groupID, {
        messageCounts: updatedCounts
      });
      
      // Recommended: Update User model only for name/last active time
      await updateUserData(userID, { name: userName, lastActive: Date.now() }); 

    } catch (err) {
      log(`Error updating per-group message count: ${err.message}`, 'error');
    }
  }
};
