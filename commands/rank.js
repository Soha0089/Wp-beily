// rank.js (FIXED)

const { getUserData, log, getAllUsers, normalizeJid } = require('../scripts/helpers');

// Helper function definition is safer outside module.exports if it's purely mathematical
function getXPForLevel(level) {
    // Formula: Level 1: 50, Level 2: 200, Level 3: 450, etc.
    return Math.floor(Math.pow(level, 2) * 50);
}

module.exports = {
  config: {
    name: "rank",
    aliases: ["level"],
    version: "1.8", // Updated version
    author: "MahMUD + Fixes",
    coolDown: 3,
    role: 0,
    description: "Check your current rank and XP",
    category: "info",
    guide: {
      en: "{prefix}rank - Check your rank\n{prefix}rank @user - Check someone else's rank\n{prefix}rank top - View top 10 leaderboard"
    }
  },

  onStart: async function ({ message, client, args, contact }) {
    try {
      if (args[0]?.toLowerCase() === 'top') {
        return await this.showLeaderboard(message, client);
      }

      // 1. Determine Target User ID
      let targetUserId = normalizeJid(message.sender); // message.sender is the most reliable ID in the messageWrapper
      let targetName = contact.name || contact.pushname || targetUserId.split('@')[0];

      if (message.hasQuotedMsg) {
        const quotedMsg = await message.getQuotedMessage();
        // Quoted message author ID needs to be normalized
        targetUserId = normalizeJid(quotedMsg.author || quotedMsg.from); 
      } else {
        const mentionedIds = message.mentionedIds || [];
        if (mentionedIds.length > 0) {
          // Mentioned ID needs to be normalized
          targetUserId = normalizeJid(mentionedIds[0]); 
        }
      }

      // 2. Get All Users and Target Data in parallel
      const [allUsers, targetUser] = await Promise.all([
          getAllUsers('exp', 0, {}), 
          getUserData(targetUserId)
      ]);
      
      if (!targetUser) {
          return message.reply(`❌ Could not find data for user: ${targetUserId.split('@')[0]}`);
      }

      // 3. Re-fetch Target Name (if not self and better name needed)
      if (targetUserId !== normalizeJid(message.sender)) {
          try {
            // Check if client.getContactInfo is available on the compat layer
            if (client && typeof client.getContactInfo === 'function') {
                const targetContact = await client.getContactInfo(targetUserId);
                targetName = targetContact.name || targetContact.pushname || targetUser.name || targetUserId.split('@')[0];
            } else {
                targetName = targetUser.name || targetUserId.split('@')[0];
            }
          } catch {
             targetName = targetUser.name || targetUserId.split('@')[0];
          }
      }

      // 4. Calculate Rank
      // getAllUsers sorts by 'exp' descending. Rank is index + 1
      const rank = allUsers.findIndex(u => u.id === targetUserId) + 1;

      // 5. Calculate XP Progress (using the local/exposed function)
      const xpForCurrent = getXPForLevel(targetUser.level);
      const xpForNext = getXPForLevel(targetUser.level + 1);
      
      const progress = Math.max(0, targetUser.exp - xpForCurrent);
      const needed = Math.max(0, xpForNext - targetUser.exp);
      const totalGap = xpForNext - xpForCurrent || 1; // Avoid division by zero

      const percent = Math.max(0, Math.min(progress / totalGap, 1));
      const filled = Math.floor(percent * 10);
      const bar = '░'.repeat(10).split('').fill('█', 0, filled).join('');

      const isOwn = targetUserId === normalizeJid(message.sender);
      const displayName = isOwn ? ">🎀 𝐁𝐚𝐛𝐲, 𝐲𝐨𝐮𝐫 𝐫𝐚𝐧𝐤" : `>🎀 ${targetName}, 𝐫𝐚𝐧𝐤`;

      const msg = `
${displayName}
━━━━━━━━━━━━━━━━━━━━━
• 𝐑𝐚𝐧𝐤: #${rank}${allUsers.length > 0 ? ` of ${allUsers.length}` : ''}
• 𝐋𝐞𝐯𝐞𝐥: ${targetUser.level}
• 𝐄𝐱𝐩: ${targetUser.exp.toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━
📊 𝐏𝐫𝐨𝐠𝐫𝐞𝐬𝐬 𝐭𝐨 𝐋𝐞𝐯𝐞𝐥: ${targetUser.level + 1}
${bar} ${Math.round(percent * 100)}%
⚡ 𝐄𝐱𝐩 𝐍𝐞𝐞𝐝𝐞𝐝: ${needed.toLocaleString()} 𝐄𝐱𝐩
      `.trim();

      await message.reply(msg);

    } catch (err) {
      log(`Rank error: ${err.message}`, 'error');
      await message.reply("❌ Error fetching rank info.");
    }
  },

  async showLeaderboard(message, client) {
    try {
      // getAllUsers('exp', 10, {}) is correct for fetching top 10 by exp
      const top = await getAllUsers('exp', 10, {}); 
      if (!top.length) return await message.reply("📊 No users on the leaderboard yet!");

      let text = "🏆 Top 10 Leaderboard\n━━━━━━━━━━━━━━━━━━━━━\n";

      for (let i = 0; i < top.length; i++) {
        const u = top[i];
        let name = u.name || u.id.split('@')[0]; // Use DB name first (if available)
        
        // Try to get a real-time name via client/compat
        try {
          if (client && typeof client.getContactInfo === 'function') {
            const c = await client.getContactInfo(u.id);
            name = c.name || c.pushname || name;
          }
        } catch {} // Silent fail for contact info

        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
        text += `${medal} ${name}\n   Level ${u.level} • ${u.exp.toLocaleString()} XP\n\n`;
      }

      text += "💡 Keep chatting to rank up!";
      await message.reply(text);
    } catch (err) {
      log(`Leaderboard error: ${err.message}`, 'error');
      await message.reply("❌ Failed to load leaderboard.");
    }
  },
  
  // Expose the helper function locally
  getXPForLevel: getXPForLevel,

  formatTimeAgo(ms) {
    const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return `${s}s ago`;
  }
};
