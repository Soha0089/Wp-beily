// send.js (FIXED)

const { getUserData, updateUserData, log, normalizeJid } = require('../scripts/helpers');
// Make sure normalizeJid is available in helpers.js

module.exports = {
  config: {
    name: "send",
    version: "1.8", // Updated version
    author: "MahMUD + Fixes",
    role: 0,
    shortDescription: { en: "Send coins to another user" },
    longDescription: { en: "Send coins to another user using UID, mention, or by replying. The amount is at the end." },
    category: "economy",
  },
  langs: {
    en: {
      invalid_amount: "❎ Please specify a valid amount of money to send.",
      not_enough_coins: "❎ You don't have enough money to send.",
      invalid_user: "❎ The specified user is invalid or not found.",
      transfer_success: "✅ | Successfully sent {amount} coins to {recipient}.",
      transfer_fail: "❌ | Failed to send money. Please check the user and try again.",
      self_transfer: "❎ You cannot send coins to yourself.",
      invalid_command: "❎ Invalid command. Example: !send money @mention 100",
      no_user: "❎ Please provide a user by mentioning, or entering their UID."
    },
  },

  formatCoins(num) {
    const units = ["", "K", "M", "B", "T"];
    let unit = 0;
    while (num >= 1000 && unit < units.length - 1) {
      num /= 1000;
      unit++;
    }
    return Number(num.toFixed(1)) + units[unit];
  },

  onStart: async function ({ args, message, getLang }) {
    // Normalize the sender ID immediately
    const senderID = normalizeJid(message.sender); 
    const mentionIds = message.mentionedIds || [];
    let recipientID, amount;

    // 1. Validate Command Structure and Keyword
    let commandArg = args[0]?.toLowerCase();
    if (commandArg === "-m") commandArg = "money";
    
    // Check if the command structure is correct (e.g., !send money ...)
    if (commandArg !== "money" || args.length < 2) {
        return message.reply(getLang("invalid_command"));
    }
    
    // 2. Determine Amount (last argument)
    amount = parseInt(args[args.length - 1]);
    if (isNaN(amount) || amount <= 0) return message.reply(getLang("invalid_amount"));
    
    // 3. Determine Recipient ID
    
    // The arguments array should look like [money, recipient, ..., amount]
    const recipientArg = args.length > 2 ? args[1] : null;

    if (message.hasQuotedMsg) {
      // Reply: message.quotedMsg.author is the safest for participant ID
      const quotedMsg = await message.getQuotedMessage();
      recipientID = normalizeJid(quotedMsg.author || quotedMsg.from);
      
    } else if (mentionIds.length > 0) {
      // Mention: IDs are assumed to be normalized JIDs from the wrapper
      recipientID = normalizeJid(mentionIds[0]);
      
    } else if (recipientArg) {
      // Explicit UID/JID (e.g., !send money 88017xxxxxx@s.whatsapp.net 100)
      recipientID = normalizeJid(recipientArg); 
      
    } else {
      return message.reply(getLang("no_user"));
    }

    if (!recipientID) return message.reply(getLang("no_user"));
    if (recipientID === senderID) return message.reply(getLang("self_transfer"));

    try {
      // Fetch data for both users concurrently
      const [senderData, recipientData] = await Promise.all([
        getUserData(senderID),
        getUserData(recipientID)
      ]);

      if (!recipientData) {
          // If recipientData is null/undefined, it means the user might not exist in the DB.
          // In most frameworks, getUserData creates the user if they don't exist.
          // If your getUserData doesn't auto-create, you might need to check if the ID is valid first.
          // Assuming here that the user is considered 'invalid' if getUserData returns null.
          return message.reply(getLang("invalid_user"));
      }

      const senderBalance = senderData?.coins || 0;
      if (amount > senderBalance) return message.reply(getLang("not_enough_coins"));

      // ------------------ Update Coins ------------------
      // Use helper functions to update balances
      await updateUserData(senderID, { coins: senderBalance - amount });
      await updateUserData(recipientID, { coins: (recipientData.coins || 0) + amount });

      const formattedAmount = this.formatCoins(amount);
      const recipientName = recipientData.name || recipientID.split("@")[0];

      log(`User ${senderID} sent ${amount} coins to ${recipientID}`, 'success');

      return message.reply(
        getLang("transfer_success")
          .replace("{amount}", formattedAmount)
          .replace("{recipient}", recipientName)
      );
    } catch (err) {
      log(`Send command error: ${err.message}`, 'error');
      // Use the language string for failure
      return message.reply(getLang("transfer_fail"));
    }
  },
};
