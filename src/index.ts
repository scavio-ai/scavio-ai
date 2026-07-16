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

/** YouTube video search. */
export function scavioYoutubeSearch(config?: ScavioToolConfig) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "Search YouTube for videos via the Scavio API.",
    inputSchema: z.object({
      query: z.string().describe("The search query."),
    }),
    execute: async ({ query }) => trim(await c.youtube.search({ query }), max),
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

/** Amazon product search. */
export function scavioAmazonSearch(config?: ScavioToolConfig) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "Search Amazon for products via the Scavio API.",
    inputSchema: z.object({
      query: z.string().describe("The product search query."),
      domain: z.string().optional().describe('Amazon domain, e.g. "amazon.com".'),
    }),
    execute: async ({ query, domain }) => trim(await c.amazon.search({ query, domain }), max),
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
    scavio_reddit_search: scavioRedditSearch(config),
    scavio_amazon_search: scavioAmazonSearch(config),
    scavio_walmart_search: scavioWalmartSearch(config),
    scavio_tiktok_search: scavioTiktokSearch(config),
    scavio_instagram_search: scavioInstagramSearch(config),
  };
}
