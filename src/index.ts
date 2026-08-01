import { tool } from "ai";
import { z } from "zod";
import { Scavio, type ScavioConfig, type GoogleSearchOptions } from "scavio";

export interface ScavioToolConfig extends ScavioConfig {
  /** Max number of results to keep in `results`-style lists. Defaults to 10. */
  maxResults?: number;
}

function client(config?: ScavioToolConfig): Scavio {
  return new Scavio({ apiKey: config?.apiKey });
}

function trim(res: Record<string, unknown>, max: number): Record<string, unknown> {
  const results = res.results;
  if (Array.isArray(results) && results.length > max) {
    return { ...res, results: results.slice(0, max) };
  }
  return res;
}

function trimList(res: Record<string, unknown>, key: string, max: number): Record<string, unknown> {
  const list = res[key];
  if (Array.isArray(list) && list.length > max) {
    return { ...res, [key]: list.slice(0, max) };
  }
  return res;
}

/**
 * Amazon is one of the endpoints that nests its payload under `data` - the
 * response is `{ data: { products: [...] }, response_time, credits_used, ... }`,
 * not a flat body like Google v2. Trimming the top level therefore silently
 * does nothing, so the Amazon tools trim inside `data`.
 */
function trimData(res: Record<string, unknown>, key: string, max: number): Record<string, unknown> {
  const data = res.data;
  if (!data || typeof data !== "object") return res;
  const list = (data as Record<string, unknown>)[key];
  if (Array.isArray(list) && list.length > max) {
    return { ...res, data: { ...(data as Record<string, unknown>), [key]: list.slice(0, max) } };
  }
  return res;
}

/** Google web search (/api/v2/google, 1 credit). */
export function scavioSearch(config?: ScavioToolConfig) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description:
      "Search the web with Google via the Scavio API (1 credit). Returns real-time organic search results, each with a title, link, and snippet, under `organic_results`.",
    inputSchema: z.object({
      query: z.string().describe("The search query."),
      countryCode: z.string().optional().describe('Two-letter country code to localize results, e.g. "us".'),
      language: z.string().optional().describe('Two-letter UI language code, e.g. "en".'),
      page: z.number().int().optional().describe("1-based result page; page 2 starts at result 10."),
      device: z.enum(["desktop", "mobile"]).optional().describe("Device to emulate."),
      nfpr: z.boolean().optional().describe("Disable spelling auto-correction / similar-result substitution when true."),
    }),
    execute: async ({ query, countryCode, language, page, device, nfpr }) => {
      const params: GoogleSearchOptions = { query };
      if (countryCode) params.gl = countryCode;
      if (language) params.hl = language;
      if (page && page > 1) params.start = (page - 1) * 10;
      if (device) params.device = device;
      if (nfpr !== undefined) params.nfpr = nfpr;
      return trimList(await c.google.search(params), "organic_results", max);
    },
  });
}

/** YouTube video search (2 credits). */
export function scavioYoutubeSearch(config?: ScavioToolConfig) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "Search YouTube for videos, channels, or playlists via the Scavio API (2 credits).",
    inputSchema: z.object({
      query: z.string().describe("The search query."),
      upload_date: z.string().optional().describe("Upload date filter, e.g. 'today', 'this_week', 'this_month'."),
      type: z.string().optional().describe("Result type: 'video', 'channel', 'playlist', 'movie'."),
      duration: z.string().optional().describe("Duration filter: 'short', 'medium', 'long'."),
      sort_by: z.string().optional().describe("Sort order: 'relevance', 'date', 'view_count', 'rating'."),
    }),
    execute: async ({ query, upload_date, type, duration, sort_by }) =>
      trim(
        await c.youtube.search({ query, upload_date, type, duration, sort_by } as Parameters<typeof c.youtube.search>[0]),
        max,
      ),
  });
}

/** YouTube video details (1 credit). */
export function scavioYoutubeVideo(config?: ScavioToolConfig) {
  const c = client(config);
  return tool({
    description:
      "Fetch full details for a YouTube video (title, author, view count, description, captions, chapters) via the Scavio API.",
    inputSchema: z.object({
      video_id: z.string().describe("YouTube video id or a full watch URL."),
    }),
    execute: async ({ video_id }) => c.youtube.video({ video_id }),
  });
}

/** YouTube video transcript / subtitles (8 credits). */
export function scavioYoutubeTranscript(config?: ScavioToolConfig) {
  const c = client(config);
  return tool({
    description:
      "Fetch a YouTube video's transcript or timed subtitles via the Scavio API (8 credits).",
    inputSchema: z.object({
      video_id: z.string().describe("YouTube video id or a full watch URL."),
      language: z.string().optional().describe("Transcript language code (default 'en')."),
      format: z.enum(["text", "srt"]).optional().describe("'text' for a plain transcript, 'srt' for timed subtitles."),
    }),
    execute: async ({ video_id, language, format }) =>
      c.youtube.transcript({ video_id, language, format } as Parameters<typeof c.youtube.transcript>[0]),
  });
}

