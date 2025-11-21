const axios = require("axios");

const MAX_REPLY_DEPTH = 5;

const baseApiUrl = async () => {
  const base = await axios.get(
    "https://raw.githubusercontent.com/mahmudx7/exe/main/baseApiUrl.json"
  );
  return base.data.jan;
};

const getBotResponse = async (msg) => {
  try {
    const base = await baseApiUrl();
    const res = await axios.get(`${base}/jan/font3/${encodeURIComponent(msg)}`);
    return res.data?.message || "❌ Try again.";
  } catch (err) {
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

  onStart: async function () {},

  // -------------------------------
  // 🚀 FIXED onChat
  // -------------------------------
  onChat: async function ({ message, event, api }) {
    const body = message.body?.toLowerCase() || "";
    const triggers = ["jan", "jaan", "জান", "hinata", "bby", "baby"];
    const words = body.trim().split(/\s+/);

    const match = triggers.some(trigger => body.startsWith(trigger));

    if (!match) return;

    let replyText;

    // "jan" only → random reply
    if (words.length === 1) {
      const replies = [
        "oi mama ar dakis na pilis 😿",
        "babu khuda lagse🥺",
        "Hop beda😾",
        "I love you 😘",
        "mew meow🐤",
        "Bby bolle pap hoibo 😒",
        "bolen sir 😌",
        "single naki tumi? 😏",
        "__beshI bby bolle kamur dimu 🤭",
        "khawa dawa korso?",
        "তোর কথা কেউ শুনে না 😂"
      ];
      replyText = replies[Math.floor(Math.random() * replies.length)];
    } else {
      // "jan hi", "bby hello"
      words.shift();
      replyText = await getBotResponse(words.join(" "));
    }

    const sent = await message.reply(replyText);

    // Return reply session to GoatBot
    return {
      type: "reply",
      name: this.config.name,
      author: message.senderID,
      messageID: sent.messageID,
      depth: 1
    };
  },

  // -------------------------------
  // 🚀 FIXED onReply (NOW WORKING)
  // -------------------------------
  onReply: async function ({ message, Reply, api, event }) {
    try {
      let depth = Reply.depth + 1;

      if (depth > MAX_REPLY_DEPTH) {
        return message.reply(
          `⚠️ Reply loop limit (${MAX_REPLY_DEPTH}) reached. Start a new convo.`
        );
      }

      const replyText = await getBotResponse(message.body);

      const sent = await message.reply(replyText);

      // Update new reply session
      return {
        type: "reply",
        name: this.config.name,
        author: message.senderID,
        messageID: sent.messageID,
        depth
      };
    } catch (err) {
      return message.reply("❌ Something went wrong.");
    }
  }
};
