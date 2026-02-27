import { Effect } from "effect";
import { VisualizerService } from "../src/services/visualizer";

const port = Number.parseInt(process.env.VISUALIZER_PORT ?? "3032", 10);

const jsonResponse = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const htmlResponse = (content: string) =>
  new Response(content, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const renderPage = () => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ben Data Visualizer</title>
    <style>
      :root {
        --bg: #f3f1ec;
        --panel: #fffdf8;
        --ink: #1f1c16;
        --muted: #6c6255;
        --line: #d8cfbf;
        --accent: #004e64;
        --accent-soft: #d9eef4;
        --chip: #efe8db;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: "IBM Plex Sans", "Avenir Next", "Segoe UI", sans-serif;
        color: var(--ink);
        background: radial-gradient(circle at top right, #e2dccf, var(--bg) 45%);
      }

      .layout {
        display: grid;
        grid-template-columns: 360px 1fr;
        min-height: 100vh;
      }

      .sidebar,
      .content {
        padding: 18px;
      }

      .sidebar {
        border-right: 1px solid var(--line);
        background: color-mix(in srgb, var(--panel) 92%, #ffffff 8%);
        overflow: auto;
      }

      .content {
        overflow: auto;
      }

      h1 {
        font-size: 1.1rem;
        margin: 0 0 8px;
      }

      .subtle {
        color: var(--muted);
        font-size: 0.9rem;
        margin-bottom: 14px;
      }

      .video-list {
        display: grid;
        gap: 10px;
      }

      .video-card {
        border: 1px solid var(--line);
        border-radius: 12px;
        background: #fff;
        padding: 10px;
        cursor: pointer;
        display: grid;
        grid-template-columns: 100px 1fr;
        gap: 10px;
      }

      .video-card:hover {
        border-color: var(--accent);
      }

      .video-card.active {
        border-color: var(--accent);
        background: var(--accent-soft);
      }

      .video-card img {
        width: 100%;
        border-radius: 8px;
        aspect-ratio: 16 / 9;
        object-fit: cover;
      }

      .video-title {
        margin: 0;
        font-size: 0.92rem;
        line-height: 1.28;
      }

      .meta {
        color: var(--muted);
        font-size: 0.8rem;
      }

      .video-header {
        display: flex;
        gap: 14px;
        align-items: flex-start;
        margin-bottom: 16px;
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 14px;
        background: #fff;
      }

      .video-header img {
        width: 220px;
        max-width: 40vw;
        border-radius: 10px;
      }

      .badges {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }

      .badge {
        font-size: 0.78rem;
        padding: 4px 8px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: var(--chip);
      }

      .comments {
        display: grid;
        gap: 10px;
      }

      .comment {
        border: 1px solid var(--line);
        border-radius: 12px;
        background: #fff;
        padding: 10px;
      }

      .comment p {
        margin: 0;
        line-height: 1.35;
      }

      .comment-top {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 8px;
      }

      .empty {
        border: 1px dashed var(--line);
        border-radius: 12px;
        padding: 20px;
        color: var(--muted);
        background: #fff;
      }

      @media (max-width: 900px) {
        .layout {
          grid-template-columns: 1fr;
        }

        .sidebar {
          border-right: 0;
          border-bottom: 1px solid var(--line);
          max-height: 42vh;
        }

        .video-header {
          flex-direction: column;
        }

        .video-header img {
          width: 100%;
          max-width: unset;
        }
      }
    </style>
  </head>
  <body>
    <div class="layout">
      <aside class="sidebar">
        <h1>Ben Videos</h1>
        <div class="subtle" id="videoCount">Loading videos...</div>
        <div class="video-list" id="videoList"></div>
      </aside>
      <main class="content">
        <div id="detail" class="empty">Select a video to inspect parsed comments.</div>
      </main>
    </div>

    <script>
      const videoListEl = document.getElementById("videoList");
      const videoCountEl = document.getElementById("videoCount");
      const detailEl = document.getElementById("detail");

      let videos = [];
      let activeVideoId = null;

      const fmtDate = (iso) => new Date(iso).toLocaleString();

      const boolValue = (value) => {
        if (value === true) return "true";
        if (value === false) return "false";
        return "null";
      };

      const requestJson = async (url) => {
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Request failed");
        return data;
      };

      const makeBadge = (label) => {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = label;
        return badge;
      };

      const renderVideoList = () => {
        videoListEl.innerHTML = "";
        videoCountEl.textContent = videos.length + " videos (newest first)";

        for (const video of videos) {
          const card = document.createElement("button");
          card.type = "button";
          card.className =
            "video-card" + (video.videoId === activeVideoId ? " active" : "");

          const thumb = document.createElement("img");
          thumb.src = video.thumbnailUrl;
          thumb.alt = video.title;

          const right = document.createElement("div");
          const title = document.createElement("h2");
          title.className = "video-title";
          title.textContent = video.title;

          const meta = document.createElement("div");
          meta.className = "meta";
          meta.textContent =
            fmtDate(video.publishedAt) + " | sponsor: " + video.sponsor.name;

          const meta2 = document.createElement("div");
          meta2.className = "meta";
          meta2.textContent =
            video.viewCount.toLocaleString() +
            " views | " +
            video.commentCount.toLocaleString() +
            " comments";

          right.append(title, meta, meta2);
          card.append(thumb, right);

          card.addEventListener("click", () => loadVideoComments(video.videoId));
          videoListEl.append(card);
        }
      };

      const renderComments = (payload) => {
        detailEl.innerHTML = "";

        const header = document.createElement("section");
        header.className = "video-header";

        const thumb = document.createElement("img");
        thumb.src = payload.video.thumbnailUrl;
        thumb.alt = payload.video.title;

        const info = document.createElement("div");
        const title = document.createElement("h2");
        title.style.margin = "0 0 8px";
        title.textContent = payload.video.title;

        const meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent =
          fmtDate(payload.video.publishedAt) +
          " | sponsor: " +
          payload.video.sponsor.name;

        info.append(title, meta);
        header.append(thumb, info);
        detailEl.append(header);

        const commentsWrap = document.createElement("section");
        commentsWrap.className = "comments";

        if (payload.comments.length === 0) {
          const empty = document.createElement("div");
          empty.className = "empty";
          empty.textContent = "No comments found for this video in local data.";
          commentsWrap.append(empty);
        }

        for (const comment of payload.comments) {
          const card = document.createElement("article");
          card.className = "comment";

          const top = document.createElement("div");
          top.className = "comment-top";

          const author = document.createElement("strong");
          author.textContent = comment.author;

          const metaLine = document.createElement("span");
          metaLine.className = "meta";
          metaLine.textContent =
            fmtDate(comment.publishedAt) +
            " | " +
            comment.likeCount +
            " likes | " +
            comment.replyCount +
            " replies";

          top.append(author, metaLine);

          const text = document.createElement("p");
          text.textContent = comment.text;

          const badges = document.createElement("div");
          badges.className = "badges";
          badges.append(
            makeBadge("processed=" + boolValue(comment.isProcessed)),
            makeBadge("editingMistake=" + boolValue(comment.isEditingMistake)),
            makeBadge("sponsorMention=" + boolValue(comment.isSponsorMention)),
            makeBadge("question=" + boolValue(comment.isQuestion)),
            makeBadge("positive=" + boolValue(comment.isPositiveComment)),
          );

          card.append(top, text, badges);
          commentsWrap.append(card);
        }

        detailEl.append(commentsWrap);
      };

      const loadVideos = async () => {
        try {
          const payload = await requestJson("/api/videos");
          videos = payload.videos;
          renderVideoList();

          if (videos.length > 0) {
            await loadVideoComments(videos[0].videoId);
          }
        } catch (error) {
          videoCountEl.textContent = "Failed to load videos.";
          detailEl.className = "empty";
          detailEl.textContent = error instanceof Error ? error.message : String(error);
        }
      };

      const loadVideoComments = async (videoId) => {
        activeVideoId = videoId;
        renderVideoList();
        detailEl.className = "empty";
        detailEl.textContent = "Loading comments...";

        try {
          const payload = await requestJson(
            "/api/videos/" + encodeURIComponent(videoId) + "/comments",
          );
          detailEl.className = "";
          renderComments(payload);
        } catch (error) {
          detailEl.className = "empty";
          detailEl.textContent = error instanceof Error ? error.message : String(error);
        }
      };

      loadVideos();
    </script>
  </body>
</html>`;

const server = Bun.serve({
  port,
  fetch: async (request) => {
    const url = new URL(request.url);

    console.info("[visualizer] request", {
      method: request.method,
      path: url.pathname,
    });

    if (request.method !== "GET") {
      return jsonResponse(405, { error: "Method not allowed" });
    }

    if (url.pathname === "/") {
      return htmlResponse(renderPage());
    }

    if (url.pathname === "/api/videos") {
      const result = await VisualizerService.listVideos({
        logger: console,
      }).pipe(
        Effect.match({
          onFailure: (error) => ({ status: "error" as const, error }),
          onSuccess: (value) => ({ status: "ok" as const, value }),
        }),
        Effect.runPromise,
      );

      if (result.status === "error") {
        return jsonResponse(500, { error: result.error.message });
      }

      return jsonResponse(200, { videos: result.value });
    }

    const commentsMatch = url.pathname.match(
      /^\/api\/videos\/([^/]+)\/comments$/,
    );

    if (commentsMatch?.[1]) {
      const videoId = decodeURIComponent(commentsMatch[1]);
      const result = await VisualizerService.getVideoComments(videoId, {
        logger: console,
      }).pipe(
        Effect.match({
          onFailure: (error) => ({ status: "error" as const, error }),
          onSuccess: (value) => ({ status: "ok" as const, value }),
        }),
        Effect.runPromise,
      );

      if (result.status === "error") {
        if (result.error._tag === "VideoNotFoundError") {
          return jsonResponse(404, { error: result.error.message });
        }

        if (result.error._tag === "InvalidVideoIdError") {
          return jsonResponse(400, { error: result.error.message });
        }

        return jsonResponse(500, { error: result.error.message });
      }

      return jsonResponse(200, result.value);
    }

    return jsonResponse(404, { error: "Not found" });
  },
});

console.info(`[visualizer] server running at http://localhost:${server.port}`);
