module.exports.config = {
  name: "auto",
  version: "1.0",
  hasPermssion: 0,
  credits: "test",
  description: "auto test",
  commandCategory: "test",
  cooldowns: 1
};

module.exports.handleEvent = async function ({ api, event }) {
  if (!event.body) return;
  if (event.senderID == api.getCurrentUserID()) return;

  if (event.body.toLowerCase().includes("khushi")) {
    api.sendMessage("Auto working ✅", event.threadID, event.messageID);
  }
};
