// src/index.ts
import { tool } from "ai";
import { z } from "zod";
import { Scavio } from "scavio";
function client(config) {
  return new Scavio({ apiKey: config?.apiKey });
}
function trimFlat(res, key, max) {
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
function scavioExtract(config) {
  const c = client(config);
  return tool({
    description: "Read any web page via the Scavio API and get it back as clean Markdown (default), plain text, or raw HTML. Use it on any URL, including one returned by the search tools. Returns `data.content` alongside `data.url`, `data.format`, `data.mode` and `data.content_length`. Cost depends on `mode`: 1 credit on 'normal' and 'advanced', 2 on 'ultra'; a dead link, bot wall or timeout is not billed.",
    inputSchema: z.object({
      url: z.string().describe(
        "The page to read (1-2048 characters). http(s) only; a bare host is upgraded to https, and loopback, private, link-local and metadata hosts are rejected."
      ),
      format: z.enum(["html", "markdown", "text"]).optional().describe(
        "Output format (default 'markdown'): 'markdown' is a readability extraction with page chrome stripped, 'text' is that flattened to plain text, 'html' is the raw page."
      ),
      mode: z.enum(["normal", "advanced", "ultra"]).optional().describe(
        "Fetch tier, and the parameter that sets the price: 'normal' (default) is a plain fetch and costs 1 credit, 'advanced' renders the page in a browser for JS-built sites and costs 1, 'ultra' routes through residential proxies for the hardest bot walls and costs 2. Start on 'normal'."
      )
    }),
    execute: async ({ url, format, mode }) => c.extract({ url, format, mode })
  });
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
      return trimFlat(await c.google.search(params), "organic_results", max);
    }
  });
}
function scavioYoutubeSearch(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "Search YouTube for videos, channels, or playlists via the Scavio API (2 credits). Videos come back under `data.results`, with `data.channels` and `data.playlists` alongside.",
    inputSchema: z.object({
      query: z.string().describe("The search query."),
      upload_date: z.string().optional().describe("Upload date filter, e.g. 'today', 'this_week', 'this_month'."),
      type: z.string().optional().describe("Result type: 'video', 'channel', 'playlist', 'movie'."),
      duration: z.string().optional().describe("Duration filter: 'short', 'medium', 'long'."),
      sort_by: z.string().optional().describe("Sort order: 'relevance', 'date', 'view_count', 'rating'."),
      cursor: z.string().optional().describe("Pagination cursor (`next_cursor`) from a prior response.")
    }),
    execute: async ({ query, upload_date, type, duration, sort_by, cursor }) => trimData(
      await c.youtube.search({ query, upload_date, type, duration, sort_by, cursor }),
      "results",
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
    execute: async ({ video_id, cursor }) => trimData(
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
    description: "Search Reddit posts via the Scavio API (1 credit). Returns matching posts under `data.results` with `data.next_cursor` for the next page. Results cannot be sorted or filtered by type.",
    inputSchema: z.object({
      query: z.string().describe("The search query."),
      cursor: z.string().optional().describe("Pagination cursor (`next_cursor`) from a prior response.")
    }),
    execute: async ({ query, cursor }) => trimData(await c.reddit.search({ query, cursor }), "results", max)
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
    description: "Search Walmart for products via the Scavio API. Products come back under `data.products`.",
    inputSchema: z.object({
      query: z.string().describe("The product search query.")
    }),
    execute: async ({ query }) => trimData(await c.walmart.search({ query }), "products", max)
  });
}
function scavioTiktokSearch(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "Search TikTok for videos by keyword via the Scavio API. Videos come back under `data.aweme_list`.",
    inputSchema: z.object({
      keyword: z.string().describe("The search keyword."),
      sort_type: z.enum(["0", "1"]).optional().describe("Sort order: '0' relevance, '1' most likes."),
      publish_time: z.enum(["0", "1", "7", "30", "90", "180"]).optional().describe("Publish window in days: '0' all time, '1', '7', '30', '90', '180'.")
    }),
    execute: async ({ keyword, sort_type, publish_time }) => trimData(
      await c.tiktok.searchVideos({
        keyword,
        sort_type,
        publish_time
      }),
      "aweme_list",
      max
    )
  });
}
function scavioInstagramSearch(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "Search Instagram for users by keyword via the Scavio API (10 credits). Users come back under `data.users`.",
    inputSchema: z.object({
      keyword: z.string().describe("The search keyword.")
    }),
    execute: async ({ keyword }) => trimData(await c.instagram.searchUsers({ keyword }), "users", max)
  });
}
function scavioTools(config) {
  return {
    scavio_extract: scavioExtract(config),
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
  scavioExtract,
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