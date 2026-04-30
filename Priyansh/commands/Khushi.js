const axios = require("axios");

const API_URL = "https://uzairrajputapis.qzz.io/api/ai/gemini";

// GF Personality 😏
const PERSONA = `
Tumhara naam Khushi hai.
Tum ek romantic, flirty aur caring girlfriend ho ❤️
Hinglish me baat karo.
Har reply MAX 2 lines me ho.
Reply natural, emotional aur engaging ho.
Kabhi apne aap ko AI ya bot mat kehna.
`;

async function askAI(text) {
  const prompt = `${PERSONA}\nUser: ${text}\nKhushi:`;

  const res = await axios.get(
    `${API_URL}?prompt=${encodeURIComponent(prompt)}`,
    { timeout: 15000 }
  );

  let reply =
    res.data?.response ||
    res.data?.answer ||
    res.data?.reply ||
    "Hmm... tum kuch kehna chahte ho na baby? 😏";

  return reply;
}

module.exports.config = {
  name: "khushi",
  version: "4.0.0",
  hasPermssion: 0,
  credits: "Uzair + GF Clean",
  description: "Romantic GF AI (Auto + Reply + Trigger)",
  commandCategory: "ai",
  usages: "khushi <message>",
  cooldowns: 2
};

// 🔥 AUTO + TRIGGER SYSTEM
module.exports.handleEvent = async function ({ api, event }) {
  try {
    if (!event.body) return;
    if (event.senderID === api.getCurrentUserID()) return;

    const msg = event.body.trim();
    const lower = msg.toLowerCase();

    const isReplyToBot =
      event.type === "message_reply" &&
      event.messageReply &&
      event.messageReply.senderID === api.getCurrentUserID();

    const hasTrigger = lower.includes("khushi");

    if (!hasTrigger && !isReplyToBot) return;

    let userText = msg;

    // remove trigger word
    if (hasTrigger) {
      userText = msg.replace(/khushi/gi, "").trim();
    }

    if (!userText) userText = "hi";

    const reply = await askAI(userText);

    const info = await api.sendMessage(
      reply,
      event.threadID,
      event.messageID
    );

    // continue reply chain
    if (info && info.messageID) {
      global.client.handleReply.push({
        name: module.exports.config.name,
        messageID: info.messageID,
        author: event.senderID
      });
    }

  } catch (err) {
    console.log("Khushi Error:", err.message);
  }
};

// 💬 CONTINUE CONVERSATION
module.exports.handleReply = async function ({ api, event, handleReply }) {
  try {
    const { senderID, body, threadID, messageID } = event;

    if (senderID !== handleReply.author) return;
    if (!body) return;

    const reply = await askAI(body);

    const info = await api.sendMessage(
      reply,
      threadID,
      messageID
    );

    if (info && info.messageID) {
      global.client.handleReply.push({
        name: module.exports.config.name,
        messageID: info.messageID,
        author: senderID
      });
    }

  } catch (err) {
    api.sendMessage(
      "Baby... thoda confuse ho gayi 😔 phir bolo na ❤️",
      event.threadID,
      event.messageID
    );
  }
};
