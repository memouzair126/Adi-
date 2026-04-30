const axios = require("axios");

module.exports.config = {
  name: "khushi",
  version: "3.0.0",
  hasPermssion: 0,
  credits: "Raj + Final Fix",
  description: "khushi Gemini AI chatbot",
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

  // 🧠 Memory
  chatMemory.history[senderID] = chatMemory.history[senderID] || [];
  chatMemory.history[senderID].push(`User: ${userMsg}`);

  if (chatMemory.history[senderID].length > 6) {
    chatMemory.history[senderID].shift();
  }

  const fullChat = chatMemory.history[senderID].join("\n");

  // 💬 Prompt
  const prompt = `Tum ek short Hinglish chatbot ho. Sirf 1 line me reply do.\n${fullChat}`;

  try {
    // 🚀 POST REQUEST (FIXED)
    const res = await axios.post(
      "https://uzairrajputapis.qzz.io/api/ai/gemini",
      {
        message: prompt
      },
      {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    console.log("✅ API RESPONSE:", res.data);

    // ✅ SAFE PARSE
    const botReply =
      res.data?.result?.answer ||
      res.data?.answer ||
      "Samajh nahi aaya 😅";

    // 🧠 Save reply
    chatMemory.history[senderID].push(`khushi: ${botReply}`);

    return api.sendMessage(botReply.trim(), threadID, messageID);

  } catch (err) {
    console.error("❌ FULL ERROR:", err.response?.data || err.message);

    return api.sendMessage(
      "Jaan 😔 API error aa gaya, baad me try karo",
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
