// Thread.js (FIXED - Settings structure)

const { getGroupData, updateGroupData, normalizeJid } = require('../scripts/helpers');

module.exports = {
  config: {
    name: "thread",
    aliases: ["group", "chat"],
    version: "1.0.4", // Updated version
    author: "@anbuinfosec",
    countDown: 5,
    role: 1, // Group Admin role required
    description: "Manage thread/group settings",
    category: "admin",
    guide: "{pn} [setting] [value]\n\nSettings:\n• welcome [on/off] - Toggle welcome messages\n• adminonly [on/off] - Toggle admin-only mode\n• info - Show thread information"
  },
  
  onStart: async function({ message, args, client, prefix, chat }) {
    try {
      // Use message.from for group ID (normalized in messageWrapper/helper)
      const threadId = normalizeJid(message.from); 
      
      if (!threadId || !threadId.includes('@g.us')) {
        return message.reply('❌ This command can only be used in groups.');
      }

      const group = await getGroupData(threadId);

      if (args.length === 0 || args[0].toLowerCase() === 'info') {
        // Assume group.settings is always available due to getGroupData
        const info = `📋 Thread Information\n\n` +
          `🆔 Group ID: ${threadId.split('@')[0]}\n` +
          `⚙️ Settings:\n` +
          `• Command Prefix: ${group.settings?.prefix || '!'}\n` + // Display prefix
          `• Welcome Disabled: ${group.settings?.welcomeDisabled ? '✅ On' : '❌ Off'}\n` +
          `• Goodbye Disabled: ${group.settings?.goodbyeDisabled ? '✅ On' : '❌ Off'}\n` +
          `• Admin Only Mode: ${group.settings?.adminOnly ? '✅ On' : '❌ Off'}\n` + // Display new setting
          `• Total Commands: ${group.commandCount || 0}`;
        return message.reply(info);
      }

      const setting = String(args[0] || '').toLowerCase();
      const value = String(args[1] || '').toLowerCase();
      if (!value) return message.reply("❌ Please provide a value (on/off) for the setting.");
      
      const isEnabled = value === 'on' || value === 'true' || value === '1';
      const isDisabled = value === 'off' || value === 'false' || value === '0';
      
      if (!isEnabled && !isDisabled) return message.reply("❌ Invalid value. Use 'on' or 'off'.");

      let updated = false;
      let updateObj = {};
      let settingPath = '';
      
      switch (setting) {
        case 'welcome':
          settingPath = 'settings.welcomeDisabled';
          updateObj[settingPath] = isDisabled; // If ON, disable is FALSE
          updated = true;
          break;
        case 'goodbye':
          settingPath = 'settings.goodbyeDisabled';
          updateObj[settingPath] = isDisabled;
          updated = true;
          break;
        case 'prefix':
            if (!args[1]) return message.reply("❌ Please provide the new prefix.");
            settingPath = 'settings.prefix';
            updateObj[settingPath] = args[1].trim(); // Take the prefix as is
            updated = true;
            break;
        case 'adminonly':
          settingPath = 'settings.adminOnly';
          updateObj[settingPath] = isEnabled;
          updated = true;
          break;
        default:
          return message.reply("❌ Invalid setting. Available: welcome, goodbye, adminonly, prefix");
      }

      if (updated) {
        // Use the proper MongoDB $set structure (e.g., { 'settings.welcomeDisabled': true })
        await updateGroupData(threadId, updateObj);
        
        const displayValue = setting === 'prefix' ? updateObj[settingPath] : (isEnabled ? 'On' : 'Off');
        return message.reply(`✅ Updated setting '${setting}' to ${displayValue}.`);
      }
    } catch (error) {
      log(`Error in thread command: ${error.message}`, 'error');
      return message.reply('❌ An error occurred while managing thread settings.');
    }
  }
};
