const axios = require("axios");

module.exports.config = {
  name: "khushi",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "Uzair + Final Fix",
  description: "Romantic GF Auto Chat (Language Adaptive)",
  commandCategory: "ai",
  usages: "khushi <msg>",
  cooldowns: 2
};

const API = "https://uzairrajputapis.qzz.io/api/ai/gemini";

// 🔥 Smart GF Personality
const STYLE = `
Tumhara naam Khushi hai ❤️
Tum ek romantic girlfriend ho 😏
User jis language me baat kare, tum usi language me reply karo (Roman Hindi, Hindi, English, Hinglish)
Reply max 2 lines me do
Tone cute, flirty aur natural ho
Kabhi mat bolo ke tum AI ho
`;

async function getReply(msg) {
  try {
    const res = await axios.get(
      `${API}?prompt=${encodeURIComponent(STYLE + "\nUser: " + msg)}`
    );

    return (
      res.data?.response ||
      res.data?.answer ||
      res.data?.reply ||
      "Hmmm... kuch to bolna chahte ho na baby? 😏"
    );
  } catch (e) {
    return "Baby network thoda slow hai... phir try karo na ❤️";
  }
}

// 🚀 AUTO CHAT SYSTEM
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

    // ❗ trigger ya reply pe hi chale
    if (!isTrigger && !isReply) return;

    let text = msg;

    if (isTrigger) {
      text = msg.replace(/khushi/gi, "").trim();
    }

    if (!text) text = "hi";

    const reply = await getReply(text);

    api.sendMessage(reply, event.threadID, event.messageID);

  } catch (err) {
    console.log("Khushi Error:", err.message);
  }
};
