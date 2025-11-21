const axios = require("axios");

const mahmud = [
  "baby",
  "bby",
  "babu",
  "bbu",
  "jan",
  "bot",
  "জান",
  "জানু",
  "বেবি",
  "wifey",
  "hinata"
];

// --- API Fetch Functions ---

const baseApiUrl = async () => {
  const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/exe/main/baseApiUrl.json");
  return base.data.jan;
};

async function getBotResponse(msg) {
  try {
    const base = await baseApiUrl();
    const response = await axios.get(`${base}/jan/font3/${encodeURIComponent(msg)}`);
    return response.data?.message || "❌ Try again, janu 🥲";
  } catch (err) {
    console.error("API Error:", err.message || err);
    return "❌ Error occurred, janu 🥹";
  }
}

// --- WhatsApp Module Structure ---

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
    guide: "Just type jan or jan <message>, or reply to the bot's message."
  },

  onStart: async () => {},

  onChat: async function ({ message, client }) {
    try {
      const body = (message.body || "").trim();
      const lowerBody = body.toLowerCase();
      
      // --- 1. Reply to Bot's Message (Similar to onReply) ---
      if (message.quotedMsg && message.quotedMsg.fromMe) {
        // This means the user is replying directly to a message sent by the bot (fromMe)
        const replyText = await getBotResponse(body);
        return client.sendMessage(message.from, { text: replyText }, { quoted: message });
      }

      // --- 2. New Message Trigger Check (Similar to onChat) ---
      // Find the trigger word used at the start of the message
      let triggerUsed = "";
      let isTriggered = false;
      for (const t of mahmud) {
        if (lowerBody === t || lowerBody.startsWith(t + " ")) {
          triggerUsed = t;
          isTriggered = true;
          break;
        }
      }

      if (!isTriggered) return; // Exit if no trigger word is found

      // Define random responses
      const responses = [
        "babu khuda lagse🥺",
        "Hop beda😾,Boss বল boss😼",  
        "আমাকে ডাকলে ,আমি কিন্তূ কিস করে দেবো😘 ",  
        "🐒🐒🐒",
        "bye",
        "naw message daw m.me/mahmud.x07",
        "mb ney bye",
        "meww",
        "গোলাপ ফুল এর জায়গায় আমি দিলাম তোমায় মেসেজ",
        "বলো কি বলবা, সবার সামনে বলবা নাকি?🤭🤏",  
        "𝗜 𝗹𝗼𝘃𝗲 𝘆𝗼𝘂__😘😘",
        "__ফ্রী ফে'সবুক চালাই কা'রন ছেলেদের মুখ দেখা হারাম 😌",
        "মন সুন্দর বানাও মুখের জন্য তো 'Snapchat' আছেই! 🌚"
      ];
      
      // Extract the query after the trigger
      const query = body.substring(triggerUsed.length).trim();

      // --- 3. Handle "Trigger Only" (Random Reply) ---
      if (query.length === 0) {
        const randomMsg = responses[Math.floor(Math.random() * responses.length)];
        // The WhatsApp framework doesn't have a direct "typing indicator" or "reaction" like Messenger, 
        // so we'll just send the message.
        return client.sendMessage(message.from, { text: randomMsg }, { quoted: message });
      } 
      
      // --- 4. Handle "Trigger + Message" (API Response) ---
      else {
        const botResponse = await getBotResponse(query);
        return client.sendMessage(message.from, { text: botResponse }, { quoted: message });
      }

    } catch (e) {
      console.error("Bot Chat Error:", e);
      return client.sendMessage(message.from, { text: "❌ Something went wrong." }, { quoted: message });
    }
  }
};
