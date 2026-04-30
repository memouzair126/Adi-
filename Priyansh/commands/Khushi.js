const axios = require("axios");

module.exports.config = {
  name: "khushi",
  version: "1.1.2",
  hasPermssion: 0,
  credits: "Raj",
  description: "khushi Gemini AI chatbot - Fixed API",
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
    return api.sendMessage("Hyee jaanu! 😏 khushi auto-reply mode **ON** ho gaya... Ab sirf tumhare liye naughty romantic bann gaya hu ❤️", threadID, messageID);
  }

  if (input === "off") {
    chatMemory.autoReply[senderID] = false;
    chatMemory.history[senderID] = [];
    return api.sendMessage("Hmm! khushi chala gaya... Par tumhara intezaar hamesha rahega jaan ❤️", threadID, messageID);
  }

  const isAuto = chatMemory.autoReply[senderID];
  if (!isAuto && (!body || !body.toLowerCase().startsWith("khushi"))) return;

  const userMsg = body || args.join(" ");
  chatMemory.history[senderID] = chatMemory.history[senderID] || [];
  chatMemory.history[senderID].push(`User: ${userMsg}`);
  
  if (chatMemory.history[senderID].length > 6) chatMemory.history[senderID].shift();
  const fullChat = chatMemory.history[senderID].join("\n");

  const prompt = `Tumhe General knowledge bhi ho. Tumse jo jis language me baat kare tum unse uski ke language me baat karna. Tum male ho aur ladke ke jaise bold aur flirtatious ho. Tum sirf Hinglish me reply karte ho. Tum har message ka jawab sirf 1 line me doge. Act as a real boyfriend. Now continue the chat:\n\n${fullChat}`;

  try {
    // API Call with timeout to prevent hanging
    const res = await axios.get(`https://uzairrajputapis.qzz.io/api/ai/gemini?question=${encodeURIComponent(prompt)}`, {
      timeout: 10000 
    });

    // Check multiple possible response fields
    let botReply = "";
    if (res.data && res.data.response) botReply = res.data.response;
    else if (res.data && res.data.answer) botReply = res.data.answer;
    else if (res.data && res.data.reply) botReply = res.data.reply;
    else if (typeof res.data === 'string') botReply = res.data;

    if (!botReply) throw new Error("Empty response from API");

    chatMemory.history[senderID].push(`khushi: ${botReply}`);
    return api.sendMessage(botReply, threadID, messageID);

  } catch (err) {
    console.error("DEBUG - API ERROR:", err.message);
    // Agar API bilkul kaam nahi kar rahi, toh ek static fallback reply
    return api.sendMessage("Uff baby, mera mood abhi thoda off hai... tum itne pyare ho ki main speechless ho gayi! 😉", threadID, messageID);
  }
};

module.exports.handleEvent = async function ({ api, event }) {
  const { body, senderID, messageReply } = event;
  if (!body) return;

  const isAuto = chatMemory.autoReply[senderID];
  if (!isAuto) return;

  const isReplyToBot = messageReply && messageReply.senderID == api.getCurrentUserID();
  if (isReplyToBot || body.toLowerCase().startsWith("khushi")) {
    this.run({ api, event, args: body.split(/\s+/) });
  }
};
