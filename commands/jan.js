const axios = require("axios");

const baseApiUrl = async () => {
  const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/exe/main/baseApiUrl.json");
  return base.data.jan;
};

const getBotResponse = async (msg) => {
  try {
    const base = await baseApiUrl();
    const res = await axios.get(`${base}/jan/font3/${encodeURIComponent(msg)}`);
    return res.data?.message || "❌ Try again.";
  } catch (err) {
    console.error("API Error:", err.message || err);
    return "❌ Error occurred, janu 🥲";
  }
};

module.exports = {
  config: {
    name: "bot",
    version: "1.7",
    author: "MahMUD",
    role: 0,
    coolDown: 3,
    shortDescription: "Talk with jan",
    longDescription: "Text-based response using jan AI",
    category: "ai",
    guide: "Just type jan or jan <message>, or reply jan message"
  },

  onStart: async () => {},

  onChat: async function ({ message, client }) {
    try {
      const body = (message.body || "").toLowerCase().trim();
      const triggers = ["jan", "jaan", "জান", "hinata", "bby", "baby"];
      
      let query = "";
      let isReplyToBot = false;
      let hasTriggerWord = false;

      // Check 1: Is the user replying to a message sent by this bot?
      if (message.quotedMsg && message.quotedMsg.fromMe) {
          isReplyToBot = true;
      }

      // Check 2: Does the message body start with a trigger word?
      const words = body.split(/\s+/);
      for (const t of triggers) {
          if (body.startsWith(t) && (body.length === t.length || body.charAt(t.length).match(/\s/))) {
              hasTriggerWord = true;
              // Extract the query by removing the trigger word
              query = body.substring(t.length).trim();
              break; 
          }
      }

      // -----------------------------------------
      // ✅ Core Logic: Respond if triggered or if replying to the bot
      // -----------------------------------------
      if (hasTriggerWord || isReplyToBot) {
          
          let responseQuery = "";

          if (hasTriggerWord) {
              // Use the query extracted after the trigger word
              responseQuery = query;
          } else if (isReplyToBot) {
              // If only replying to the bot (without a trigger word), use the full body
              responseQuery = body;
          }
          
          // -----------------------------------------
          // ✅ Random Reply Logic (if query is empty or just a trigger word)
          // -----------------------------------------
          if (responseQuery === "") {
            const replies = [
              "babu khuda lagse🥺",
              "Hop beda😾,Boss বল boss😼",
              "আমাকে ডাকলে ,আমি কিন্তূ কিস করে দেবো😘",
              "naw message daw m.me/mahmud.x07",
              "mb ney bye bby😘",
              "মিউ মিউ 🐱",
              "বলো কি বলবা? 🤭",
              "𝗜 𝗹𝗼𝘃𝗲 𝘆𝗼𝘂__😘😘",
              "𝗜 𝗵𝗮𝘁𝗲 𝘆𝗼𝘂__😏😏",
              "গোসল করে আসো যাও😑😩",
              "অ্যাসলামওয়ালিকুম",
              "খাইসা আসো 😌",
              "আমি অন্যের জিনিসের সাথে কথা বলি না__😏",
              "𝗕𝗯𝘆 𝗻𝗮 𝗯𝗼𝗹𝗲 𝗕𝗼𝘄 বলো 😘",
              "Meow🐤",
              "বার বার ডাকলে মাথা গরম হয় 😑",
              "ওই তুমি single না?😒",
              "বলো জানু 😒",
              "হটাৎ আমাকে মনে পড়লো? 🙄",
              "একটা BF খুঁজে দাও 😿"
            ];
            const randomIndex = Math.floor(Math.random() * replies.length);
            return client.sendMessage(message.from, { text: replies[randomIndex] }, { quoted: message });
          }

          // -----------------------------------------
          // ✅ API Response Logic
          // -----------------------------------------
          const replyText = await getBotResponse(responseQuery);
          return client.sendMessage(message.from, { text: replyText }, { quoted: message });
      }

    } catch (e) {
      console.error("Bot Chat Error:", e);
      return client.sendMessage(message.from, { text: "❌ Something went wrong." }, { quoted: message });
    }
  }
};
