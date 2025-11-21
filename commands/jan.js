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
      
      // --- 1. Handle Direct Reply/Quote to the Bot ---
      if (message.quotedMsg && message.quotedMsg.fromMe) {
        // If the user quotes the bot, treat the ENTIRE message body as the query for the API.
        const replyText = await getBotResponse(body);
        return client.sendMessage(message.from, { text: replyText }, { quoted: message });
      }

      // --- 2. Check for Trigger Word in New Message ---
      
      let triggerEndIndex = -1; 
      let isTriggered = false;
      
      for (const t of mahmud) {
        // Check if the message starts with the trigger (case-insensitive)
        if (lowerBody === t || lowerBody.startsWith(t + " ")) {
          
          // Calculate the end index based on the lowercase trigger length
          triggerEndIndex = t.length; 
          
          // If there is more text after the trigger, account for the space
          if (lowerBody.startsWith(t + " ")) {
              triggerEndIndex += 1; // Add 1 for the space separator
          }
          
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
      
      // --- 3. Extract the Query using the calculated index on the original body ---
      // This is the core fix: correctly extracting the query text.
      const query = body.substring(triggerEndIndex).trim();

      // --- 4. Handle "Trigger Only" (Random Reply) ---
      if (query.length === 0) {
        const randomMsg = responses[Math.floor(Math.random() * responses.length)];
        return client.sendMessage(message.from, { text: randomMsg }, { quoted: message });
      } 
      
      // --- 5. Handle "Trigger + Message" (API Response) ---
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
