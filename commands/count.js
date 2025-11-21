// count.js (FIXED)

const { getUserData, updateUserData, log, getAllUsers, normalizeJid } = require('../scripts/helpers');

module.exports = {
  config: {
    name: "count",
    aliases: ["msgcount", "messages", "c"],
    version: "1.8", // Updated version
    author: "MahMUD + Fixes",
    countDown: 5,
    role: 0,
    shortDescription: "Count user's messages",
    longDescription: "Tracks how many messages each user sends",
    category: "group",
    guide: {
      en: "{pn} - Show your message count\n{pn} all - Show leaderboard (Top 50)"
    }
  },

  onStart: async function ({ message, args, chat, contact }) {
    try {
      // Use message.sender for the current user's ID
      const userID = normalizeJid(message.sender); 
      // Use pushname/name from contact object for display
      const userName = contact?.pushname || contact?.name || "Your"; 

      if (!userID) return message.reply("❌ Unable to identify your ID.");

      if (args[0]?.toLowerCase() === "all") {
        // --- LEADERBOARD LOGIC ---
        
        // Fetch top 50 users globally based on messageCount descending
        // Assuming 'messageCount' is a global user field.
        const topUsers = await getAllUsers('-messageCount', 50, { messageCount: { $gt: 0 } });
        // Note: getAllUsers uses '-field' for descending sort in MongoDB mode.

        if (!topUsers.length)
          return message.reply("❌ No message data found for any user on the leaderboard yet.");

        let msg = "📊 *Top Message Leaderboard* (Global):\n━━━━━━━━━━━━━━━━━━━━━\n";
        
        for (let i = 0; i < topUsers.length; i++) {
          const user = topUsers[i];
          const rank = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
          
          // Use user.name (fetched from DB) or fallback to JID
          const name = user.name || user.id.split('@')[0]; 
          
          msg += `${rank} ${name}\n   - Messages: ${user.messageCount.toLocaleString()}\n`;
        }
        
        msg += "━━━━━━━━━━━━━━━━━━━━━\n💡 Keep messaging to rank up!";

        return message.reply(msg);
      }

      // --- INDIVIDUAL COUNT LOGIC ---
      const userData = await getUserData(userID, userName); // Get user data (ensures creation if new)

      if (!userData || userData.messageCount === 0)
        return message.reply(`❌ ${userName}, you have not sent any tracked messages yet.`);

      return message.reply(`✅ ${userName}, you have sent ${userData.messageCount.toLocaleString()} messages.`);
    } catch (err) {
      log(`Count command error: ${err.message}`, 'error');
      return message.reply("❌ An error occurred while fetching message count.");
    }
  },

  onChat: async function ({ message, contact }) {
    // This runs for every message (handled in index.js)
    try {
      // Do not track messages sent by the bot itself
      if (message.key.fromMe) return; 
      
      const userID = normalizeJid(message.sender);
      const userName = contact?.pushname || contact?.name || "Unknown";
      
      if (!userID) return;

      // Optimally update messageCount and name in a single database operation.
      // We rely on updateUserData to handle the MongoDB $set or JSON read/update/write.
      // If you implement a helper for $inc, it should be used here for messageCount:
      
      // Since we don't have a dedicated $inc helper, we must first read the data (like the old code did)
      // or modify the helpers to support $inc for numbers.
      
      // ***Using the old read-then-update method for simplicity, as helpers.js currently supports only $set***
      
      // 1. Get user data to find the current count
      const userData = await getUserData(userID, userName);

      // 2. Calculate the new count and update
      const newCount = (userData.messageCount || 0) + 1;
      
      await updateUserData(userID, {
        messageCount: newCount, // Final calculated value
        name: userName, // Ensure name is updated if it changed
        lastActive: Date.now()
      });
      
    } catch (err) {
      // This is a background task, just log the error silently
      log(`Error updating message count in onChat: ${err.message}`, 'error');
    }
  }
};
