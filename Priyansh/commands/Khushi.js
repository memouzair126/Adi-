const axios = require("axios");
const yts = require("yt-search");

module.exports.config = {
  name: "khushi",
  version: "4.0.0",
  hasPermssion: 0,
  credits: "Raj + Advanced",
  description: "AI + Song Player",
  commandCategory: "ai",
  usages: "[on/off/message/song]",
  cooldowns: 2
};

const chatMemory = {
  autoReply: {},
  history: {}
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, body } = event;

  const input = args.join(" ").trim().toLowerCase();

  // ✅ ON
  if (input === "on") {
    chatMemory.autoReply[senderID] = true;
    return api.sendMessage("Auto reply ON 😏", threadID, messageID);
  }

  // ❌ OFF
  if (input === "off") {
    chatMemory.autoReply[senderID] = false;
    chatMemory.history[senderID] = [];
    return api.sendMessage("Auto reply OFF 😔", threadID, messageID);
  }

  const isAuto = chatMemory.autoReply[senderID];

  if (!isAuto && !body?.toLowerCase().startsWith("khushi")) return;

  const userMsg = body || "";

  // 🎵 SONG DETECTION
  if (
    userMsg.toLowerCase().includes("song") ||
    userMsg.toLowerCase().includes("music") ||
    userMsg.toLowerCase().includes("play")
  ) {
    try {
      const query = userMsg.replace(/khushi|song|music|play/gi, "").trim();

      if (!query) {
        return api.sendMessage("Song naam to batao jaan 😏", threadID, messageID);
      }

      // 🔍 YT SEARCH
      const search = await yts(query);
      const video = search.videos[0];

      if (!video) {
        return api.sendMessage("Song nahi mila 😔", threadID, messageID);
      }

      // 🎧 DOWNLOAD API
      const dl = await axios.get(
        `https://uzairrajputapis.qzz.io/api/downloader/ytmp3?url=${encodeURIComponent(video.url)}`
      );

      const audioUrl = dl.data?.result?.download;

      if (!audioUrl) {
        return api.sendMessage("Download fail ho gaya 😔", threadID, messageID);
      }

      return api.sendMessage(
        {
          body: `🎵 ${video.title}`,
          attachment: await global.utils.getStreamFromURL(audioUrl)
        },
        threadID,
        messageID
      );

    } catch (err) {
      console.error("SONG ERROR:", err.message);
      return api.sendMessage("Song laane me error aa gaya 😔", threadID, messageID);
    }
  }

  // 🤖 AI PART
  chatMemory.history[senderID] = chatMemory.history[senderID] || [];
  chatMemory.history[senderID].push(`User: ${userMsg}`);

  if (chatMemory.history[senderID].length > 6) {
    chatMemory.history[senderID].shift();
  }

  const fullChat = chatMemory.history[senderID].join("\n");

  const prompt = `Tum ek short Hinglish chatbot ho. Sirf 1 line me reply do.\n${fullChat}`;

  try {
    const res = await axios.post(
      "https://uzairrajputapis.qzz.io/api/ai/gemini",
      {
        prompt: prompt
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const botReply =
      res.data?.result?.answer ||
      "Samajh nahi aaya 😅";

    chatMemory.history[senderID].push(`khushi: ${botReply}`);

    return api.sendMessage(botReply.trim(), threadID, messageID);

  } catch (err) {
    console.error("AI ERROR:", err.response?.data || err.message);

    return api.sendMessage(
      "Jaan 😔 AI error aa gaya",
      threadID,
      messageID
    );
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
