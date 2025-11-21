// help.js (FIXED: Optimized Category Grouping)

module.exports = {
    config: {
        name: "help",
        aliases: ["h", "commands"],
        version: "1.2", // Updated version
        author: "Rahaman Leon + Optimization",
        coolDown: 5,
        role: 0, // Available to all users - THIS IS CORRECT
        description: "Show available commands",
        category: "utility",
        guide: {
            en: "Use {prefix}help to see all commands or {prefix}help <command> for specific command info"
        }
    },

    onStart: async function ({ message, args, prefix }) {
        try {
            const commandMap = global.DoraBot.commands;
            if (!commandMap || commandMap.size === 0) {
                return await message.reply("❌ No commands available.");
            }

            // --- 1. Specific Command Help ---
            if (args.length > 0) {
                const commandName = args[0].toLowerCase();
                const command = commandMap.get(commandName);
                
                if (!command) {
                    return await message.reply(`❌ Command "${commandName}" not found.`);
                }

                const description = command.config.description?.en || command.config.description || 'No description available';
                const guide = command.config.guide?.en || `{prefix}${command.config.name}`;
                
                // Format the usage guide with the actual prefix
                const formattedGuide = guide.replace(/{prefix}/g, prefix);

                const helpText = [
                    `╭─────⭓ 𝐂𝐎𝐌𝐌𝐀𝐍𝐃 𝐈𝐍𝐅𝐎`,
                    `│✧Name: ${command.config.name}`,
                    `│✧Aliases: ${command.config.aliases?.join(', ') || 'None'}`,
                    `│✧Category: ${command.config.category || 'Other'}`,
                    `│✧Role Required: ${command.config.role || 0} (${['User', 'Admin', 'Owner'][command.config.role || 0]})`,
                    `│✧Cooldown: ${command.config.coolDown || 0}s`,
                    `│✧Author: ${command.config.author || 'Unknown'}`,
                    `│✧Description: ${description}`,
                    `│✧Usage Guide: ${formattedGuide}`,
                    `╰────────────⭓`
                ].join('\n');

                return await message.reply(helpText);
            }

            // --- 2. Full Command List (Grouped by Category) ---
            
            // 2.1 Filter for main command names and group by category
            const categories = {};
            
            for (const [commandKey, command] of commandMap.entries()) {
                // Ensure we only process the MAIN command entry (key must match config.name)
                // This avoids duplicating commands listed by their aliases.
                if (commandKey !== command.config.name.toLowerCase()) {
                    continue; 
                }

                const category = (command.config.category || 'Other').toUpperCase();
                if (!categories[category]) {
                    categories[category] = [];
                }
                categories[category].push(command.config.name);
            }

            // Helper function for chunking array (if needed, though standard list is often better)
            const chunkCommands = (cmdList, size = 6) => {
                const chunks = [];
                for (let i = 0; i < cmdList.length; i += size) {
                    chunks.push(cmdList.slice(i, i + size));
                }
                return chunks;
            };

            let helpText = '';
            const sortedCategories = Object.keys(categories).sort();

            for (const category of sortedCategories) {
                const cmds = categories[category].sort(); // Sort commands alphabetically within category
                helpText += `╭─────⭓ 𝐂𝐀𝐓𝐄𝐆𝐎𝐑𝐘: ${category}\n`;
                
                // Use chunking to format list neatly
                const chunks = chunkCommands(cmds, 5); // Using 5 commands per line for better view
                for (const chunk of chunks) {
                    helpText += `│✧${chunk.join(' ✧')}\n`;
                }
                helpText += '╰────────────⭓\n\n';
            }

            helpText += `⭔Type ${prefix}help <command> to learn usage.\n`;
            helpText += `⭔Type ${prefix}supportgc to join our bot support group`;

            await message.reply(helpText);

        } catch (error) {
            console.error("Help command error:", error);
            await message.reply("❌ An error occurred while showing help.");
        }
    }
};
