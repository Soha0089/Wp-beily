// top.js (FIXED: Fetching Live PushName from WhatsApp)

const { log, getAllUsers, normalizeJid } = require('../scripts/helpers');
// normalizeJid কে helpers থেকে আমদানি করা হয়েছে

module.exports = {
  config: {
    name: "top",
    version: "1.8", // ভার্সন আপডেট করা হলো
    author: "MahMUD",
    role: 0,
    category: "economy",
    guide: {
      en: "Use `{pn}` or `{pn} bal` to view richest users, `{pn} exp` to view top EXP users"
    }
  },

  // client, chat অবজেক্টগুলো প্রয়োজন হবে WhatsApp API কল করার জন্য
  onStart: async function({ message, args, client, chat }) { 
    try {
      const type = (args[0] || "bal").toLowerCase();

      let users;
      // ... (Rest of user fetching logic remains same) ...
      if (type === "exp") {
        users = await getAllUsers('-exp', 15, { exp: { $gt: 0 } });
        if (!users.length) return message.reply("No users with EXP to display.");
      } else {
        users = await getAllUsers('-coins', 15, { coins: { $gt: 0 } });
        if (!users.length) return message.reply("No users with money to display.");
      }

      const medals = ["🥇", "🥈", "🥉"];

      // WhatsApp থেকে লাইভ নাম ফেচ করার জন্য Promise.all ব্যবহার করা হলো
      const topList = await Promise.all(users.map(async (user, i) => {
        const rank = i < 3 ? medals[i] : `${i + 1}.`;

        const userID = user.id || user.userID || "Unknown";
        
        // **********************************************
        // মূল পরিবর্তন: WhatsApp API ব্যবহার করে লাইভ নাম ফেচ করা
        // **********************************************
        let userName = String(userID); // Default to ID if name fetching fails

        try {
            // JID কে সঠিক WhatsApp ফরম্যাটে (যেমন: 12345678901@s.whatsapp.net) রূপান্তর করা
            const jid = normalizeJid(userID); 
            
            // client.getContactById() আপনার WhatsApp লাইব্রেরির উপর নির্ভর করে
            // whatsapp-web.js এ client.getContactById() বা client.getContact() ব্যবহার করা হয়
            // ধরে নিচ্ছি 'client' অবজেক্টে এই মেথডটি আছে এবং এটি একটি Contact অবজেক্ট রিটার্ন করে।
            const contact = await client.getContact(jid); 

            // WhatsApp Profile Name (PushName) বা Saved Name ব্যবহার করা
            // pushname হলো বর্তমান প্রোফাইল নাম যা ইউজার সেট করে
            if (contact && contact.pushname) {
                userName = contact.pushname; 
            } else if (user.name) {
                // যদি WhatsApp থেকে নাম না পাওয়া যায়, তবে ডেটাবেসের সেভ করা নাম ব্যবহার করা
                userName = user.name;
            }
        } catch (e) {
            log(`Failed to fetch live name for ${userID}: ${e.message}`, "warning");
            // যদি WhatsApp API কল ফেল করে, ডেটাবেসে সেভ করা নাম ব্যবহার করা
            userName = user.name || String(userID);
        }

        return type === "exp"
          ? `${rank} ${userName}: ${formatNumber(user.exp || 0)} EXP`
          : `${rank} ${userName}: ${formatNumber(user.coins || 0)}$`;
      }));

      const title = type === "exp"
        ? "👑 TOP 15 EXP USERS:"
        : "👑 | Top 15 Richest Users:";

      return message.reply(`${title}\n\n${topList.join("\n")}`);

    } catch (error) {
      log(`Top command error: ${error.message}`, "error");
      return message.reply("❌ An error occurred while fetching leaderboard.");
    }
  }
};

function formatNumber(num) {
  // ... (formatNumber function is unchanged) ...
  const units = ["", "K", "M", "B", "T", "Q", "Qi", "Sx", "Sp", "Oc", "N", "D"];
  let unit = 0;
  while (num >= 1000 && unit < units.length - 1) {
    num /= 1000;
    unit++;
  }
  return Number(num.toFixed(1)) + units[unit];
}
