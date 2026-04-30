const axios = require("axios");

module.exports.config = {
  name: "khushi",
  version: "1.2.0",
  hasPermssion: 0,
  credits: "Raj + Fix by ChatGPT",
  description: "khushi Gemini AI chatbot - naughty romantic style",
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
    return api.sendMessage(
      "Hyee jaanu! 😏 khushi auto-reply mode ON ho gaya ❤️",
      threadID,
      messageID
    );
  }

  if (input === "off") {
    chatMemory.autoReply[senderID] = false;
    chatMemory.history[senderID] = [];
    return api.sendMessage(
      "Hmm! khushi chala gaya... par wapas aaunga 😌",
      threadID,
      messageID
    );
  }

  const isAuto = chatMemory.autoReply[senderID];
  if (!isAuto && !body.toLowerCase().startsWith("khushi")) return;

  const userMsg = body;
  chatMemory.history[senderID] = chatMemory.history[senderID] || [];

  chatMemory.history[senderID].push(`User: ${userMsg}`);
  if (chatMemory.history[senderID].length > 6)
    chatMemory.history[senderID].shift();

  const fullChat = chatMemory.history[senderID].join("\n");

  const prompt = `Tum ek naughty romantic Hinglish boyfriend ho... sirf 1 line me reply dena.\n\n${fullChat}`;

  try {
    // ✅ FIXED API CALL
    const res = await axios.get(
      `https://uzairrajputapis.qzz.io/api/ai/gemini?message=${encodeURIComponent(prompt)}`
    );

    // ✅ FIXED RESPONSE PATH
    const botReply =
      res.data?.result?.answer?.trim() ||
      "Uff jaanu samajh nahi aaya 😅";

    chatMemory.history[senderID].push(`khushi: ${botReply}`);

    return api.sendMessage(botReply, threadID, messageID);
  } catch (err) {
    console.error("API error:", err.message);
    return api.sendMessage(
      "Sorry jaan 😔 thoda error aa gaya... baad me try karo",
      threadID,
      messageID
    );
  }
};

// Auto reply
module.exports.handleEvent = async function ({ api, event }) {
  const { body, senderID, messageReply } = event;

  const isAuto = chatMemory.autoReply[senderID];
  if (!isAuto) return;

  const isReplyToBot =
    messageReply && messageReply.senderID == api.getCurrentUserID();

  if (isReplyToBot || body.toLowerCase().startsWith("khushi")) {
    this.run({ api, event, args: [body] });
  }
};
