const axios = require("axios");

module.exports.config = {
  name: "khushi",
  version: "2.1.0",
  hasPermssion: 0,
  credits: "Raj + Fixed",
  description: "khushi AI chatbot",
  commandCategory: "ai",
  usages: "[on/off/message]",
  cooldowns: 2
};

const chatMemory = {
  autoReply: {},
  history: {}
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, body } = event;

  const input = args.join(" ").trim().toLowerCase();

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

  chatMemory.history[senderID] = chatMemory.history[senderID] || [];
  chatMemory.history[senderID].push(`User: ${userMsg}`);

  if (chatMemory.history[senderID].length > 6)
    chatMemory.history[senderID].shift();

  const fullChat = chatMemory.history[senderID].join("\n");

  const prompt = `Short Hinglish reply only:\n${fullChat}`;

  try {
    // ✅ GET REQUEST (WORKING FORMAT)
    const url = `https://uzairrajputapis.qzz.io/api/ai/gemini?message=${encodeURIComponent(prompt)}`;

    console.log("🔗 URL:", url);

    const res = await axios.get(url, { timeout: 15000 });

    console.log("✅ API DATA:", res.data);

    const botReply =
      res.data?.result?.answer ||
      res.data?.answer ||
      "Samajh nahi aaya 😅";

    return api.sendMessage(botReply, threadID, messageID);

  } catch (err) {
    console.error("❌ ERROR:", err.response?.data || err.message);

    return api.sendMessage(
      "API hit fail ho gaya 😔 check console",
      threadID,
      messageID
    );
  }
};

// AUTO REPLY
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