/** YouTube video comments (1 credit). */
export function scavioYoutubeComments(config?: ScavioToolConfig) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "List comments on a YouTube video via the Scavio API.",
    inputSchema: z.object({
      video_id: z.string().describe("YouTube video id or a full watch URL."),
      cursor: z.string().optional().describe("Pagination cursor."),
    }),
    execute: async ({ video_id, cursor }) =>
      trimList(
        await c.youtube.comments({ video_id, cursor } as Parameters<typeof c.youtube.comments>[0]),
        "comments",
        max,
      ),
  });
}

/** YouTube channel details (1 credit). */
export function scavioYoutubeChannel(config?: ScavioToolConfig) {
  const c = client(config);
  return tool({
    description:
      "Fetch a YouTube channel's details (subscribers, video count, views, links) via the Scavio API.",
    inputSchema: z.object({
      channel_id: z.string().describe("YouTube channel id, @handle, or channel URL."),
    }),
    execute: async ({ channel_id }) => c.youtube.channel({ channel_id }),
  });
}

/** Reddit post/community search (costs 2 credits). */
export function scavioRedditSearch(config?: ScavioToolConfig) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "Search Reddit posts and communities via the Scavio API.",
    inputSchema: z.object({
      query: z.string().describe("The search query."),
      sort: z.string().optional().describe("Sort order for results."),
    }),
    execute: async ({ query, sort }) =>
      trim(await c.reddit.search({ query, sort } as Parameters<typeof c.reddit.search>[0]), max),
  });
}

/**
 * Amazon product search.
 *
 * `domain` was dropped in favour of `country`, a two-letter marketplace code -
 * the upstream provider changed in 2026-07 and no longer takes a domain
 * suffix. It still works on the wire as a deprecated alias, but a model should
 * only ever see one spelling of a param.
 */
export function scavioAmazonSearch(config?: ScavioToolConfig) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description:
      "Search Amazon for products via the Scavio API. Results are unsorted and cannot be filtered by category, merchant or price.",
    inputSchema: z.object({
      query: z.string().describe("The product search query."),
      country: z
        .string()
        .optional()
        .describe(
          "Marketplace country code (ISO 3166-1 alpha-2), not a domain: us (default), gb (the UK is gb, not uk), de, fr, jp, ... An unknown code falls back to us."
        ),
    }),
    execute: async ({ query, country }) =>
      trimData(await c.amazon.search({ query, country }), "products", max),
  });
}

/** Every seller offer for one Amazon ASIN. */
export function scavioAmazonOffers(config?: ScavioToolConfig) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description:
      "List every seller offer for one Amazon ASIN via the Scavio API: price, seller, condition, shipping, and which offer holds the buy box. Page 1 only.",
    inputSchema: z.object({
      asin: z.string().describe("Amazon Standard Identification Number (ASIN) of the product."),
      country: z
        .string()
        .optional()
        .describe(
          "Marketplace country code (ISO 3166-1 alpha-2), not a domain: us (default), gb (the UK is gb, not uk), de, fr, jp, ... An unknown code falls back to us."
        ),
    }),
    execute: async ({ asin, country }) =>
      trimData(await c.amazon.offers({ asin, country }), "offers", max),
  });
}

/** Walmart product search. */
export function scavioWalmartSearch(config?: ScavioToolConfig) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "Search Walmart for products via the Scavio API.",
    inputSchema: z.object({
      query: z.string().describe("The product search query."),
    }),
    execute: async ({ query }) => trim(await c.walmart.search({ query }), max),
  });
}

/** TikTok video search. */
export function scavioTiktokSearch(config?: ScavioToolConfig) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "Search TikTok for videos by keyword via the Scavio API.",
    inputSchema: z.object({
      keyword: z.string().describe("The search keyword."),
      sort_type: z.string().optional().describe("Sort order for results."),
      publish_time: z.string().optional().describe("Filter by publish time window."),
    }),
    execute: async ({ keyword, sort_type, publish_time }) =>
      trim(
        await c.tiktok.searchVideos({
          keyword,
          sort_type,
          publish_time,
        } as Parameters<typeof c.tiktok.searchVideos>[0]),
        max,
      ),
  });
}

/** Instagram user search. */
export function scavioInstagramSearch(config?: ScavioToolConfig) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "Search Instagram for users by keyword via the Scavio API.",
    inputSchema: z.object({
      keyword: z.string().describe("The search keyword."),
    }),
    execute: async ({ keyword }) => trim(await c.instagram.searchUsers({ keyword }), max),
  });
}

/**
 * All Scavio tools as an object keyed by tool name, ready to spread into the
 * `tools` option of `generateText` / `streamText`.
 */
export function scavioTools(config?: ScavioToolConfig) {
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
    scavio_instagram_search: scavioInstagramSearch(config),
  };
}
