"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  scavioAmazonOffers: () => scavioAmazonOffers,
  scavioAmazonSearch: () => scavioAmazonSearch,
  scavioBatchExtract: () => scavioBatchExtract,
  scavioBatchStatus: () => scavioBatchStatus,
  scavioCrawlStatus: () => scavioCrawlStatus,
  scavioCrawlWebsite: () => scavioCrawlWebsite,
  scavioExtract: () => scavioExtract,
  scavioInstagramSearch: () => scavioInstagramSearch,
  scavioMapWebsite: () => scavioMapWebsite,
  scavioRedditSearch: () => scavioRedditSearch,
  scavioSearch: () => scavioSearch,
  scavioTiktokSearch: () => scavioTiktokSearch,
  scavioTools: () => scavioTools,
  scavioWalmartSearch: () => scavioWalmartSearch,
  scavioYoutubeChannel: () => scavioYoutubeChannel,
  scavioYoutubeComments: () => scavioYoutubeComments,
  scavioYoutubeSearch: () => scavioYoutubeSearch,
  scavioYoutubeTranscript: () => scavioYoutubeTranscript,
  scavioYoutubeVideo: () => scavioYoutubeVideo
});
module.exports = __toCommonJS(index_exports);
var import_ai = require("ai");
var import_zod = require("zod");
var import_scavio = require("scavio");
function client(config) {
  return new import_scavio.Scavio({ apiKey: config?.apiKey });
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
  return (0, import_ai.tool)({
    description: "Read any web page via the Scavio API and get it back as clean Markdown (default), plain text, or raw HTML. Use it on any URL, including one returned by the search tools. Returns `data.content` alongside `data.url`, `data.format`, `data.mode` and `data.content_length`. Cost depends on `mode`: 1 credit on 'normal' and 'advanced', 2 on 'ultra'; a dead link, bot wall or timeout is not billed.",
    inputSchema: import_zod.z.object({
      url: import_zod.z.string().describe(
        "The page to read (1-2048 characters). http(s) only; a bare host is upgraded to https, and loopback, private, link-local and metadata hosts are rejected."
      ),
      format: import_zod.z.enum(["html", "markdown", "text"]).optional().describe(
        "Output format (default 'markdown'): 'markdown' is a readability extraction with page chrome stripped, 'text' is that flattened to plain text, 'html' is the raw page."
      ),
      mode: import_zod.z.enum(["normal", "advanced", "ultra"]).optional().describe(
        "Fetch tier, and the parameter that sets the price: 'normal' (default) is a plain fetch and costs 1 credit, 'advanced' renders JavaScript-built pages and costs 1, 'ultra' reaches the hardest pages and costs 2. Start on 'normal'."
      )
    }),
    execute: async ({ url, format, mode }) => c.extract({ url, format, mode })
  });
}
function scavioSearch(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return (0, import_ai.tool)({
    description: "Search the web with Google via the Scavio API (1 credit). Returns real-time organic search results, each with a title, link, and snippet, under `organic_results`.",
    inputSchema: import_zod.z.object({
      query: import_zod.z.string().describe("The search query."),
      countryCode: import_zod.z.string().optional().describe('Two-letter country code to localize results, e.g. "us".'),
      language: import_zod.z.string().optional().describe('Two-letter UI language code, e.g. "en".'),
      page: import_zod.z.number().int().optional().describe("1-based result page; page 2 starts at result 10."),
      device: import_zod.z.enum(["desktop", "mobile"]).optional().describe("Device to emulate."),
      nfpr: import_zod.z.boolean().optional().describe("Disable spelling auto-correction / similar-result substitution when true.")
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
  return (0, import_ai.tool)({
    description: "Search YouTube for videos, channels, or playlists via the Scavio API (2 credits). Videos come back under `data.results`, with `data.channels` and `data.playlists` alongside.",
    inputSchema: import_zod.z.object({
      query: import_zod.z.string().describe("The search query."),
      upload_date: import_zod.z.string().optional().describe("Upload date filter, e.g. 'today', 'this_week', 'this_month'."),
      type: import_zod.z.string().optional().describe("Result type: 'video', 'channel', 'playlist', 'movie'."),
      duration: import_zod.z.string().optional().describe("Duration filter: 'short', 'medium', 'long'."),
      sort_by: import_zod.z.string().optional().describe("Sort order: 'relevance', 'date', 'view_count', 'rating'."),
      cursor: import_zod.z.string().optional().describe("Pagination cursor (`next_cursor`) from a prior response.")
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
  return (0, import_ai.tool)({
    description: "Fetch full details for a YouTube video (title, author, view count, description, captions, chapters) via the Scavio API.",
    inputSchema: import_zod.z.object({
      video_id: import_zod.z.string().describe("YouTube video id or a full watch URL.")
    }),
    execute: async ({ video_id }) => c.youtube.video({ video_id })
  });
}
function scavioYoutubeTranscript(config) {
  const c = client(config);
  return (0, import_ai.tool)({
    description: "Fetch a YouTube video's transcript or timed subtitles via the Scavio API (8 credits).",
    inputSchema: import_zod.z.object({
      video_id: import_zod.z.string().describe("YouTube video id or a full watch URL."),
      language: import_zod.z.string().optional().describe("Transcript language code (default 'en')."),
      format: import_zod.z.enum(["text", "srt"]).optional().describe("'text' for a plain transcript, 'srt' for timed subtitles.")
    }),
    execute: async ({ video_id, language, format }) => c.youtube.transcript({ video_id, language, format })
  });
}
function scavioYoutubeComments(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return (0, import_ai.tool)({
    description: "List comments on a YouTube video via the Scavio API.",
    inputSchema: import_zod.z.object({
      video_id: import_zod.z.string().describe("YouTube video id or a full watch URL."),
      cursor: import_zod.z.string().optional().describe("Pagination cursor.")
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
  return (0, import_ai.tool)({
    description: "Fetch a YouTube channel's details (subscribers, video count, views, links) via the Scavio API.",
    inputSchema: import_zod.z.object({
      channel_id: import_zod.z.string().describe("YouTube channel id, @handle, or channel URL.")
    }),
    execute: async ({ channel_id }) => c.youtube.channel({ channel_id })
  });
}
function scavioRedditSearch(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return (0, import_ai.tool)({
    description: "Search Reddit posts via the Scavio API (1 credit). Returns matching posts under `data.results` with `data.next_cursor` for the next page. Results cannot be sorted or filtered by type.",
    inputSchema: import_zod.z.object({
      query: import_zod.z.string().describe("The search query."),
      cursor: import_zod.z.string().optional().describe("Pagination cursor (`next_cursor`) from a prior response.")
    }),
    execute: async ({ query, cursor }) => trimData(await c.reddit.search({ query, cursor }), "results", max)
  });
}
function scavioAmazonSearch(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return (0, import_ai.tool)({
    description: "Search Amazon for products via the Scavio API. Results are unsorted and cannot be filtered by category, merchant or price.",
    inputSchema: import_zod.z.object({
      query: import_zod.z.string().describe("The product search query."),
      country: import_zod.z.string().optional().describe(
        "Marketplace country code (ISO 3166-1 alpha-2), not a domain: us (default), gb (the UK is gb, not uk), de, fr, jp, ... An unknown code falls back to us."
      )
    }),
    execute: async ({ query, country }) => trimData(await c.amazon.search({ query, country }), "products", max)
  });
}
function scavioAmazonOffers(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return (0, import_ai.tool)({
    description: "List every seller offer for one Amazon ASIN via the Scavio API: price, seller, condition, shipping, and which offer holds the buy box. Page 1 only.",
    inputSchema: import_zod.z.object({
      asin: import_zod.z.string().describe("Amazon Standard Identification Number (ASIN) of the product."),
      country: import_zod.z.string().optional().describe(
        "Marketplace country code (ISO 3166-1 alpha-2), not a domain: us (default), gb (the UK is gb, not uk), de, fr, jp, ... An unknown code falls back to us."
      )
    }),
    execute: async ({ asin, country }) => trimData(await c.amazon.offers({ asin, country }), "offers", max)
  });
}
function scavioWalmartSearch(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return (0, import_ai.tool)({
    description: "Search Walmart for products via the Scavio API. Products come back under `data.products`.",
    inputSchema: import_zod.z.object({
      query: import_zod.z.string().describe("The product search query.")
    }),
    execute: async ({ query }) => trimData(await c.walmart.search({ query }), "products", max)
  });
}
function scavioTiktokSearch(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return (0, import_ai.tool)({
    description: "Search TikTok for videos by keyword via the Scavio API. Videos come back under `data.aweme_list`.",
    inputSchema: import_zod.z.object({
      keyword: import_zod.z.string().describe("The search keyword."),
      sort_type: import_zod.z.enum(["0", "1"]).optional().describe("Sort order: '0' relevance, '1' most likes."),
      publish_time: import_zod.z.enum(["0", "1", "7", "30", "90", "180"]).optional().describe("Publish window in days: '0' all time, '1', '7', '30', '90', '180'.")
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
  return (0, import_ai.tool)({
    description: "Search Instagram for users by keyword via the Scavio API (10 credits). Users come back under `data.users`.",
    inputSchema: import_zod.z.object({
      keyword: import_zod.z.string().describe("The search keyword.")
    }),
    execute: async ({ keyword }) => trimData(await c.instagram.searchUsers({ keyword }), "users", max)
  });
}
var JOB_POLL_INTERVAL_MS = 3e3;
var JOB_WAIT_DEFAULT_SECONDS = 45;
var JOB_WAIT_MAX_SECONDS = 300;
var JOB_RESULTS_DEFAULT_LIMIT = 10;
var JOB_TERMINAL = /* @__PURE__ */ new Set(["completed", "failed", "cancelled"]);
var sleep = (ms) => new Promise((resolve) => setTimeout(() => resolve(), ms));
async function waitForJob(status, id, waitSeconds, pollMs, query) {
  const deadline = Date.now() + Math.max(0, Math.min(waitSeconds, JOB_WAIT_MAX_SECONDS)) * 1e3;
  for (; ; ) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await sleep(Math.min(pollMs, remaining));
    const probe = await status(id, { limit: 1, include_content: false });
    if (JOB_TERMINAL.has(String(probe?.data?.status))) break;
  }
  return await status(id, query);
}
async function startAndWait(start, status, input, pollMs) {
  const created = await start();
  const id = created?.data?.id;
  const wait = input.wait_seconds ?? JOB_WAIT_DEFAULT_SECONDS;
  if (!id || wait <= 0) return created;
  const query = { limit: input.limit ?? JOB_RESULTS_DEFAULT_LIMIT };
  if (input.include_content !== void 0) query.include_content = input.include_content;
  return waitForJob(status, id, wait, pollMs, query);
}
var MODE_DESCRIPTION = "Fetch tier, and the parameter that sets the price: 'normal' (default) is the standard fetch, 'advanced' renders JavaScript-built pages, 'ultra' reaches the hardest pages.";
var PATHS_DESCRIPTION = "Path globs (max 20). '*' matches within one path segment, '**' across segments; a pattern without wildcards matches that path and everything under it. Example: ['/blog/**'].";
var JOB_PRICE = "Billed per SUCCESSFUL page at Extract's price for the mode: 'normal' and 'advanced' 1 credit, 'ultra' 2. Failed and skipped pages are free, and if the balance runs out the job stops cleanly.";
var jobFields = {
  format: import_zod.z.enum(["html", "markdown", "text"]).optional().describe("Format for each page, as on extract (default 'markdown')."),
  mode: import_zod.z.enum(["normal", "advanced", "ultra"]).optional().describe(MODE_DESCRIPTION),
  wait_seconds: import_zod.z.number().int().min(0).max(JOB_WAIT_MAX_SECONDS).optional().describe("Seconds to wait for the job to finish before returning, 0-300 (default 45). 0 returns the job id at once. A job still running when the wait ends keeps going; read it later with its status tool."),
  limit: import_zod.z.number().int().min(1).max(100).optional().describe("Results per response, 1-100 (default 10, to keep page content inside the context window); page on with next_cursor."),
  include_content: import_zod.z.boolean().optional().describe("Set false to list results without their page content (default true).")
};
var jobStatusSchema = import_zod.z.object({
  id: import_zod.z.string().describe("Job id returned when the job was started (data.id)."),
  cursor: import_zod.z.string().optional().describe("next_cursor from the previous response, to read the next page."),
  limit: jobFields.limit,
  status: import_zod.z.enum(["succeeded", "failed", "skipped"]).optional().describe("Only results with this status."),
  include_content: jobFields.include_content
});
function scavioMapWebsite(config) {
  const c = client(config);
  return (0, import_ai.tool)({
    description: "List a website's page URLs via the Scavio API, gathered from its sitemaps and its start page, deduplicated, filtered by path or search words and limited: `data.links` [{ url, source, lastmod }], `data.total_found`, `data.truncated`. Pages the site's robots.txt disallows are left out. Use it to find the right pages before extracting or crawling. Costs 1 credit on 'normal'; up to 2 on 'advanced' and up to 10 on 'ultra', priced by what the call needed.",
    inputSchema: import_zod.z.object({
      url: import_zod.z.string().describe("The site to map. A bare host is upgraded to https."),
      search: import_zod.z.string().optional().describe("Only return URLs containing every word of this text (case-insensitive)."),
      limit: import_zod.z.number().int().min(1).max(5e3).optional().describe("Maximum links to return, 1-5000. Default 1000 (or the plan's limit if lower: Free 500, PAYG 1,000, paid plans 5,000)."),
      sitemap: import_zod.z.enum(["include", "only", "skip"]).optional().describe("'include' combines the site's sitemaps with the start page's links (default); 'only' uses sitemaps alone; 'skip' uses page links alone."),
      include_subdomains: import_zod.z.boolean().optional().describe("Also return URLs on subdomains of the site (default false)."),
      include_paths: import_zod.z.array(import_zod.z.string()).optional().describe("Keep only URLs matching these. " + PATHS_DESCRIPTION),
      exclude_paths: import_zod.z.array(import_zod.z.string()).optional().describe("Drop URLs matching these. " + PATHS_DESCRIPTION),
      ignore_query_parameters: import_zod.z.boolean().optional().describe("Treat URLs that differ only by query string as one URL (default true)."),
      mode: jobFields.mode
    }),
    execute: async (input) => await c.extract.map(input)
  });
}
function scavioCrawlWebsite(config) {
  const c = client(config);
  const pollMs = config?.pollIntervalMs ?? JOB_POLL_INTERVAL_MS;
  return (0, import_ai.tool)({
    description: "Crawl a website from one start URL via the Scavio API: same-site pages are discovered and extracted breadth-first within the page, depth and path limits, each returned as Markdown, text or HTML. Pages the site's robots.txt disallows are skipped. Waits up to wait_seconds (default 45) and returns `data` { id, status, pages, credits_used, results, next_cursor }; if status is still queued or running, call scavio_crawl_status with the id later. " + JOB_PRICE,
    inputSchema: import_zod.z.object({
      url: import_zod.z.string().describe("Where the crawl starts. Only pages on the same site are crawled."),
      max_pages: import_zod.z.number().int().min(1).max(1e4).optional().describe("Maximum pages to fetch. Default 100. Plan limits: Free 10, PAYG 100, Project 500, Bootstrap 2,000, Startup 5,000, Growth 10,000."),
      max_depth: import_zod.z.number().int().min(0).max(10).optional().describe("How many links away from the start page to follow, 0-10 (default 3). 0 fetches only the start page."),
      include_paths: import_zod.z.array(import_zod.z.string()).optional().describe("Crawl only paths matching these. " + PATHS_DESCRIPTION),
      exclude_paths: import_zod.z.array(import_zod.z.string()).optional().describe("Skip paths matching these. " + PATHS_DESCRIPTION),
      allow_subdomains: import_zod.z.boolean().optional().describe("Also crawl subdomains of the site (default false)."),
      ignore_query_parameters: import_zod.z.boolean().optional().describe("Treat URLs that differ only by query string as one page (default true)."),
      sitemap: import_zod.z.enum(["include", "skip", "only"]).optional().describe("'include' also starts from the site's sitemap (default); 'skip' follows links only; 'only' fetches sitemap pages without following links."),
      ...jobFields
    }),
    execute: async (input) => {
      const { wait_seconds, limit, include_content, ...body } = input;
      return startAndWait(
        () => c.extract.crawl(body),
        (id, q) => c.extract.crawlStatus(id, q),
        { wait_seconds, limit, include_content },
        pollMs
      );
    }
  });
}
function scavioCrawlStatus(config) {
  const c = client(config);
  return (0, import_ai.tool)({
    description: "Read a crawl's progress and its page results by job id via the Scavio API, paged by cursor: `data` { status, stopped_reason, pages, credits_used, results: [{ url, status, content }], next_cursor }. Results are kept for 3 days after the crawl finishes. Free: reading a job costs 0 credits.",
    inputSchema: jobStatusSchema,
    execute: async ({ id, limit, ...q }) => await c.extract.crawlStatus(id, { ...q, limit: limit ?? JOB_RESULTS_DEFAULT_LIMIT })
  });
}
function scavioBatchExtract(config) {
  const c = client(config);
  const pollMs = config?.pollIntervalMs ?? JOB_POLL_INTERVAL_MS;
  return (0, import_ai.tool)({
    description: "Extract a list of URLs (up to 1,000, plan-limited) in one job via the Scavio API, each returned as Markdown, text or HTML exactly like scavio_extract. Waits up to wait_seconds (default 45) and returns `data` { id, status, pages, credits_used, results, next_cursor }; if status is still queued or running, call scavio_batch_status with the id later. " + JOB_PRICE,
    inputSchema: import_zod.z.object({
      urls: import_zod.z.array(import_zod.z.string()).min(1).max(1e3).describe("The pages to extract (duplicates removed). Plan limits: Free 10, PAYG 50, Project 100, Bootstrap 500, Startup and Growth 1,000."),
      ...jobFields
    }),
    execute: async (input) => {
      const { wait_seconds, limit, include_content, ...body } = input;
      return startAndWait(
        () => c.extract.batch(body),
        (id, q) => c.extract.batchStatus(id, q),
        { wait_seconds, limit, include_content },
        pollMs
      );
    }
  });
}
function scavioBatchStatus(config) {
  const c = client(config);
  return (0, import_ai.tool)({
    description: "Read a batch extract's progress and its page results by job id via the Scavio API, paged by cursor: `data` { status, pages, credits_used, results: [{ url, status, content }], next_cursor }. Results are kept for 3 days after the batch finishes. Free: reading a job costs 0 credits.",
    inputSchema: jobStatusSchema,
    execute: async ({ id, limit, ...q }) => await c.extract.batchStatus(id, { ...q, limit: limit ?? JOB_RESULTS_DEFAULT_LIMIT })
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
    scavio_instagram_search: scavioInstagramSearch(config),
    ...config?.enableCrawl ? {
      scavio_map_website: scavioMapWebsite(config),
      scavio_crawl_website: scavioCrawlWebsite(config),
      scavio_crawl_status: scavioCrawlStatus(config),
      scavio_batch_extract: scavioBatchExtract(config),
      scavio_batch_status: scavioBatchStatus(config)
    } : {}
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  scavioAmazonOffers,
  scavioAmazonSearch,
  scavioBatchExtract,
  scavioBatchStatus,
  scavioCrawlStatus,
  scavioCrawlWebsite,
  scavioExtract,
  scavioInstagramSearch,
  scavioMapWebsite,
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
});
//# sourceMappingURL=index.cjs.map