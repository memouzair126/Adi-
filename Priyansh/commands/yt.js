const axios = require("axios");
const yts = require("yt-search");

const DOWNLOAD_API = "https://uzairrajputapis.qzz.io/api/downloader/youtube";

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function fakeTypingThenCall(api, threadID) {
    try {
        const stop = api.sendTypingIndicator(threadID, () => {});
        await sleep(1500);
        if (typeof stop === "function") stop();
    } catch (_) {}
}

module.exports.config = {
    name: "yt",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "Uzair Rajput",
    description: "Search karke YouTube video download karta hai.",
    commandCategory: "Downloader",
    usages: "[song name]",
    cooldowns: 5,
    dependencies: {
        "axios": "",
        "yt-search": ""
    }
};

function streamFromUrl(url, ext) {
    return axios
        .get(url, { responseType: "stream", timeout: 120000 })
        .then((res) => {
            res.data.path = `uzair.${ext}`;
            return res.data;
        });
}

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const query = args.join(" ").trim();

    if (!query) {
        return api.sendMessage(
            "📥 𝗬𝗧 𝗦𝗲𝗮𝗿𝗰𝗵 + 𝗗𝗼𝘄𝗻𝗹𝗼𝗮𝗱\n━━━━━━━━━━━━━━\nUse: !yt <song name>\nExample: !yt faded alan walker",
            threadID,
            messageID
        );
    }

    api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
        // 🔍 Search using yt-search
        const search = await yts(query);

        if (!search.videos.length) {
            throw new Error("Koi video nahi mila.");
        }

        const video = search.videos[0]; // first result
        const videoUrl = video.url;

        // 📥 Download API call
        const { data } = await axios.post(
            DOWNLOAD_API,
            { url: videoUrl },
            { headers: { "Content-Type": "application/json" }, timeout: 60000 }
        );

        if (!data || data.success !== true || !data.result) {
            throw new Error("Download API fail ho gayi.");
        }

        const r = data.result;
        const sizeMB = parseFloat(String(r.size || "0").replace(/[^\d.]/g, "")) || 0;

        if (sizeMB > 80) {
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage(
                `⚠️ File bohat bari hai (${r.size})\n\n📌 ${r.title}\n🔗 ${r.downloadUrl}`,
                threadID,
                messageID
            );
        }

        const file = await streamFromUrl(r.downloadUrl, "mp4");

        await fakeTypingThenCall(api, threadID);

        api.sendMessage(
            {
                body: `📥 𝗬𝗧 𝗗𝗼𝘄𝗻𝗹𝗼𝗮𝗱\n━━━━━━━━━━━━━━\n📌 ${r.title}\n💎 ${r.quality || "HD"}\n📦 ${r.size || "?"}`,
                attachment: file
            },
            threadID,
            () => api.setMessageReaction("✅", messageID, () => {}, true),
            messageID
        );

    } catch (err) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage(
            `⚠️ Error: ${err.message}`,
            threadID,
            messageID
        );
    }
};
