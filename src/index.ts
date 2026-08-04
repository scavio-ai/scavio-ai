import { tool } from "ai";
import { z } from "zod";
import { Scavio, type ScavioConfig, type GoogleSearchOptions } from "scavio";

export interface ScavioToolConfig extends ScavioConfig {
  /**
   * Max number of items to keep in the tool's result list. Defaults to 10.
   * Trimmed inside `data` on every platform except Google, whose body is flat.
   */
  maxResults?: number;
}

function client(config?: ScavioToolConfig): Scavio {
  return new Scavio({ apiKey: config?.apiKey });
}

/**
 * Google is the ONLY family with a flat body: `organic_results` and friends sit
 * at the top level, next to `response_time` / `credits_used` / `credits_remaining`.
 */
function trimFlat(res: Record<string, unknown>, key: string, max: number): Record<string, unknown> {
  const list = res[key];
  if (Array.isArray(list) && list.length > max) {
    return { ...res, [key]: list.slice(0, max) };
  }
  return res;
}

/**
 * Every non-Google endpoint nests its payload under `data` - the response is
 * `{ data: { products: [...] }, response_time, credits_used, credits_remaining }`.
 * Trimming the top level is therefore a silent no-op, so those tools trim
 * inside `data`.
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
      return trimFlat(await c.google.search(params), "organic_results", max);
    },
  });
}

/** YouTube video search (2 credits). */
export function scavioYoutubeSearch(config?: ScavioToolConfig) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description:
      "Search YouTube for videos, channels, or playlists via the Scavio API (2 credits). Videos come back under `data.results`, with `data.channels` and `data.playlists` alongside.",
    inputSchema: z.object({
      query: z.string().describe("The search query."),
      upload_date: z.string().optional().describe("Upload date filter, e.g. 'today', 'this_week', 'this_month'."),
      type: z.string().optional().describe("Result type: 'video', 'channel', 'playlist', 'movie'."),
      duration: z.string().optional().describe("Duration filter: 'short', 'medium', 'long'."),
      sort_by: z.string().optional().describe("Sort order: 'relevance', 'date', 'view_count', 'rating'."),
      cursor: z.string().optional().describe("Pagination cursor (`next_cursor`) from a prior response."),
    }),
    execute: async ({ query, upload_date, type, duration, sort_by, cursor }) =>
      trimData(
        await c.youtube.search({ query, upload_date, type, duration, sort_by, cursor } as Parameters<
          typeof c.youtube.search
        >[0]),
        "results",
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
      trimData(
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

/**
 * Reddit post search (1 credit).
 *
 * The endpoint takes `query` and `cursor` and nothing else - it cannot sort or
 * filter by type, so no such input is offered. The API silently ignores those
 * params, which would leave a model believing it had filtered when it had not.
 */
export function scavioRedditSearch(config?: ScavioToolConfig) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description:
      "Search Reddit posts via the Scavio API (1 credit). Returns matching posts under `data.results` with `data.next_cursor` for the next page. Results cannot be sorted or filtered by type.",
    inputSchema: z.object({
      query: z.string().describe("The search query."),
      cursor: z.string().optional().describe("Pagination cursor (`next_cursor`) from a prior response."),
    }),
    execute: async ({ query, cursor }) => trimData(await c.reddit.search({ query, cursor }), "results", max),
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
    description: "Search Walmart for products via the Scavio API. Products come back under `data.products`.",
    inputSchema: z.object({
      query: z.string().describe("The product search query."),
    }),
    execute: async ({ query }) => trimData(await c.walmart.search({ query }), "products", max),
  });
}

/** TikTok video search. */
export function scavioTiktokSearch(config?: ScavioToolConfig) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description:
      "Search TikTok for videos by keyword via the Scavio API. Videos come back under `data.aweme_list`.",
    inputSchema: z.object({
      keyword: z.string().describe("The search keyword."),
      sort_type: z.enum(["0", "1"]).optional().describe("Sort order: '0' relevance, '1' most likes."),
      publish_time: z
        .enum(["0", "1", "7", "30", "90", "180"])
        .optional()
        .describe("Publish window in days: '0' all time, '1', '7', '30', '90', '180'."),
    }),
    execute: async ({ keyword, sort_type, publish_time }) =>
      trimData(
        await c.tiktok.searchVideos({
          keyword,
          sort_type,
          publish_time,
        } as Parameters<typeof c.tiktok.searchVideos>[0]),
        "aweme_list",
        max,
      ),
  });
}

/** Instagram user search. */
export function scavioInstagramSearch(config?: ScavioToolConfig) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description:
      "Search Instagram for users by keyword via the Scavio API (10 credits). Users come back under `data.users`.",
    inputSchema: z.object({
      keyword: z.string().describe("The search keyword."),
    }),
    execute: async ({ keyword }) => trimData(await c.instagram.searchUsers({ keyword }), "users", max),
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
