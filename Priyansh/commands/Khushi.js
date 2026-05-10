const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs");

module.exports.config = {
  name: "khushi",
  version: "10.0.0",
  hasPermssion: 0,
  credits: "Uzair Rajput",
  description: "Khushi — romantic gf style AI + auto song (dual API)",
  commandCategory: "ai",
  usages: "khushi <message | song name | YouTube URL>",
  cooldowns: 2
};

const chatMemory = {
  history: {}
};

const SONG_API_1    = "https://uzairrajputapis.qzz.io/api/downloader/ytmp3";
const SONG_API_2    = "https://uzair-new-music-api.onrender.com/download/dlmp3";
const SONG_API_3    = "https://uzairrajputapis.qzz.io/api/downloader/youtube"; // NEW VIDEO API
const YT_SEARCH_API = "https://uzairrajputapis.qzz.io/api/search/youtube";
const AI_API        = "https://uzairrajputapis.qzz.io/api/ai/gemini";

function isYouTubeUrl(text) {
  return /(youtube\.com|youtu\.be)/i.test(text);
}

async function searchYouTube(query) {
  try {
    const { data } = await axios.get(YT_SEARCH_API, {
      params: { q: query },
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000
    });

    const candidates = [];
    const pushItem = (it) => { if (it && typeof it === "object") candidates.push(it); };
    if (Array.isArray(data?.result)) data.result.forEach(pushItem);
    else if (Array.isArray(data?.result?.items)) data.result.items.forEach(pushItem);
    else if (Array.isArray(data?.result?.videos)) data.result.videos.forEach(pushItem);
    else if (data?.result && typeof data.result === "object") pushItem(data.result);
    if (Array.isArray(data?.results)) data.results.forEach(pushItem);
    if (Array.isArray(data?.data))    data.data.forEach(pushItem);
    if (Array.isArray(data?.items))   data.items.forEach(pushItem);
    if (Array.isArray(data?.videos))  data.videos.forEach(pushItem);

    for (const it of candidates) {
      const id    = it.videoId || it.id || it.video_id;
      const url   = it.url || it.link || it.videoUrl || (id ? `https://youtu.be/${id}` : null);
      const title = it.title || it.name || it.videoTitle;
      if (url && /(youtube\.com|youtu\.be)/i.test(url)) {
        return { url, title: title || "Your Song" };
      }
    }
    console.log("⚠️ YT search API: koi valid item nahi mila");
  } catch (e) {
    console.log("⚠️ YT search API fail:", e.response?.status || e.message);
  }

  try {
    const search = await yts(query);
    const video = search.videos?.[0];
    if (video) return { url: video.url, title: video.title };
  } catch (e) {
    console.log("⚠️ yt-search fallback fail:", e.message);
  }

  return null;
}

async function fetchSongAPI1(query) {
  let videoUrl = "";
  let title = "Your Song";

  if (isYouTubeUrl(query)) {
    videoUrl = query.trim();
  } else {
    const found = await searchYouTube(query);
    if (!found) return null;
    videoUrl = found.url;
    title = found.title;
  }

  const dl = await axios.post(
    SONG_API_1,
    { url: videoUrl },
    { headers: { "Content-Type": "application/json" }, timeout: 20000 }
  );

  const audioUrl = dl.data?.result?.download_url;
  if (!audioUrl) return null;
  return { audioUrl, title };
}

async function fetchSongAPI2(query) {
  const apiUrl = isYouTubeUrl(query)
    ? `${SONG_API_2}?url=${encodeURIComponent(query.trim())}`
    : `${SONG_API_2}?q=${encodeURIComponent(query.trim())}`;

  const { data } = await axios.get(apiUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 25000
  });

  if (!data || data.success === false) return null;
  const audioUrl = data.downloadUrl || data.url || data.link || data.audio;
  if (!audioUrl) return null;
  const title = data.title || data.searchResult?.title || "Your Song";
  return { audioUrl, title };
}

