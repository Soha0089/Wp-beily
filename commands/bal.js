const { getUserData, normalizeJid } = require("../scripts/helpers");

module.exports = {
  config: {
    name: "balance",
    aliases: ["bal", "wallet", "money", "cash"],
    version: "1.5", // Updated version
    author: "RL + Fixes",
    countDown: 5,
    role: 0,
    description: "Check your balance or a mentioned user's.",
    category: "economy",
    guide: {
      en: "{prefix}bal or {prefix}bal @mention"
    }
  },

  langs: {
    en: {
      money: "𝐁𝐚𝐛𝐲, 𝐘𝐨𝐮𝐫 𝐛𝐚𝐥𝐚𝐧𝐜𝐞: %1",
      moneyOf: "💰 %1 has %2 coins"
    }
  },

  onStart: async function ({ message, getLang, client }) {
    // Note: message.mentionedIds contains IDs in 'number@c.us' or 'number@g.us' format (from the client)
    const rawMentionIds = message.mentionedIds || [];

    if (rawMentionIds.length) {
      const results = await Promise.all(rawMentionIds.map(async id => {
        const normalizedId = normalizeJid(id); // Ensure consistent ID format
        const data = await getUserData(normalizedId);
        const coins = data?.coins || 0;
        let name = normalizedId.split("@")[0]; // Fallback name

        // Try to get a better name using the client (if available)
        try {
          if (client && typeof client.getContactById === 'function') {
            const c = await client.getContactById(normalizedId);
            name = c.name || c.pushname || name;
          }
        } catch (e) {
          // console.error("Error getting contact name:", e);
        }

        return getLang("moneyOf").replace("%1", name).replace("%2", coins.toLocaleString()); // Added toLocaleString for better formatting
      }));

      return message.reply(results.join("\n"));
    }

    // Default to the message sender
    const uid = normalizeJid(message.author); // Normalize sender's ID
    const data = await getUserData(uid);
    const coins = data?.coins || 0;
    
    // Added toLocaleString for better formatting
    return message.reply(getLang("money").replace("%1", coins.toLocaleString()));
  }
};
