const axios = require("axios");

module.exports.config = {
  name: "khushi",
  version: "final-working",
  hasPermssion: 0,
  credits: "Uzair + Final Fix",
  description: "GF AI Working (API result.answer fix)",
  commandCategory: "ai",
  cooldowns: 2
};

const API = "https://uzairrajputapis.qzz.io/api/ai/gemini";

// GF personality 😏
const STYLE = `
Tumhara naam Khushi hai ❤️
Tum ek romantic girlfriend ho 😏
User jis language me baat kare usi me reply karo
Reply max 2 lines me do
Cute, flirty aur natural tone rakho
Kabhi mat bolo ke tum AI ho
`;

async function getReply(msg) {
  try {
    const res = await axios.post(API, {
      prompt: STYLE + "\nUser: " + msg
    });

    // ✅ tumhari API ka correct field
    let reply = res.data?.result?.answer;

    if (!reply) {
      reply =
        res.data?.response ||
        res.data?.answer ||
        "Hmm... kuch kehna chahte ho na baby? 😏";
    }

    // 🔥 limit 2 lines (extra control)
    reply = reply.split("\n").slice(0, 2).join("\n");

    return reply;

  } catch (e) {
    console.log("API ERROR:", e.message);
    return "Baby network slow hai... phir try karo ❤️";
  }
}

module.exports.handleEvent = async function ({ api, event }) {
  try {
    if (!event.body) return;
    if (event.senderID == api.getCurrentUserID()) return;

    const msg = event.body;
    const lower = msg.toLowerCase();

    const isReply =
      event.type === "message_reply" &&
      event.messageReply &&
      event.messageReply.senderID == api.getCurrentUserID();

    const isTrigger = lower.includes("khushi");

    if (!isTrigger && !isReply) return;

    let text = msg;

    if (isTrigger) {
      text = msg.replace(/khushi/gi, "").trim();
    }

    if (!text) text = "hi";

    // ⏳ loading reaction
    api.setMessageReaction("⏳", event.messageID, event.threadID);

    const reply = await getReply(text);

    api.sendMessage(reply, event.threadID, event.messageID);

    // ❤️ success reaction
    api.setMessageReaction("❤️", event.messageID, event.threadID);

  } catch (err) {
    console.log("ERROR:", err.message);
  }
};