// NEW VIDEO API FUNCTION
async function fetchVideoAPI(query) {
  let videoUrl = "";

  if (isYouTubeUrl(query)) {
    videoUrl = query.trim();
  } else {
    const found = await searchYouTube(query);
    if (!found) return null;
    videoUrl = found.url;
  }

  const { data } = await axios.get(
    `${SONG_API_3}?url=${encodeURIComponent(videoUrl)}`,
    {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 25000
    }
  );

  if (!data || data.success === false) return null;

  const result = data.result || data;

  const video =
    result.video ||
    result.videoUrl ||
    result.download_url ||
    result.url;

  const title = result.title || "YouTube Video";

  return { video, title };
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, body } = event;

  const userMsg = body || "";

  const cleanedMsg = userMsg.replace(/^khushi[\s,!.?:-]*/i, "").trim() || userMsg;

  if (
    cleanedMsg.toLowerCase().includes("song") ||
    cleanedMsg.toLowerCase().includes("music") ||
    cleanedMsg.toLowerCase().includes("play") ||
    cleanedMsg.toLowerCase().includes("video") || // NEW
    isYouTubeUrl(cleanedMsg)
  ) {
    try {

      let query;
      if (isYouTubeUrl(cleanedMsg)) {
        query = cleanedMsg.trim();
      } else {
        query = cleanedMsg.replace(/song|music|play|video/gi, "").trim();
        if (!query) {
          return api.sendMessage("Jaanu song ya video ka naam to batao 😘🎶", threadID, messageID);
        }
      }

      console.log("🎯 Khushi query:", query);

      // VIDEO MODE
      if (cleanedMsg.toLowerCase().includes("video")) {

        let videoInfo = null;

        try {
          videoInfo = await fetchVideoAPI(query);
        } catch (e) {
          console.log("⚠️ VIDEO API fail:", e.message);
        }

        if (!videoInfo) {
          return api.sendMessage("Sorry jaanu, video nahi mila 🥺💔", threadID, messageID);
        }

        const { video, title } = videoInfo;

        const filePath = __dirname + `/cache_${senderID}_${Date.now()}.mp4`;

        const response = await axios({
          url: video,
          method: "GET",
          responseType: "stream",
          headers: { "User-Agent": "Mozilla/5.0" },
          timeout: 60000
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        const stats = fs.statSync(filePath);
        const sizeMB = stats.size / (1024 * 1024);

        // ONLY SEND BELOW 21MB
        if (sizeMB > 21) {
          fs.unlinkSync(filePath);
          return api.sendMessage(
            "Jaanu ye video 21MB se zyada hai 🥺",
            threadID,
            messageID
          );
        }

        return api.sendMessage(
          {
            body: `🎬 Ye lo jaanu tumhari video 💕\n» ${title}`,
            attachment: fs.createReadStream(filePath)
          },
          threadID,
          () => { try { fs.unlinkSync(filePath); } catch (_) {} },
          messageID
        );
      }

      let songInfo = null;

      try {
        songInfo = await fetchSongAPI1(query);
        if (songInfo) console.log("📦 API-1 (ytmp3) OK");
      } catch (e) {
        console.log("⚠️ API-1 fail:", e.message);
      }

      if (!songInfo) {
        try {
          songInfo = await fetchSongAPI2(query);
          if (songInfo) console.log("📦 Fallback API-2 (dlmp3) OK");
        } catch (e) {
          console.log("⚠️ API-2 fail:", e.message);
        }
      }

      if (!songInfo) {
        return api.sendMessage("Sorry baby, ye song nahi mila 🥺💔", threadID, messageID);
      }

      const { audioUrl, title } = songInfo;

      console.log("🔗 AUDIO:", audioUrl);

      const filePath = __dirname + `/cache_${senderID}_${Date.now()}.mp3`;

      const response = await axios({
        url: audioUrl,
        method: "GET",
        responseType: "stream",
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 60000
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      return api.sendMessage(
        {
          body: `🎵 Ye lo jaanu, tumhare liye 💕\n» ${title}`,
          attachment: fs.createReadStream(filePath)
        },
        threadID,
        () => { try { fs.unlinkSync(filePath); } catch (_) {} },
        messageID
      );

    } catch (err) {
      console.error("❌ SONG/VIDEO ERROR:", err.response?.data || err.message);
      return api.sendMessage("Media laate hue chhoti si problem aa gayi 🥺", threadID, messageID);
    }
  }

  chatMemory.history[threadID] = chatMemory.history[threadID] || [];
  chatMemory.history[threadID].push(`User: ${cleanedMsg}`);
  if (chatMemory.history[threadID].length > 8) chatMemory.history[threadID].shift();

  const fullChat = chatMemory.history[threadID].join("\n");

  const prompt =
`Tumhara naam "Khushi" hai. Tumhe owner "Adi" ne banaya hai.
Tum ek pyaari, romantic, thodi flirty Hindi/Urdu bolne wali girlfriend ho.
User se Hinglish (Roman Urdu/Hindi) me romantic + thoda teasing/hot gf andaaz me reply karo.
Cute emojis use karo (😘😍🥺💕🔥🙈). Hamesha apne character me raho — bot ya AI bilkul mat bolo.

STRICT RULES:
- Reply MAX 2 line ka ho (2 line se zyada bilkul nahi).
- Jawab chhota ho, lekin pura ho — adha-adhura ya cut nahi.
- Vulgar ya explicit kuch nahi, sirf flirty/romantic gf vibe.
- Agar koi pooche "tumhe kisne banaya / owner kaun hai" — bolna: "Mujhe mere Adi ne banaya hai 💕".

Conversation:
${fullChat}

Khushi ka reply (Hinglish, max 2 line, chhota par pura, romantic + flirty gf style):`;

  try {
    const res = await axios.post(
      AI_API,
      { prompt },
      { headers: { "Content-Type": "application/json" }, timeout: 15000 }
    );

    const botReply = (res.data?.result?.answer || "Samjhi nahi jaanu, dobara bolo na 🥺").trim();

    chatMemory.history[threadID].push(`Khushi: ${botReply}`);

    return api.sendMessage(botReply, threadID, messageID);

  } catch (err) {
    console.error("❌ AI ERROR:", err.response?.data || err.message);
    return api.sendMessage("Kuch toh gadbad hai jaanu, abhi reply nahi de pa rahi 🥺", threadID, messageID);
  }
};

module.exports.handleEvent = async function ({ api, event }) {
  const { body, senderID, messageReply } = event;

  if (!body) return;

  if (senderID == api.getCurrentUserID()) return;

  const isReplyToBot =
    messageReply && messageReply.senderID == api.getCurrentUserID();

  if (isReplyToBot || body.toLowerCase().startsWith("khushi")) {
    this.run({ api, event, args: [body] });
  }
};
