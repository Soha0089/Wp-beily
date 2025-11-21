// daily.js (FIXED)

const moment = require("moment-timezone");
const { getUserData, updateUserData, log, normalizeJid } = require('../scripts/helpers');

module.exports = {
  config: {
    name: "daily",
    aliases: ["dailyreward", "checkin"],
    version: "1.6",
    author: "RL + Fixed by Mahmud",
    coolDown: 5,
    role: 0,
    description: "Receive daily gift rewards",
    category: "game",
    guide: {
      en: "{prefix}daily or {prefix}daily info"
    }
    // Added calculateLevel here for better encapsulation
  },

  rewardConfig: {
    coin: 1000,
    exp: 50
  },

  langs: {
    en: {
      alreadyReceived: "❌ You've already claimed today's reward!\n🕰️ Try again after 12:00 AM (BD time).",
      received: "🎁 *Daily Reward Claimed!*\n\n💰 Coins: +%1\n⭐ EXP: +%2\n\n💼 Total Coins: %3\n🏆 Total EXP: %4",
      rewardInfo: "📅 *Daily Reward Schedule*\n\n%1\n\n💡 Rewards increase by 20% each day!"
    }
  },
  
  // Moved calculation logic here for better scope access
  calculateLevel(exp) {
    // Level = floor(EXP / 100) + 1
    return Math.floor(exp / 100) + 1;
  },
  
  getDayName(i) {
    // i is 1-7, corresponding to Monday-Sunday
    return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i - 1];
  },

  onStart: async function ({ message, args }) {
    try {
      // Use message.sender which is the normalized ID from index.js messageWrapper
      const userId = normalizeJid(message.sender); 
      const reward = this.rewardConfig;
      const tz = "Asia/Dhaka";
      const now = moment.tz(tz);
      const today = now.format("YYYY-MM-DD");
      const dayIndex = now.isoWeekday(); // Monday=1, Sunday=7

      if (args[0] === "info") {
        let lines = "";
        for (let i = 1; i <= 7; i++) {
          // Use Math.round for rewards to avoid floating point issues in output
          const c = Math.round(reward.coin * Math.pow(1.2, i - 1));
          const e = Math.round(reward.exp * Math.pow(1.2, i - 1));
          lines += `📆 ${this.getDayName(i)}: ${c.toLocaleString()} coins, ${e.toLocaleString()} exp\n`;
        }
        return message.reply(this.langs.en.rewardInfo.replace("%1", lines));
      }

      let user = await getUserData(userId);

      // Check if reward was claimed today
      if (user.lastDailyReward === today) {
        return message.reply(this.langs.en.alreadyReceived);
      }

      // Calculate today's reward
      const getCoin = Math.round(reward.coin * Math.pow(1.2, dayIndex - 1));
      const getExp = Math.round(reward.exp * Math.pow(1.2, dayIndex - 1));

      // Calculate new totals
      const newCoins = (user.coins || 0) + getCoin;
      const newExp = (user.exp || 0) + getExp;
      
      const updatedUser = {
        coins: newCoins, // Final value for MongoDB $set
        exp: newExp,     // Final value for MongoDB $set
        level: this.calculateLevel(newExp),
        lastDailyReward: today, 
        lastActive: Date.now()
      };

      // Save updated data
      user = await updateUserData(userId, updatedUser);

      // Prepare reply message (using toLocaleString for better numbers)
      const msg = this.langs.en.received
        .replace("%1", getCoin.toLocaleString())
        .replace("%2", getExp.toLocaleString())
        .replace("%3", user.coins.toLocaleString())
        .replace("%4", user.exp.toLocaleString());

      await message.reply(msg);
      log(`✅ ${userId} claimed daily: +${getCoin} coins, +${getExp} exp`, 'success');
    } catch (error) {
      log(`Error in ${this.config.name}: ${error.message}`, 'error');
      await message.reply('❌ An error occurred while executing this command.');
    }
  }
};
