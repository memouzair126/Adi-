const axios = require("axios");

module.exports.config = {
  name: "khushi",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "Uzair + Fixed by ChatGPT",
  description: "Khushi Gemini AI Chatbot (Auto + Memory + Stable)",
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

  // ON
  if (input === "on") {
    chatMemory.autoReply[senderID] = true;
    return api.sendMessage(
      "Hyee jaanu 😏 Khushi auto-reply ON ho gaya... ab sirf tumhare liye ❤️",
      threadID,
      messageID
    );
  }

  // OFF
  if (input === "off") {
    chatMemory.autoReply[senderID] = false;
    chatMemory.history[senderID] = [];
    return api.sendMessage(
      "Theek hai... Khushi ab chup ho gaya 💔",
      threadID,
      messageID
    );
  }

  const isAuto = chatMemory.autoReply[senderID];
  if (!isAuto && (!body || !body.toLowerCase().startsWith("khushi"))) return;

  const userMsg = args.join(" ") || body;

  // Memory setup
  chatMemory.history[senderID] = chatMemory.history[senderID] || [];
  chatMemory.history[senderID].push(`User: ${userMsg}`);

  if (chatMemory.history[senderID].length > 6) {
    chatMemory.history[senderID].shift();
  }

  const fullChat = chatMemory.history[senderID].join("\n");

  const prompt = `Tum ek flirtatious boyfriend ho 😏 
Hinglish me 1 line me reply do.
User ke tone ke hisaab se reply karo.

Chat:
${fullChat}`;

  try {
    const res = await axios.get(
      `https://uzairrajputapis.qzz.io/api/ai/gemini?prompt=${encodeURIComponent(prompt)}`,
      { timeout: 10000 }
    );

    let botReply =
      res.data?.response ||
      res.data?.answer ||
      res.data?.reply ||
      "Hmm... kuch bolu kya? 😏";

    chatMemory.history[senderID].push(`Khushi: ${botReply}`);

    return api.sendMessage(botReply, threadID, messageID);

  } catch (err) {
    console.error("API ERROR:", err.message);

    return api.sendMessage(
      "Baby... network slow hai ya main tumhe dekh ke shy ho gaya 😳",
      threadID,
      messageID
    );
  }
};

// Auto reply handler
module.exports.handleEvent = async function ({ api, event }) {
  const { body, senderID, messageReply } = event;
  if (!body) return;

  const isAuto = chatMemory.autoReply[senderID];
  if (!isAuto) return;

  const isReplyToBot =
    messageReply && messageReply.senderID == api.getCurrentUserID();

  if (isReplyToBot || body.toLowerCase().startsWith("khushi")) {
    this.run({ api, event, args: body.split(/\s+/) });
  }
};
