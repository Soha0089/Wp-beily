const axios = require("axios");
const { MessageMedia } = require("whatsapp-web.js");

const baseApiUrl = async () => {
  const base = await axios.get(
    "https://raw.githubusercontent.com/Mostakim0978/D1PT0/refs/heads/main/baseApiUrl.json"
  );
  return base.data.api;
};

module.exports = {
  config: {
    name: "sing",
    version: "1.7",
    author: "MahMUD",
    coolDown: 10,
    role: 0,
    category: "music",
    description: "Download and send a song (via YouTube search or link)",
    guide: {
      en: "Use {prefix}sing2 [song name or YouTube link]"
    }
  },

  onStart: async function ({ message, args, client }) {
    if (args.length === 0) {
      return message.reply("❌ | Please provide a song name or YouTube link\n\nExample: sing2 mood lofi");
    }

    const checkurl =
      /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))((\w|-){11})(?:\S+)?$/;

    let videoID = null;
    let songTitle = null;

    try {
      // -------- CHECK IF USER SENT YT LINK -------- //
      if (checkurl.test(args[0])) {
        const match = args[0].match(checkurl);
        videoID = match ? match[1] : null;

        if (!videoID) return message.reply("❌ Invalid YouTube link.");
      } else {
        // -------- SEARCH SONG NAME ON YOUTUBE -------- //
        const query = args.join(" ");
        await message.reply(`🎵 Searching for "${query}"... Please wait...`);

        const search = await axios.get(
          `${await baseApiUrl()}/ytFullSearch?songName=${encodeURIComponent(query)}`
        );

        const first = search.data[0];
        if (!first) return message.reply("❌ No results found for your query.");

        videoID = first.id;
        songTitle = first.title;
      }

      // -------- GET DOWNLOAD LINK -------- //
      const YT_DL = await axios.get(
        `${await baseApiUrl()}/ytDl3?link=${videoID}&format=mp3`
      );

      const videoTitle = YT_DL.data.title || songTitle || "song";
      const downloadLink = YT_DL.data.downloadLink;

      if (!downloadLink) {
        return message.reply("❌ Failed to fetch download link.");
      }

      // -------- DOWNLOAD AUDIO BUFFER -------- //
      const audioBuffer = (
        await axios.get(downloadLink, { responseType: "arraybuffer" })
      ).data;

      // -------- CONVERT TO WHATSAPP MEDIA -------- //
      const media = new MessageMedia(
        "audio/mpeg",
        Buffer.from(audioBuffer).toString("base64"),
        `${videoTitle}.mp3`
      );

      // -------- SEND SONG -------- //
      await client.sendMessage(message.from, media, {
        caption: `🎶 Here's your song!\n\n▶️ **${videoTitle}**\n🐤 Enjoy!`
      });

    } catch (error) {
      console.error("Sing2 Error:", error);

      if (error.response) {
        return message.reply(
          `❌ Server Error: ${error.response.status}\nTry again later.`
        );
      }

      message.reply("❌ Something went wrong. Please try again.");
    }
  }
};
