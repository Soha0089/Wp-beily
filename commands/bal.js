// bal.js (FIXED)

const { getUserData, normalizeJid } = require("../scripts/helpers");

module.exports = {
  config: {
    name: "balance",
    aliases: ["bal", "wallet", "money", "cash"],
    version: "1.5",
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
    const rawMentionIds = message.mentionedIds || [];
    const chatID = message.from;

    if (rawMentionIds.length) {
      const results = await Promise.all(rawMentionIds.map(async id => {
        // IDs from message.mentionedIds are usually already normalized (e.g., number@s.whatsapp.net in Baileys context)
        // Re-normalize just to be safe with the helper function
        const normalizedId = normalizeJid(id); 
        const data = await getUserData(normalizedId);
        const coins = data?.coins || 0;
        let name = data.name || normalizedId.split("@")[0]; // Use DB name first

        // Try to get a better name using the client/compat layer
        try {
          if (client && typeof client.getContactInfo === 'function') { // Assuming getContactInfo exists on the compat layer
            const contact = await client.getContactInfo(normalizedId);
            name = contact.name || contact.pushname || name;
          }
        } catch (e) {
          // Silent error for name fetching
        }

        return getLang("moneyOf").replace("%1", name).replace("%2", coins.toLocaleString());
      }));

      return message.reply(results.join("\n"));
    }

    // Default to the message sender
    const uid = normalizeJid(message.sender); // Use message.sender (participant or remoteJid)
    const data = await getUserData(uid);
    const coins = data?.coins || 0;
    
    return message.reply(getLang("money").replace("%1", coins.toLocaleString()));
  }
};
