const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs");

module.exports.config = {
  name: "khushi",
  version: "13.0.0",
  hasPermssion: 0,
  credits: "Uzair Rajput",
  description: "Khushi AI + Song + Video",
  commandCategory: "ai",
  usages: "khushi <message | song | video>",
  cooldowns: 2
};

const chatMemory = {
  history: {}
};

const SONG_API_1 = "https://uzairrajputapis.qzz.io/api/downloader/ytmp3";
const SONG_API_2 = "https://uzair-new-music-api.onrender.com/download/dlmp3";
const VIDEO_API  = "https://uzairrajputapis.qzz.io/api/downloader/youtube";
const SEARCH_API = "https://uzairrajputapis.qzz.io/api/search/lyrics";
const AI_API     = "https://uzairrajputapis.qzz.io/api/ai/gemini";

function isYouTubeUrl(text) {
  return /(youtube\.com|youtu\.be)/i.test(text);
}

// SEARCH
async function searchYouTube(query) {

  // SEARCH API
  try {

    const { data } = await axios.get(
      `${SEARCH_API}?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0"
        },
        timeout: 20000
      }
    );

    const result =
      data.result ||
      data.data ||
      data.results;

    let item = null;

    if (Array.isArray(result)) {
      item = result[0];
    } else if (typeof result === "object") {
      item = result;
    }

    if (item) {

      const url =
        item.url ||
        item.link ||
        item.videoUrl;

      const title =
        item.title ||
        item.name ||
        "YouTube Media";

      if (url) {

        console.log("✅ SEARCH API SUCCESS");

        return {
          url,
          title
        };
      }
    }

  } catch (e) {

    console.log(
      "❌ SEARCH API FAIL:",
      e.message
    );
  }

  // yt-search fallback
  try {

    const search = await yts(query);

    const video = search.videos?.[0];

    if (!video) return null;

    console.log("✅ yt-search SUCCESS");

    return {
      url: video.url,
      title: video.title
    };

  } catch (e) {

    console.log(
      "❌ yt-search FAIL:",
      e.message
    );

    return null;
  }
}

// SONG API 1
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
    {
      headers: {
        "Content-Type": "application/json"
      },
      timeout: 25000
    }
  );

  const audioUrl =
    dl.data?.result?.download_url;

  if (!audioUrl) return null;

  return {
    audioUrl,
    title
  };
}

// SONG API 2
async function fetchSongAPI2(query) {

  const apiUrl = isYouTubeUrl(query)
    ? `${SONG_API_2}?url=${encodeURIComponent(query.trim())}`
    : `${SONG_API_2}?q=${encodeURIComponent(query.trim())}`;

  const { data } = await axios.get(apiUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    },
    timeout: 25000
  });

  if (!data || data.success === false) {
    return null;
  }

  const audioUrl =
    data.downloadUrl ||
    data.url ||
    data.link ||
    data.audio;

  if (!audioUrl) return null;

  const title =
    data.title ||
    data.searchResult?.title ||
    "Your Song";

  return {
    audioUrl,
    title
  };
}

// VIDEO API
async function fetchVideo(query) {

  let videoUrl = "";
  let title = "YouTube Video";

  // DIRECT URL
  if (isYouTubeUrl(query)) {

    videoUrl = query.trim();

  } else {

    const found = await searchYouTube(query);

    if (!found) return null;

    videoUrl = found.url;
    title = found.title;
  }

  const { data } = await axios.post(
    VIDEO_API,
    { url: videoUrl },
    {
      headers: {
        "Content-Type": "application/json"
      },
      timeout: 30000
    }
  );

  if (!data || data.success === false) {
    return null;
  }

  const result = data.result || data;

  const video =
    result.downloadUrl ||
    result.video ||
    result.videoUrl ||
    result.download_url ||
    result.url;

  if (!video) return null;

  return {
    video,
    title: result.title || title
  };
}

module.exports.run = async function ({
  api,
  event
}) {

  const {
    threadID,
    messageID,
    senderID,
    body
  } = event;

  const userMsg = body || "";

  const cleanedMsg =
    userMsg.replace(
      /^khushi[\s,!.?:-]*/i,
      ""
    ).trim() || userMsg;

  // SONG / VIDEO MODE
  if (
    cleanedMsg.toLowerCase().includes("song") ||
    cleanedMsg.toLowerCase().includes("music") ||
    cleanedMsg.toLowerCase().includes("play") ||
    cleanedMsg.toLowerCase().includes("video") ||
    isYouTubeUrl(cleanedMsg)
  ) {

    try {

      let query;

      if (isYouTubeUrl(cleanedMsg)) {

        query = cleanedMsg.trim();

      } else {

        query = cleanedMsg
          .replace(/song|music|play|video/gi, "")
          .trim();

        if (!query) {

          return api.sendMessage(
            "Jaanu song ya video ka naam batao 😘",
            threadID,
            messageID
          );
        }
      }

      console.log("🎯 QUERY:", query);

      // VIDEO MODE
      if (
        cleanedMsg.toLowerCase().includes("video")
      ) {

        let videoInfo = null;

        try {

          videoInfo =
            await fetchVideo(query);

        } catch (e) {

          console.log(
            "❌ VIDEO ERROR:",
            e.message
          );
        }

        if (!videoInfo) {

          return api.sendMessage(
            "Sorry jaanu, video nahi mila 🥺",
            threadID,
            messageID
          );
        }

        const {
          video,
          title
        } = videoInfo;

        const filePath =
          __dirname +
          `/cache_${senderID}_${Date.now()}.mp4`;

        // DOWNLOAD VIDEO
        let response = await axios({
          url: video,
          method: "GET",
          responseType: "stream",
          headers: {
            "User-Agent": "Mozilla/5.0"
          },
          timeout: 60000
        });

        let writer =
          fs.createWriteStream(filePath);

        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        let stats = fs.statSync(filePath);

        let sizeMB =
          stats.size / (1024 * 1024);

        // BIG VIDEO
        if (sizeMB > 21) {

          console.log(
            `⚠️ BIG VIDEO ${sizeMB.toFixed(2)}MB`
          );

          try {
            fs.unlinkSync(filePath);
          } catch (_) {}

          // TRY LOW QUALITY
          const lowQualityUrl =
            video
              .replace("720", "360")
              .replace("hq", "sd");

          response = await axios({
            url: lowQualityUrl,
            method: "GET",
            responseType: "stream",
            headers: {
              "User-Agent": "Mozilla/5.0"
            },
            timeout: 60000
          });

          writer =
            fs.createWriteStream(filePath);

          response.data.pipe(writer);

          await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
          });

          stats = fs.statSync(filePath);

          sizeMB =
            stats.size / (1024 * 1024);

          // STILL BIG
          if (sizeMB > 21) {

            try {
              fs.unlinkSync(filePath);
            } catch (_) {}

            return api.sendMessage(
              "🥺 Jaanu har quality me video 21MB se badi aa rahi hai",
              threadID,
              messageID
            );
          }
        }

        // SEND VIDEO
        return api.sendMessage(
          {
            body:
              `🎬 Ye lo jaanu 💕\n» ${title}`,
            attachment:
              fs.createReadStream(filePath)
          },
          threadID,
          () => {
            try {
              fs.unlinkSync(filePath);
            } catch (_) {}
          },
          messageID
        );
      }

      // SONG MODE
      let songInfo = null;

      try {

        songInfo =
          await fetchSongAPI1(query);

      } catch (e) {

        console.log(
          "❌ SONG API 1 FAIL:",
          e.message
        );
      }

      // FALLBACK
      if (!songInfo) {

        try {

          songInfo =
            await fetchSongAPI2(query);

        } catch (e) {

          console.log(
            "❌ SONG API 2 FAIL:",
            e.message
          );
        }
      }

      if (!songInfo) {

        return api.sendMessage(
          "Sorry jaanu, song nahi mila 🥺",
          threadID,
          messageID
        );
      }

      const {
        audioUrl,
        title
      } = songInfo;

      const filePath =
        __dirname +
        `/cache_${senderID}_${Date.now()}.mp3`;

      const response = await axios({
        url: audioUrl,
        method: "GET",
        responseType: "stream",
        headers: {
          "User-Agent": "Mozilla/5.0"
        },
        timeout: 60000
      });

      const writer =
        fs.createWriteStream(filePath);

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      return api.sendMessage(
        {
          body:
            `🎵 Ye lo jaanu 💕\n» ${title}`,
          attachment:
            fs.createReadStream(filePath)
        },
        threadID,
        () => {
          try {
            fs.unlinkSync(filePath);
          } catch (_) {}
        },
        messageID
      );

    } catch (err) {

      console.error(
        "❌ MEDIA ERROR:",
        err.response?.data || err.message
      );

      return api.sendMessage(
        "Media laate hue problem aa gayi 🥺",
        threadID,
        messageID
      );
    }
  }

  // AI CHAT
  chatMemory.history[threadID] =
    chatMemory.history[threadID] || [];

  chatMemory.history[threadID].push(
    `User: ${cleanedMsg}`
  );

  if (
    chatMemory.history[threadID].length > 8
  ) {
    chatMemory.history[threadID].shift();
  }

  const fullChat =
    chatMemory.history[threadID].join("\n");

  const prompt =
`Tumhara naam "Khushi" hai.
Tumhe owner "Adi" ne banaya hai.

Tum ek cute romantic girlfriend ho 😘💕
Hamesha Hinglish me short reply do.

RULES:
- Max 2 line
- Cute emojis
- Bot ya AI mat bolo
- Vulgar nahi

Conversation:
${fullChat}

Khushi ka reply:`;

  try {

    const res = await axios.post(
      AI_API,
      { prompt },
      {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    const botReply =
      (
        res.data?.result?.answer ||
        "Samjhi nahi jaanu 🥺"
      ).trim();

    chatMemory.history[threadID].push(
      `Khushi: ${botReply}`
    );

    return api.sendMessage(
      botReply,
      threadID,
      messageID
    );

  } catch (err) {

    console.error(
      "❌ AI ERROR:",
      err.response?.data || err.message
    );

    return api.sendMessage(
      "Reply nahi de pa rahi jaanu 🥺",
      threadID,
      messageID
    );
  }
};

module.exports.handleEvent = async function ({
  api,
  event
}) {

  const {
    body,
    senderID,
    messageReply
  } = event;

  if (!body) return;

  if (
    senderID == api.getCurrentUserID()
  ) return;

  const isReplyToBot =
    messageReply &&
    messageReply.senderID ==
      api.getCurrentUserID();

  if (
    isReplyToBot ||
    body.toLowerCase().startsWith("khushi")
  ) {

    this.run({
      api,
      event
    });
  }
};
