const axios = require("axios");

const baseApiUrl = async () => {
  const base = await axios.get(
    "https://raw.githubusercontent.com/mahmudx7/exe/main/baseApiUrl.json"
  );
  return base.data.jan;
};

const getBotResponse = async (msg) => {
  try {
    const base = await baseApiUrl();
    const res = await axios.get(
      `${base}/jan/font3/${encodeURIComponent(msg)}`
    );
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
    longDescription: "Talk with jan ai",
    category: "ai",
    guide: "jan <msg> / reply to jan"
  },

  onStart: async () => {},

  onChat: async function ({ message, client }) {
    try {
      const body = (message.body || "").toLowerCase();
      const triggers = ["jan", "jaan", "জান", "hinata", "bby", "baby"];
      const words = body.trim().split(/\s+/);
      const match = triggers.some((t) => body.startsWith(t));

      // ----------------------------------------------------
      // ✅ Chat Continue FIX
      // works if bot message replied again & again
      // ----------------------------------------------------
      if (message.quotedMsg && message.quotedMsg.fromMe) {
        const replyText = await getBotResponse(body);
        await client.sendMessage(
          message.from,
          { text: replyText },
          { quoted: message }
        );
        return; // reply chain allowed
      }

      // ----------------------------------------------------
      // ✅ jan (only)
      // ----------------------------------------------------
      if (match) {
        if (words.length === 1) {
          const replies = [
            "babu khuda lagse🥺",
            "Hop beda😾,Boss বল boss😼",
            "আমাকে ডাকলে কিস করে দেবো😘",
            "মিউ মিউ 🐱",
            "বলো কি বলবা? 🤭",
            "𝗜 𝗹𝗼𝘃𝗲 𝘆𝗼𝘂__😘😘",
            "খাইসা আসো 😌",
            "বার বার ডাকলে মাথা গরম হয় 😑",
            "ওই তুমি single না?😒",
            "বলো জানু 😒",
            "একটা BF খুঁজে দাও 😿"
          ];
          const random =
            replies[Math.floor(Math.random() * replies.length)];

          await client.sendMessage(
            message.from,
            { text: random },
            { quoted: message }
          );
          return;
        }

        // ----------------------------------------------------
        // ✅ jan <message> → API
        // ----------------------------------------------------
        words.shift();
        const query = words.join(" ");

        const replyText = await getBotResponse(query);

        await client.sendMessage(
          message.from,
          { text: replyText },
          { quoted: message }
        );
        return;
      }

      // ----------------------------------------------------
      // ❌ Not trigger → do nothing (chat continue safe)
      // ----------------------------------------------------

    } catch (e) {
      console.error("Bot Chat Error:", e);
      await client.sendMessage(
        message.from,
        { text: "❌ Something went wrong." },
        { quoted: message }
      );
    }
  }
};
