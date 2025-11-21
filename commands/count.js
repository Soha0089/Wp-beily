// count.js (FINAL FIX: Ensuring MongoDB update in onChat)

const mongoose = require("mongoose");
// Assume necessary helpers are available elsewhere
const log = console.log;

// --- MongoDB Connection & Schema (Unchanged Block) ---
if (!mongoose.connection.readyState) {
  mongoose.connect("mongodb+srv://mahmudabdullax7:ttnRAhj81JikbEw8@cluster0.zwknjau.mongodb.net/GoatBotV2?retryWrites=true&w=majority", {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => log("✅ MongoDB connected for count command"))
    .catch(err => console.error("❌ MongoDB connection error:", err));
}

const messageCountSchema = new mongoose.Schema({
  threadID: { type: String, required: true },
  userID: { type: String, required: true }, 
  name: { type: String, default: "" }, 
  count: { type: Number, default: 0 }
});

messageCountSchema.index({ threadID: 1, userID: 1 }, { unique: true });

const MessageCount = mongoose.models.MessageCount || mongoose.model("MessageCount", messageCountSchema);
// --- End DB Block ---

module.exports = {
  config: {
    name: "count",
    aliases: ["msgcount", "messages", "c"],
    version: "2.2", // Final fix version
    author: "MahMUD + Fixes",
    countDown: 5,
    role: 0,
    shortDescription: "Count user's messages in this group",
    longDescription: "Tracks how many messages each user sends in the current WhatsApp group",
    category: "group",
    guide: {
      en: "{pn} - Show your message count\n{pn} all - Show leaderboard"
    }
  },

  onStart: async function ({ message, args, contact }) {
    try {
      // Use message.from/message.sender to get JIDs
      const threadID = message.from; 
      const userID = message.sender;
      const userName = contact?.pushname || contact?.name || userID.split('@')[0];

      if (!threadID || !userID || !threadID.includes('@g.us')) {
         return message.reply("❌ This command works only in groups.");
      }

      if (args[0]?.toLowerCase() === "all") {
        // Leaderboard logic is correctly fetching sorted data
        const allUsers = await MessageCount.find({ threadID }).sort({ count: -1 }).limit(50);
        
        if (!allUsers.length)
          return message.reply("❌ No message data found for this group yet. Start chatting!");

        let msg = `📊 *Group Message Leaderboard*:\n━━━━━━━━━━━━━━━━━━━━━\n`;
        
        for (let i = 0; i < allUsers.length; i++) {
            const user = allUsers[i];
            const rank = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
            const name = user.name || user.userID.split('@')[0]; 
            msg += `${rank} ${name}\n   - Messages: ${user.count.toLocaleString()} msg\n`;
        }
        msg += "━━━━━━━━━━━━━━━━━━━━━";
        return message.reply(msg);
      }

      // Individual count check
      const userData = await MessageCount.findOne({ threadID, userID });
      
      const count = userData?.count || 0; // Safely get count

      if (count === 0)
        return message.reply(`❌ ${userName}, you have not sent any tracked messages in this group yet.`);

      return message.reply(`✅ ${userName}, you have sent ${count.toLocaleString()} messages in this group.`);
    } catch (err) {
      log("❌ count command error:", err.message);
      return message.reply("❌ An error occurred: " + err.message);
    }
  },

  onChat: async function ({ message, contact }) {
    try {
      // 1. Check if it's a valid message to track
      if (message.key.fromMe || !message.from.includes('@g.us')) return;

      const threadID = message.from;
      const userID = message.sender;
      const userName = contact?.pushname || contact?.name || "Unknown";

      if (!threadID || !userID) return;
      
      // 2. Optimized MongoDB Update/Create Operation
      // Use findOneAndUpdate with $inc for atomic increment and upsert
      await MessageCount.findOneAndUpdate(
        { threadID, userID },
        { 
          // Increment count by 1
          $inc: { count: 1 }, 
          // Always update the name (in case the user changed their pushname)
          $set: { name: userName }
        },
        { 
          upsert: true, // IMPORTANT: Create the document if it doesn't exist
          new: true,   // Return the updated document
          setDefaultsOnInsert: true // Apply default values on creation
        }
      );
      // After this runs successfully, the count for the user in that group is guaranteed to increase.

    } catch (err) {
      log("❌ Error updating message count in onChat:", err.message);
    }
  }
};
