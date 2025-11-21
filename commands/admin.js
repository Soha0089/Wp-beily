// admin.js (FIXED - ID Handling and Logging)

const fs = require('fs-extra');
const path = require('path');
const { log, normalizeJid } = require('../scripts/helpers');

module.exports = {
    config: {
        name: "admin",
        aliases: [""],
        version: "1.0",
        author: "XXR3XX",
        coolDown: 5,
        role: 2, // Only Bot Owner can use this command
        description: "Add, remove, or list bot admin roles (works in groups)",
        category: "owner",
        guide: {
            en: "{prefix}admin add <@tag|reply> - Add bot admin\n" +
                "{prefix}admin remove <@tag|reply> - Remove bot admin\n" +
                "{prefix}admin list - List all bot admins\n" +
                "{prefix}admin check <@tag|reply> - Check if user is bot admin"
        }
    },

    onStart: async function ({ message, args, client, config, contact }) {
        const configPath = path.join(__dirname, '..', 'config.json');

        async function getTargetUserIds() {
            const ids = new Set();
            const senderID = normalizeJid(message.sender);

            // 1. Quoted Message
            if (message.hasQuotedMsg) {
                try {
                    const quotedMsg = await message.getQuotedMessage();
                    // Use quotedMsg.author (if participant in group) or quotedMsg.from (if direct message)
                    const authorId = quotedMsg.author || quotedMsg.from;
                    if (authorId) ids.add(normalizeJid(authorId));
                } catch (error) {
                    log(`Error getting quoted message: ${error.message}`, 'warning');
                }
            }

            // 2. Mentions
            // message.mentionedIds should contain normalized JIDs (e.g., number@s.whatsapp.net)
            if (message.mentionedIds && message.mentionedIds.length > 0) {
                 message.mentionedIds.forEach(id => {
                    ids.add(normalizeJid(id));
                 });
            }
            
            // 3. Phone Number/JID argument
            if (ids.size === 0 && args.length > 1) {
                const targetArg = args[1];
                // Check if argument looks like a number (phone or JID)
                if (targetArg) {
                    // Remove non-digit chars, then normalize
                    const phoneArg = targetArg.replace(/[^\d]/g, '');
                    if (phoneArg.length >= 10) ids.add(normalizeJid(phoneArg));
                    // Or if it already looks like a full JID
                    else if (targetArg.includes('@s.whatsapp.net')) ids.add(normalizeJid(targetArg));
                }
            }

            return [...ids].filter(id => id && id !== senderID); // Filter out sender if they are mentioning themselves
        }

        async function getNames(idList) {
            return Promise.all(idList.map(async (id) => {
                try {
                    let name = id.split('@')[0];
                    if (client && typeof client.getContactInfo === 'function') { // Use getContactInfo for compatibility
                        try {
                            const c = await client.getContactInfo(id);
                            name = c.name || c.pushname || name;
                        } catch {}
                    }
                    return `• ${name} (${id.split('@')[0]})`; // Show name and shortened JID
                } catch {
                    return `• ${id.split('@')[0]}`;
                }
            }));
        }

        async function addAdmins(ids) {
            // ... (Add/Remove logic is mostly fine, using normalizeJid) ...
            const added = [], already = [], invalid = [];
            const currentAdminBots = config.adminBot.map(normalizeJid);

            for (const id of ids) {
                const normalizedId = normalizeJid(id);
                // Basic validation
                if (!normalizedId || !normalizedId.includes('@s.whatsapp.net')) {
                    invalid.push(id);
                    continue;
                }
                
                if (currentAdminBots.includes(normalizedId)) already.push(id);
                else {
                    config.adminBot.push(normalizedId);
                    added.push(id);
                }
            }

            if (added.length > 0 || invalid.length === 0) {
                await fs.writeJSON(configPath, config, { spaces: 2 });
            }

            const res = [];
            if (added.length) {
                const names = await getNames(added);
                res.push(`✅ Added ${added.length} admin(s):\n${names.join('\n')}`);
            }
            if (already.length) {
                const names = await getNames(already);
                res.push(`⚠️ Already admin(s):\n${names.join('\n')}`);
            }
            if (invalid.length) res.push(`❌ Invalid ID(s) skipped: ${invalid.join(', ')}`);
            return res.join('\n\n') || "No changes made.";
        }

        async function removeAdmins(ids) {
            // ... (Remove logic is mostly fine) ...
            const removed = [], notAdmin = [], protected = [];
            let updatedAdminBot = [...config.adminBot];
            const currentUser = normalizeJid(message.sender); // Use message.sender

            for (const id of ids) {
                const normalizedIdToRemove = normalizeJid(id);
                
                if (normalizedIdToRemove === currentUser) {
                    protected.push(id);
                    continue;
                }

                const initialLength = updatedAdminBot.length;
                updatedAdminBot = updatedAdminBot.filter(adminId => normalizeJid(adminId) !== normalizedIdToRemove);

                if (updatedAdminBot.length < initialLength) removed.push(id);
                else notAdmin.push(id);
            }

            config.adminBot = updatedAdminBot;

            if (removed.length > 0) {
                await fs.writeJSON(configPath, config, { spaces: 2 });
            }

            const res = [];
            if (removed.length) {
                const names = await getNames(removed);
                res.push(`✅ Removed ${removed.length} admin(s):\n${names.join('\n')}`);
            }
            if (notAdmin.length) {
                const names = await getNames(notAdmin);
                res.push(`⚠️ Not admin(s):\n${names.join('\n')}`);
            }
            if (protected.length) res.push(`❌ Cannot remove yourself from admin`);
            return res.join('\n\n') || "No changes made.";
        }

        async function checkAdmin(ids) {
            const results = [];
            const currentAdminBots = config.adminBot.map(normalizeJid);

            for (const id of ids) {
                const normalizedId = normalizeJid(id);
                const isAdmin = currentAdminBots.includes(normalizedId);
                const names = await getNames([id]);
                results.push(`${names[0]} - ${isAdmin ? '✅ Bot Admin' : '❌ Not Bot Admin'}`);
            }

            return `Admin Status Check:\n\n${results.join('\n')}`;
        }

        try {
            const action = (args[0] || "list").toLowerCase();

            switch (action) {
                // ... (Cases are unchanged) ...
                case "add":
                case "-a":
                case "promote": {
                    const ids = await getTargetUserIds();
                    if (!ids.length) return message.reply("Please tag someone, reply to their message, or provide a phone number to add as admin.");
                    const res = await addAdmins(ids);
                    return message.reply(res);
                }

                case "remove":
                case "-r":
                case "demote": {
                    const ids = await getTargetUserIds();
                    if (!ids.length) return message.reply("Please tag someone, reply to their message, or provide a phone number to remove from admin.");
                    const res = await removeAdmins(ids);
                    return message.reply(res);
                }

                case "check":
                case "status": {
                    const ids = await getTargetUserIds();
                    if (!ids.length) return message.reply("Please tag someone, reply to their message, or provide a phone number to check admin status.");
                    const res = await checkAdmin(ids);
                    return message.reply(res);
                }

                case "list":
                case "-l":
                case "all":
                default: {
                    if (!config.adminBot || !config.adminBot.length) return message.reply("No bot admins configured.");

                    const list = await getNames(config.adminBot);
                    const response = `Bot Admins (${list.length}):\n\n${list.join('\n')}`;

                    return message.reply(response);
                }
            }
        } catch (err) {
            log(`Error in admin command: ${err.message}`, 'error');
            return message.reply(`❌ Something went wrong while managing admins: ${err.message}`);
        }
    }
};
