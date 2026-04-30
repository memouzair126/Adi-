const axios = require("axios");

module.exports.config = {
  name: "khushi",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "Raj + Fixed",
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

  // ✅ ON
  if (input === "on") {
    chatMemory.autoReply[senderID] = true;
    return api.sendMessage(
      "Hyee jaanu 😏 khushi auto-reply ON ho gaya ❤️",
      threadID,
      messageID
    );
  }

  // ❌ OFF
  if (input === "off") {
    chatMemory.autoReply[senderID] = false;
    chatMemory.history[senderID] = [];
    return api.sendMessage(
      "Bye jaan 😔 khushi off ho gaya...",
      threadID,
      messageID
    );
  }

  const isAuto = chatMemory.autoReply[senderID];

  if (!isAuto && !body?.toLowerCase().startsWith("khushi")) return;

  const userMsg = body || "";
  chatMemory.history[senderID] = chatMemory.history[senderID] || [];

  // 🧠 Memory save
  chatMemory.history[senderID].push(`User: ${userMsg}`);
  if (chatMemory.history[senderID].length > 6) {
    chatMemory.history[senderID].shift();
  }

  const fullChat = chatMemory.history[senderID].join("\n");

  // 💬 Prompt
  const prompt = `Tum ek naughty romantic Hinglish boyfriend ho. Sirf 1 line me reply do, short aur natural.\n\n${fullChat}`;

  try {
    // 🚀 WORKING API CALL (POST)
    const res = await axios.post(
      "https://uzairrajputapis.qzz.io/api/ai/gemini",
      {
        message: prompt
      },
      {
        timeout: 15000
      }
    );

    console.log("API RESPONSE:", res.data);

    // ✅ SAFE RESPONSE PARSE
    const botReply =
      res.data?.result?.answer ||
      res.data?.answer ||
      "Uff jaanu samajh nahi aaya 😅";

    // 🧠 Save bot reply
    chatMemory.history[senderID].push(`khushi: ${botReply}`);

    return api.sendMessage(botReply.trim(), threadID, messageID);

  } catch (err) {
    console.error("❌ FULL ERROR:", err.response?.data || err.message);

    return api.sendMessage(
      "Jaan 😔 API thodi nakhre dikha rahi hai... baad me try karo",
      threadID,
      messageID
    );
  }
};

// 🔁 AUTO REPLY SYSTEM
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
