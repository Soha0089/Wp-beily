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

      const body = (message.body || "").trim();
      const lowerBody = body.toLowerCase();
      const triggers = ["jan","jaan","জান","hinata","bby","baby"];
      
      // --- 1. Identify Trigger Word ---
      let match = false;
      let triggerUsed = "";
      for (const t of triggers) {
        if (lowerBody.startsWith(t)) {
          // Check if the message is exactly the trigger, or the trigger followed by a space
          if (lowerBody.length === t.length || lowerBody.startsWith(t + " ")) {
            match = true;
            triggerUsed = t;
            break;
          }
        }
      }

      // If no valid trigger match, exit
      if (!match) return;


      // --- 2. Handle Reply System (Replying to the bot) ---
      if (message.quotedMsg) {
        if (message.quotedMsg.fromMe) {
          const replyText = await getBotResponse(body);
          return await client.sendMessage(message.from, { text: replyText }, { quoted: message });
        }
      }
      
      // --- 3. Extract the Query ---
      // Get the text that comes after the trigger word
      const query = body.substring(triggerUsed.length).trim();

      // --- 4. Handle "Trigger Only" (Random Reply) ---
      if (query.length === 0) {
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
        const random = replies[Math.floor(Math.random() * replies.length)];
        return client.sendMessage(message.from, { text: random }, { quoted: message });
      }

      // --- 5. Handle "Trigger + Message" (API Response) ---
      const replyText = await getBotResponse(query);
      return client.sendMessage(message.from, { text: replyText }, { quoted: message });

    } catch (e) {
      console.error("Bot Chat Error:", e);
      return client.sendMessage(message.from, { text: "❌ Something went wrong." }, { quoted: message });
    }
  }
};
