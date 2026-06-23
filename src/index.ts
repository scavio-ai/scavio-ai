import { tool } from "ai";
import { z } from "zod";
import { Scavio, type ScavioConfig } from "scavio";

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

/** Google web search. */
export function scavioSearch(config?: ScavioToolConfig) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description:
      "Search the web with Google via the Scavio API. Returns real-time organic search results.",
    inputSchema: z.object({
      query: z.string().describe("The search query."),
      country_code: z.string().optional().describe('Two-letter country code to localize results, e.g. "us".'),
      language: z.string().optional().describe('Two-letter language code, e.g. "en".'),
    }),
    execute: async ({ query, country_code, language }) =>
      trim(await c.google.search({ query, country_code, language }), max),
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
    execute: async ({ query, sort }) => trim(await c.reddit.search({ query, sort }), max),
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
  };
}
