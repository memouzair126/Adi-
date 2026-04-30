const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs");

module.exports.config = {
  name: "khushi",
  version: "9.0.0",
  hasPermssion: 0,
  credits: "Raj + Stable Fix",
  description: "AI + Song Working Perfect",
  commandCategory: "ai",
  usages: "[on/off/message/song/url]",
  cooldowns: 2
};

const chatMemory = {
  autoReply: {},
  history: {}
};

// 🔍 YouTube URL check
function isYouTubeUrl(text) {
  return /(youtube\.com|youtu\.be)/i.test(text);
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, body } = event;

  const input = args.join(" ").trim().toLowerCase();

  // ON/OFF
  if (input === "on") {
    chatMemory.autoReply[senderID] = true;
    return api.sendMessage("Auto reply ON 😏", threadID, messageID);
  }

  if (input === "off") {
    chatMemory.autoReply[senderID] = false;
    chatMemory.history[senderID] = [];
    return api.sendMessage("Auto reply OFF 😔", threadID, messageID);
  }

  const isAuto = chatMemory.autoReply[senderID];
  if (!isAuto && !body?.toLowerCase().startsWith("khushi")) return;

  const userMsg = body || "";

  // 🎵 SONG SYSTEM
  if (
    userMsg.toLowerCase().includes("song") ||
    userMsg.toLowerCase().includes("music") ||
    userMsg.toLowerCase().includes("play") ||
    isYouTubeUrl(userMsg)
  ) {
    try {
      let videoUrl = "";
      let title = "";

      // URL
      if (isYouTubeUrl(userMsg)) {
        videoUrl = userMsg.trim();
        title = "Your Song";
      } else {
        const query = userMsg.replace(/khushi|song|music|play/gi, "").trim();

        if (!query) {
          return api.sendMessage("Song naam batao 😏", threadID, messageID);
        }

        const search = await yts(query);
        const video = search.videos[0];

        if (!video) {
          return api.sendMessage("Song nahi mila 😔", threadID, messageID);
        }

        videoUrl = video.url;
        title = video.title;
      }

      console.log("🎯 Video:", videoUrl);

      // 🎧 API CALL (POST)
      const dl = await axios.post(
        "https://uzairrajputapis.qzz.io/api/downloader/ytmp3",
        { url: videoUrl },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 20000
        }
      );

      console.log("📦 API:", dl.data);

      // ✅ FIXED PARSE
      const audioUrl = dl.data?.result?.download_url;

      if (!audioUrl) {
        return api.sendMessage("Download link nahi mila 😔", threadID, messageID);
      }

      console.log("🔗 AUDIO:", audioUrl);

      // 📥 DOWNLOAD FILE (SAFE STREAM)
      const filePath = __dirname + `/cache_${senderID}.mp3`;

      const response = await axios({
        url: audioUrl,
        method: "GET",
        responseType: "stream",
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      // 📤 SEND
      return api.sendMessage(
        {
          body: `🎵 ${title}`,
          attachment: fs.createReadStream(filePath)
        },
        threadID,
        messageID,
        () => fs.unlinkSync(filePath)
      );

    } catch (err) {
      console.error("❌ SONG ERROR:", err.response?.data || err.message);
      return api.sendMessage("Song laane me error aa gaya 😔", threadID, messageID);
    }
  }

  // 🤖 AI CHAT
  chatMemory.history[senderID] = chatMemory.history[senderID] || [];
  chatMemory.history[senderID].push(`User: ${userMsg}`);

  if (chatMemory.history[senderID].length > 6)
    chatMemory.history[senderID].shift();

  const fullChat = chatMemory.history[senderID].join("\n");

  const prompt = `Short Hinglish reply only:\n${fullChat}`;

  try {
    const res = await axios.post(
      "https://uzairrajputapis.qzz.io/api/ai/gemini",
      { prompt: prompt },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 15000
      }
    );

    const botReply =
      res.data?.result?.answer || "Samajh nahi aaya 😅";

    chatMemory.history[senderID].push(`khushi: ${botReply}`);

    return api.sendMessage(botReply.trim(), threadID, messageID);

  } catch (err) {
    console.error("❌ AI ERROR:", err.response?.data || err.message);
    return api.sendMessage("AI error aa gaya 😔", threadID, messageID);
  }
};

// 🔁 AUTO REPLY
module.exports.handleEvent = async function ({ api, event }) {
  const { body, senderID, messageReply } = event;

  if (!body) return;

  const isAuto = chatMemory.autoReply[senderID];
  if (!isAuto) return;

  const isReplyToBot =
    messageReply && messageReply.senderID == api.getCurrentUserID();

  if (isReplyToBot || body.toLowerCase().startsWith("khushi")) {
    this.run({ api, event, args: [body] });
  }
};
