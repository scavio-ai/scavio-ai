// src/index.ts
import { tool } from "ai";
import { z } from "zod";
import { Scavio } from "scavio";
function client(config) {
  return new Scavio({ apiKey: config?.apiKey });
}
function trim(res, max) {
  const results = res.results;
  if (Array.isArray(results) && results.length > max) {
    return { ...res, results: results.slice(0, max) };
  }
  return res;
}
function trimList(res, key, max) {
  const list = res[key];
  if (Array.isArray(list) && list.length > max) {
    return { ...res, [key]: list.slice(0, max) };
  }
  return res;
}
function trimData(res, key, max) {
  const data = res.data;
  if (!data || typeof data !== "object") return res;
  const list = data[key];
  if (Array.isArray(list) && list.length > max) {
    return { ...res, data: { ...data, [key]: list.slice(0, max) } };
  }
  return res;
}
function scavioSearch(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "Search the web with Google via the Scavio API (1 credit). Returns real-time organic search results, each with a title, link, and snippet, under `organic_results`.",
    inputSchema: z.object({
      query: z.string().describe("The search query."),
      countryCode: z.string().optional().describe('Two-letter country code to localize results, e.g. "us".'),
      language: z.string().optional().describe('Two-letter UI language code, e.g. "en".'),
      page: z.number().int().optional().describe("1-based result page; page 2 starts at result 10."),
      device: z.enum(["desktop", "mobile"]).optional().describe("Device to emulate."),
      nfpr: z.boolean().optional().describe("Disable spelling auto-correction / similar-result substitution when true.")
    }),
    execute: async ({ query, countryCode, language, page, device, nfpr }) => {
      const params = { query };
      if (countryCode) params.gl = countryCode;
      if (language) params.hl = language;
      if (page && page > 1) params.start = (page - 1) * 10;
      if (device) params.device = device;
      if (nfpr !== void 0) params.nfpr = nfpr;
      return trimList(await c.google.search(params), "organic_results", max);
    }
  });
}
function scavioYoutubeSearch(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "Search YouTube for videos, channels, or playlists via the Scavio API (2 credits).",
    inputSchema: z.object({
      query: z.string().describe("The search query."),
      upload_date: z.string().optional().describe("Upload date filter, e.g. 'today', 'this_week', 'this_month'."),
      type: z.string().optional().describe("Result type: 'video', 'channel', 'playlist', 'movie'."),
      duration: z.string().optional().describe("Duration filter: 'short', 'medium', 'long'."),
      sort_by: z.string().optional().describe("Sort order: 'relevance', 'date', 'view_count', 'rating'.")
    }),
    execute: async ({ query, upload_date, type, duration, sort_by }) => trim(
      await c.youtube.search({ query, upload_date, type, duration, sort_by }),
      max
    )
  });
}
function scavioYoutubeVideo(config) {
  const c = client(config);
  return tool({
    description: "Fetch full details for a YouTube video (title, author, view count, description, captions, chapters) via the Scavio API.",
    inputSchema: z.object({
      video_id: z.string().describe("YouTube video id or a full watch URL.")
    }),
    execute: async ({ video_id }) => c.youtube.video({ video_id })
  });
}
function scavioYoutubeTranscript(config) {
  const c = client(config);
  return tool({
    description: "Fetch a YouTube video's transcript or timed subtitles via the Scavio API (8 credits).",
    inputSchema: z.object({
      video_id: z.string().describe("YouTube video id or a full watch URL."),
      language: z.string().optional().describe("Transcript language code (default 'en')."),
      format: z.enum(["text", "srt"]).optional().describe("'text' for a plain transcript, 'srt' for timed subtitles.")
    }),
    execute: async ({ video_id, language, format }) => c.youtube.transcript({ video_id, language, format })
  });
}
function scavioYoutubeComments(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "List comments on a YouTube video via the Scavio API.",
    inputSchema: z.object({
      video_id: z.string().describe("YouTube video id or a full watch URL."),
      cursor: z.string().optional().describe("Pagination cursor.")
    }),
    execute: async ({ video_id, cursor }) => trimList(
      await c.youtube.comments({ video_id, cursor }),
      "comments",
      max
    )
  });
}
function scavioYoutubeChannel(config) {
  const c = client(config);
  return tool({
    description: "Fetch a YouTube channel's details (subscribers, video count, views, links) via the Scavio API.",
    inputSchema: z.object({
      channel_id: z.string().describe("YouTube channel id, @handle, or channel URL.")
    }),
    execute: async ({ channel_id }) => c.youtube.channel({ channel_id })
  });
}
function scavioRedditSearch(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "Search Reddit posts and communities via the Scavio API.",
    inputSchema: z.object({
      query: z.string().describe("The search query."),
      sort: z.string().optional().describe("Sort order for results.")
    }),
    execute: async ({ query, sort }) => trim(await c.reddit.search({ query, sort }), max)
  });
}
function scavioAmazonSearch(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "Search Amazon for products via the Scavio API. Results are unsorted and cannot be filtered by category, merchant or price.",
    inputSchema: z.object({
      query: z.string().describe("The product search query."),
      country: z.string().optional().describe(
        "Marketplace country code (ISO 3166-1 alpha-2), not a domain: us (default), gb (the UK is gb, not uk), de, fr, jp, ... An unknown code falls back to us."
      )
    }),
    execute: async ({ query, country }) => trimData(await c.amazon.search({ query, country }), "products", max)
  });
}
function scavioAmazonOffers(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "List every seller offer for one Amazon ASIN via the Scavio API: price, seller, condition, shipping, and which offer holds the buy box. Page 1 only.",
    inputSchema: z.object({
      asin: z.string().describe("Amazon Standard Identification Number (ASIN) of the product."),
      country: z.string().optional().describe(
        "Marketplace country code (ISO 3166-1 alpha-2), not a domain: us (default), gb (the UK is gb, not uk), de, fr, jp, ... An unknown code falls back to us."
      )
    }),
    execute: async ({ asin, country }) => trimData(await c.amazon.offers({ asin, country }), "offers", max)
  });
}
function scavioWalmartSearch(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "Search Walmart for products via the Scavio API.",
    inputSchema: z.object({
      query: z.string().describe("The product search query.")
    }),
    execute: async ({ query }) => trim(await c.walmart.search({ query }), max)
  });
}
function scavioTiktokSearch(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "Search TikTok for videos by keyword via the Scavio API.",
    inputSchema: z.object({
      keyword: z.string().describe("The search keyword."),
      sort_type: z.string().optional().describe("Sort order for results."),
      publish_time: z.string().optional().describe("Filter by publish time window.")
    }),
    execute: async ({ keyword, sort_type, publish_time }) => trim(
      await c.tiktok.searchVideos({
        keyword,
        sort_type,
        publish_time
      }),
      max
    )
  });
}
function scavioInstagramSearch(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "Search Instagram for users by keyword via the Scavio API.",
    inputSchema: z.object({
      keyword: z.string().describe("The search keyword.")
    }),
    execute: async ({ keyword }) => trim(await c.instagram.searchUsers({ keyword }), max)
  });
}
function scavioTools(config) {
  return {
    scavio_search: scavioSearch(config),
    scavio_youtube_search: scavioYoutubeSearch(config),
    scavio_youtube_video: scavioYoutubeVideo(config),
    scavio_youtube_transcript: scavioYoutubeTranscript(config),
    scavio_youtube_comments: scavioYoutubeComments(config),
    scavio_youtube_channel: scavioYoutubeChannel(config),
    scavio_reddit_search: scavioRedditSearch(config),
    scavio_amazon_search: scavioAmazonSearch(config),
    scavio_amazon_offers: scavioAmazonOffers(config),
    scavio_walmart_search: scavioWalmartSearch(config),
    scavio_tiktok_search: scavioTiktokSearch(config),
    scavio_instagram_search: scavioInstagramSearch(config)
  };
}
export {
  scavioAmazonOffers,
  scavioAmazonSearch,
  scavioInstagramSearch,
  scavioRedditSearch,
  scavioSearch,
  scavioTiktokSearch,
  scavioTools,
  scavioWalmartSearch,
  scavioYoutubeChannel,
  scavioYoutubeComments,
  scavioYoutubeSearch,
  scavioYoutubeTranscript,
  scavioYoutubeVideo
};
//# sourceMappingURL=index.js.map