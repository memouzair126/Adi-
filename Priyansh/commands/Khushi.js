const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_URL = "https://uzairrajputapis.qzz.io/api/ai/gemini";
const DATA_FILE = path.join(__dirname, "..", "..", "utils", "data", "khushi.json");

const PERSONA =
  "Tumhara naam 'Khushi' hai. Tum ek cute, flirty aur romantic girlfriend ho 😏❤️. " +
  "Tum Hinglish me baat karti ho. Har reply short, 1 line aur emotional hona chahiye. " +
  "User ke tone ke hisaab se kabhi naughty, kabhi caring ban jao. " +
  "Kabhi apne aap ko AI, bot ya Gemini mat kehna.";

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { threads: {} };
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8") || "{}") || { threads: {} };
  } catch {
    return { threads: {} };
  }
}

function saveData(data) {
  try {
    fs.ensureDirSync(path.dirname(DATA_FILE));
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch {}
}

async function askAI(prompt) {
  const fullPrompt = `${PERSONA}\n\n${prompt}`;

  const res = await axios.get(
    `${API_URL}?prompt=${encodeURIComponent(fullPrompt)}`,
    { timeout: 15000 }
  );

  let reply =
    res.data?.response ||
    res.data?.answer ||
    res.data?.reply ||
    "Hmm... mujhe kya bolna chahiye baby? 😏";

  return String(reply);
}

module.exports.config = {
  name: "khushi",
  version: "3.0.0",
  hasPermssion: 0,
  credits: "Uzair + GF Mod",
  description: "Khushi GF AI (Auto + Romantic + Memory)",
  commandCategory: "ai",
  usages: "[on/off/status]",
  cooldowns: 3
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const sub = (args[0] || "").toLowerCase();

  const data = loadData();
  const cur = data.threads[threadID] || { enabled: false };

  if (sub === "on") {
    cur.enabled = true;
    data.threads[threadID] = cur;
    saveData(data);

    return api.sendMessage(
      "😏 Khushi aa gayi... ab sirf tumhari hoon baby ❤️",
      threadID,
      messageID
    );
  }

  if (sub === "off") {
    cur.enabled = false;
    data.threads[threadID] = cur;
    saveData(data);

    return api.sendMessage(
      "💔 Theek hai... Khushi ja rahi hai, miss mat karna mujhe...",
      threadID,
      messageID
    );
  }

  if (sub === "status") {
    return api.sendMessage(
      `💖 Khushi Status: ${cur.enabled ? "ON 😏" : "OFF 💔"}`,
      threadID,
      messageID
    );
  }

  const prompt = args.join(" ");
  if (!prompt) {
    return api.sendMessage(
      "💬 Use karo: !khushi <message>\nYa auto mode ke liye: !khushi on 😏",
      threadID,
      messageID
    );
  }

  try {
    const reply = await askAI(prompt);
    return api.sendMessage(reply, threadID, messageID);
  } catch (e) {
    return api.sendMessage(
      "Baby... main thodi busy ho gayi 😔 phir try karo na ❤️",
      threadID,
      messageID
    );
  }
};

module.exports.handleEvent = async function ({ api, event }) {
  try {
    if (!event.body) return;
    if (event.senderID === api.getCurrentUserID()) return;

    const data = loadData();
    const cur = data.threads[event.threadID];
    if (!cur || !cur.enabled) return;

    const msg = event.body.toLowerCase();

    if (!msg.includes("khushi")) return;

    const userText = event.body.replace(/khushi/gi, "").trim() || "hi";

    const reply = await askAI(userText);

    return api.sendMessage(reply, event.threadID, event.messageID);

  } catch (err) {
    console.log("Khushi Error:", err.message);
  }
};
