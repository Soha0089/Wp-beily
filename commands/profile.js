const { MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');

module.exports = {
    config: {
        name: "profile",
        aliases: ["pp", "pfp"],
        version: "1.3", // Updated version
        author: "Rahaman Leon + Fixes",
        coolDown: 5,
        role: 0,
        description: "Get profile picture or default avatar",
        category: "utility",
        guide: {
            en: "{prefix}profile - Your profile pic\n{prefix}profile @mention - Mentioned user\n{prefix}profile reply - Replied user"
        }
    },

    onStart: async function ({ message, client }) {
        try {
            // 1. Resolve Target ID
            const userId = await resolveTargetId(message);
            
            // 2. Get User Name
            const userName = await getUserName(client, userId);
            
            // 3. Get Profile Picture URL
            const picUrl = await client.getProfilePicUrl(userId).catch(() => null);

            // 4. Get Media and Caption (using either actual PP or default avatar)
            const { media, caption } = picUrl
                ? await getProfileMedia(picUrl, userName)
                : await getDefaultMedia(userId, userName);

            // 5. Determine Quoted Message ID for Reply context
            let quotedId = message.id._serialized;
            if (message.hasQuotedMsg) {
                const quotedMsg = await message.getQuotedMessage();
                quotedId = quotedMsg.id._serialized;
            }

            // 6. Send the Media
            // Sending MessageMedia object with options
            await client.sendMessage(message.from, media, {
                caption: caption,
                quotedMessageId: quotedId
            });

        } catch (err) {
            console.error("Profile command error:", err);
            await message.reply("❌ Failed to get profile picture.");
        }
    }
};

/**
 * Determines the target user ID based on message context.
 * Uses message.sender for the command issuer's ID.
 */
async function resolveTargetId(message) {
    if (message.hasQuotedMsg) {
        const quoted = await message.getQuotedMessage();
        // Use author/participant ID for quoted message
        return quoted.author || quoted.from; 
    }
    if (message.mentionedIds?.length > 0) {
        // message.mentionedIds should contain normalized JIDs
        return message.mentionedIds[0];
    }
    // Default to the sender of the command
    return message.sender; // Changed from message.author
}

/**
 * Fetches user's display name.
 */
async function getUserName(client, id) {
    try {
        const contact = await client.getContactById(id);
        // Use pushname, then name, then number, then JID part
        return contact.pushname || contact.name || contact.number || id.split('@')[0] || "User";
    } catch {
        return id.split('@')[0] || "User";
    }
}

/**
 * Creates MessageMedia for an actual profile picture.
 */
async function getProfileMedia(url, name) {
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(res.data);
    const media = new MessageMedia('image/jpeg', buffer.toString('base64'), 'profile.jpg');
    const caption = `>🎀 *${name}*\n𝐇𝐞𝐫𝐞'𝐬 𝐲𝐨𝐮𝐫 𝐩𝐫𝐨𝐟𝐢𝐥𝐞 <😘`;
    return { media, caption };
}

/**
 * Creates MessageMedia for a generated default avatar.
 */
async function getDefaultMedia(userId, name) {
    // DiceBear uses the seed to generate the avatar.
    const seed = encodeURIComponent(userId.split('@')[0]);
    const avatarUrl = `https://api.dicebear.com/7.x/initials/png?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc&textColor=ffffff`;

    const res = await axios.get(avatarUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(res.data);
    const media = new MessageMedia('image/png', buffer.toString('base64'), 'default_avatar.png');
    const caption = `👤 *${name} has no profile picture*\n🔄 Showing default avatar`;
    return { media, caption };
}
