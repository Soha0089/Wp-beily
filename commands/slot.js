// slot.js (FIXED)

const { getUserData, updateUserData, normalizeJid } = require('../scripts/helpers');
const { log } = require('../scripts/helpers'); // Log for debugging

module.exports = {
  config: {
    name: "slot",
    version: "1.7",
    author: "MahMUD",
    countDown: 10,
    role: 0,
    description: "Play slot machine to win or lose coins.",
    category: "economy",
    guide: {
      en: "Usage: {prefix}slot <amount>"
    }
  },

  onStart: async function ({ message, args }) {
    // Use the sender ID provided by the message wrapper from index.js
    const senderID = normalizeJid(message.sender); 
    
    if (!senderID) {
        log("❌ Cannot determine sender ID in slot command.", 'error');
        return message.reply("❌ Cannot determine your ID. Please try again.");
    }

    const bet = parseInt(args[0]);
    if (isNaN(bet) || bet <= 0) {
      return message.reply("❌ Please enter a valid bet amount (a positive number).\nExample: {prefix}slot 100");
    }

    try {
      const userData = await getUserData(senderID);
      
      if (!userData) {
          log(`❌ User data not found for ${senderID}`, 'error');
          return message.reply("❌ User data not found.");
      }
      
      const currentCoins = userData.coins || 0;

      if (currentCoins < bet) {
        return message.reply(`❌ You don't have enough coins.\nBalance: ${currentCoins.toLocaleString()}`);
      }

      const symbols = ["❤", "💜", "💙", "💚", "💛", "🖤", "🤍", "🤎"];
      const result = [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
      ];

      let multiplier = -1; // Default to loss
      if (result[0] === result[1] && result[1] === result[2]) {
        multiplier = 10; // Triple match (Win x10)
      } else if (result[0] === result[1] || result[1] === result[2] || result[0] === result[2]) {
        multiplier = 2; // Double match (Win x2)
      } 
      
      const reward = bet * multiplier; // Can be negative for loss

      const updatedCoins = currentCoins + reward;
      
      // Update data: uses final calculated value, which is handled by $set in helpers.js
      await updateUserData(senderID, { coins: updatedCoins }); 

      const display = `>🎀\n• 𝐆𝐚𝐦𝐞 𝐑𝐞𝐬𝐮𝐥𝐭𝐬 [ ${result.join(" | ")} ]\n• 𝐁𝐚𝐛𝐲, 𝐘𝐨𝐮 ${reward >= 0 ? "𝐰𝐨𝐧" : "𝐥𝐨𝐬𝐭"} $${Math.abs(reward).toLocaleString()}\n• 𝐍𝐞𝐰 𝐁𝐚𝐥𝐚𝐧𝐜𝐞: ${updatedCoins.toLocaleString()}`;
      
      return message.reply(display);
    } catch (err) {
      log(`Slot error for ${senderID}: ${err.message}`, 'error');
      return message.reply("❌ Something went wrong while processing your slot game.");
    }
  }
};
