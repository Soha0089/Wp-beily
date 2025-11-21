// count.js (FIXED to use Per-Group Message Count)

const { getGroupData, updateGroupData, getUserData, log, normalizeJid } = require('../scripts/helpers');

module.exports = {
  config: {
    name: "count",
    aliases: ["msgcount", "messages", "c"],
    version: "1.9", // Updated version
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

  onStart: async function ({ message, args, chat, contact }) {
    try {
      // 1. Identify IDs (Use message.sender for user, message.from for group/chat)
      const groupID = normalizeJid(message.from); // Thread/Group ID
      const userID = normalizeJid(message.sender); 
      // Use pushname/name from contact object for display
      const userName = contact?.pushname || contact?.name || "Your"; 

      if (!groupID || !userID || groupID.endsWith('@s.whatsapp.net')) {
          // If it's a DM (not a group), show an error or fallback to User.js global count
          // For now, we assume this command is group-specific.
          return message.reply("❌ This command is only available in groups.");
      }

      // 2. Get Group Data
      const groupData = await getGroupData(groupID);
      const userMessageCount = groupData.messageCounts.get(userID) || 0;

      if (args[0]?.toLowerCase() === "all") {
        // --- LEADERBOARD LOGIC (Per-Group) ---
        
        const countsMap = groupData.messageCounts;
        
        // Convert Map to Array of {id, count} and sort by count descending
        const topUsers = Array.from(countsMap.entries())
          .map(([id, count]) => ({ id, count }))
          .filter(u => u.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 50); // Limit to top 50
        

        if (!topUsers.length)
          return message.reply("❌ No message data found for any user in this group yet.");

        let msg = `📊 *Message Leaderboard* (${groupData.name || groupID.split('@')[0]}):\n━━━━━━━━━━━━━━━━━━━━━\n`;
        
        for (let i = 0; i < topUsers.length; i++) {
          const user = topUsers[i];
          const rank = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
          
          // Get name from User model if possible (or fallback to JID)
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
      if (message.key.fromMe) return; 
      
      const groupID = normalizeJid(message.from);
      const userID = normalizeJid(message.sender);
      
      // Only track in groups
      if (!groupID || !userID || groupID.endsWith('@s.whatsapp.net')) return;

      // 1. Get Group Data (will create if non-existent)
      const groupData = await getGroupData(groupID);
      
      // 2. Get current count
      const currentCount = groupData.messageCounts.get(userID) || 0;
      
      // 3. Update the Map value
      groupData.messageCounts.set(userID, currentCount + 1);
      
      // 4. Update the Group document using the modified Map
      // Note: MongoDB $set handles Map updates efficiently.
      await updateGroupData(groupID, {
        messageCounts: groupData.messageCounts
      });
      
      // Also update the User model for name tracking (optional but recommended)
      const userName = contact?.pushname || contact?.name || "Unknown";
      await getUserData(userID, userName); 

    } catch (err) {
      log(`Error updating per-group message count: ${err.message}`, 'error');
    }
  }
};
