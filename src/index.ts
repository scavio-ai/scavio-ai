import { tool } from "ai";
import { z } from "zod";
import { Scavio, type ScavioConfig, type GoogleSearchOptions } from "scavio";

export interface ScavioToolConfig extends ScavioConfig {
  /**
   * Max number of items to keep in the tool's result list. Defaults to 10.
   * Trimmed inside `data` on every platform except Google, whose body is flat.
   * Ignored by `scavioExtract`, which returns page content rather than a list.
   */
  maxResults?: number;
  /**
   * Add the five website tools (map, crawl, crawl status, batch extract, batch
   * status) to `scavioTools()`. Off by default: a crawl bills per page. The
   * individual factories (`scavioCrawlWebsite` and friends) work regardless.
   */
  enableCrawl?: boolean;
  /** Milliseconds between progress polls while a crawl or batch tool waits. Default 3000. */
  pollIntervalMs?: number;
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

/**
 * Read any URL (/api/v1/extract).
 *
 * The one tool here that is not tied to a platform, and the only one `maxResults`
 * does not touch: extract returns page CONTENT, not a result list, so there is
 * nothing to trim and the body is returned whole. `extract` is a TOP-LEVEL
 * method on the SDK client - `c.extract({ url })`, never `c.extract.extract()`.
 *
 * Credits are a function of `mode`, not a per-call constant: "normal" 1,
 * "advanced" 1, "ultra" 2. Only a successful read is billed.
 */
export function scavioExtract(config?: ScavioToolConfig) {
  const c = client(config);
  return tool({
    description:
      "Read any web page via the Scavio API and get it back as clean Markdown (default), plain text, or raw HTML. Use it on any URL, including one returned by the search tools. Returns `data.content` alongside `data.url`, `data.format`, `data.mode` and `data.content_length`. Cost depends on `mode`: 1 credit on 'normal' and 'advanced', 2 on 'ultra'; a dead link, bot wall or timeout is not billed.",
    inputSchema: z.object({
      url: z
        .string()
        .describe(
          "The page to read (1-2048 characters). http(s) only; a bare host is upgraded to https, and loopback, private, link-local and metadata hosts are rejected.",
        ),
      format: z
        .enum(["html", "markdown", "text"])
        .optional()
        .describe(
          "Output format (default 'markdown'): 'markdown' is a readability extraction with page chrome stripped, 'text' is that flattened to plain text, 'html' is the raw page.",
        ),
      mode: z
        .enum(["normal", "advanced", "ultra"])
        .optional()
        .describe(
          "Fetch tier, and the parameter that sets the price: 'normal' (default) is a plain fetch and costs 1 credit, 'advanced' renders JavaScript-built pages and costs 1, 'ultra' reaches the hardest pages and costs 2. Start on 'normal'.",
        ),
    }),
    execute: async ({ url, format, mode }) => c.extract({ url, format, mode }),
  });
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

/** YouTube video transcript / subtitles (5 credits). */
export function scavioYoutubeTranscript(config?: ScavioToolConfig) {
  const c = client(config);
  return tool({
    description:
      "Fetch a YouTube video's transcript or timed subtitles via the Scavio API (5 credits).",
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
 * the Amazon endpoint changed in 2026-07 and no longer takes a domain
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
      "Search Instagram for users by keyword via the Scavio API (2 credits). Users come back under `data.users`.",
    inputSchema: z.object({
      keyword: z.string().describe("The search keyword."),
    }),
    execute: async ({ keyword }) => trimData(await c.instagram.searchUsers({ keyword }), "users", max),
  });
}

// ---------------------------------------------------------------------------
// Website map, crawl and batch: the multi-page members of the Extract family.
//
// Map answers in one call. Crawl and batch are background jobs: the start tools
// post the job, then wait up to wait_seconds (default 45, max 300) for it to
// finish, polling progress without page content, and return the job's status
// with its first page of results either way. A job still running when the wait
// ends keeps going server-side; read the rest with the matching status tool.
// ---------------------------------------------------------------------------

const JOB_POLL_INTERVAL_MS = 3_000;
const JOB_WAIT_DEFAULT_SECONDS = 45;
const JOB_WAIT_MAX_SECONDS = 300;
const JOB_RESULTS_DEFAULT_LIMIT = 10;
const JOB_TERMINAL = new Set(["completed", "failed", "cancelled"]);

type JobQuery = {
  cursor?: string;
  limit?: number;
  status?: "succeeded" | "failed" | "skipped";
  include_content?: boolean;
};
type JobPayload = { data?: { id?: string; status?: string } } & Record<string, unknown>;
type JobStatusFn = (id: string, query: JobQuery) => Promise<unknown>;

// lib is ES2022 only (no DOM or Node types); every runtime this targets has setTimeout.
declare const setTimeout: (callback: () => void, ms: number) => unknown;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), ms));

/** Poll a job (content-free) until it finishes or the wait runs out, then read one results page. */
async function waitForJob(
  status: JobStatusFn,
  id: string,
  waitSeconds: number,
  pollMs: number,
  query: JobQuery,
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + Math.max(0, Math.min(waitSeconds, JOB_WAIT_MAX_SECONDS)) * 1000;
  for (;;) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await sleep(Math.min(pollMs, remaining));
    const probe = (await status(id, { limit: 1, include_content: false })) as JobPayload;
    if (JOB_TERMINAL.has(String(probe?.data?.status))) break;
  }
  return (await status(id, query)) as Record<string, unknown>;
}

/** Start a job, then wait for it (bounded). wait_seconds 0 returns the 202 payload. */
async function startAndWait(
  start: () => Promise<unknown>,
  status: JobStatusFn,
  input: { wait_seconds?: number; limit?: number; include_content?: boolean },
  pollMs: number,
): Promise<Record<string, unknown>> {
  const created = (await start()) as JobPayload;
  const id = created?.data?.id;
  const wait = input.wait_seconds ?? JOB_WAIT_DEFAULT_SECONDS;
  if (!id || wait <= 0) return created;
  const query: JobQuery = { limit: input.limit ?? JOB_RESULTS_DEFAULT_LIMIT };
  if (input.include_content !== undefined) query.include_content = input.include_content;
  return waitForJob(status, id, wait, pollMs, query);
}

const MODE_DESCRIPTION =
  "Fetch tier, and the parameter that sets the price: 'normal' (default) is the standard fetch, 'advanced' renders JavaScript-built pages, 'ultra' reaches the hardest pages.";
const PATHS_DESCRIPTION =
  "Path globs (max 20). '*' matches within one path segment, '**' across segments; a pattern without wildcards matches that path and everything under it. Example: ['/blog/**'].";
const JOB_PRICE =
  "Billed per SUCCESSFUL page at Extract's price for the mode: 'normal' and 'advanced' 1 credit, 'ultra' 2. Failed and skipped pages are free, and if the balance runs out the job stops cleanly.";

const jobFields = {
  format: z.enum(["html", "markdown", "text"]).optional().describe("Format for each page, as on extract (default 'markdown')."),
  mode: z.enum(["normal", "advanced", "ultra"]).optional().describe(MODE_DESCRIPTION),
  wait_seconds: z
    .number()
    .int()
    .min(0)
    .max(JOB_WAIT_MAX_SECONDS)
    .optional()
    .describe("Seconds to wait for the job to finish before returning, 0-300 (default 45). 0 returns the job id at once. A job still running when the wait ends keeps going; read it later with its status tool."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Results per response, 1-100 (default 10, to keep page content inside the context window); page on with next_cursor."),
  include_content: z.boolean().optional().describe("Set false to list results without their page content (default true)."),
};

const jobStatusSchema = z.object({
  id: z.string().describe("Job id returned when the job was started (data.id)."),
  cursor: z.string().optional().describe("next_cursor from the previous response, to read the next page."),
  limit: jobFields.limit,
  status: z.enum(["succeeded", "failed", "skipped"]).optional().describe("Only results with this status."),
  include_content: jobFields.include_content,
});

/** Map a website's URLs (/api/v1/extract/map). 1 credit on 'normal'. */
export function scavioMapWebsite(config?: ScavioToolConfig) {
  const c = client(config);
  return tool({
    description:
      "List a website's page URLs via the Scavio API, gathered from its sitemaps and its start page, deduplicated, filtered by path or search words and limited: `data.links` [{ url, source, lastmod }], `data.total_found`, `data.truncated`. Pages the site's robots.txt disallows are left out. Use it to find the right pages before extracting or crawling. Costs 1 credit on 'normal'; up to 2 on 'advanced' and up to 10 on 'ultra', priced by what the call needed.",
    inputSchema: z.object({
      url: z.string().describe("The site to map. A bare host is upgraded to https."),
      search: z.string().optional().describe("Only return URLs containing every word of this text (case-insensitive)."),
      limit: z.number().int().min(1).max(5000).optional().describe("Maximum links to return, 1-5000. Default 1000 (or the plan's limit if lower: Free 500, PAYG 1,000, paid plans 5,000)."),
      sitemap: z.enum(["include", "only", "skip"]).optional().describe("'include' combines the site's sitemaps with the start page's links (default); 'only' uses sitemaps alone; 'skip' uses page links alone."),
      include_subdomains: z.boolean().optional().describe("Also return URLs on subdomains of the site (default false)."),
      include_paths: z.array(z.string()).optional().describe("Keep only URLs matching these. " + PATHS_DESCRIPTION),
      exclude_paths: z.array(z.string()).optional().describe("Drop URLs matching these. " + PATHS_DESCRIPTION),
      ignore_query_parameters: z.boolean().optional().describe("Treat URLs that differ only by query string as one URL (default true)."),
      mode: jobFields.mode,
    }),
    execute: async (input) =>
      (await c.extract.map(input as Parameters<typeof c.extract.map>[0])) as unknown as Record<string, unknown>,
  });
}

/** Crawl a website (/api/v1/extract/crawl), then wait (bounded) for it. */
export function scavioCrawlWebsite(config?: ScavioToolConfig) {
  const c = client(config);
  const pollMs = config?.pollIntervalMs ?? JOB_POLL_INTERVAL_MS;
  return tool({
    description:
      "Crawl a website from one start URL via the Scavio API: same-site pages are discovered and extracted breadth-first within the page, depth and path limits, each returned as Markdown, text or HTML. Pages the site's robots.txt disallows are skipped. Waits up to wait_seconds (default 45) and returns `data` { id, status, pages, credits_used, results, next_cursor }; if status is still queued or running, call scavio_crawl_status with the id later. " +
      JOB_PRICE,
    inputSchema: z.object({
      url: z.string().describe("Where the crawl starts. Only pages on the same site are crawled."),
      max_pages: z.number().int().min(1).max(10000).optional().describe("Maximum pages to fetch. Default 100. Plan limits: Free 10, PAYG 100, Project 500, Bootstrap 2,000, Startup 5,000, Growth 10,000."),
      max_depth: z.number().int().min(0).max(10).optional().describe("How many links away from the start page to follow, 0-10 (default 3). 0 fetches only the start page."),
      include_paths: z.array(z.string()).optional().describe("Crawl only paths matching these. " + PATHS_DESCRIPTION),
      exclude_paths: z.array(z.string()).optional().describe("Skip paths matching these. " + PATHS_DESCRIPTION),
      allow_subdomains: z.boolean().optional().describe("Also crawl subdomains of the site (default false)."),
      ignore_query_parameters: z.boolean().optional().describe("Treat URLs that differ only by query string as one page (default true)."),
      sitemap: z.enum(["include", "skip", "only"]).optional().describe("'include' also starts from the site's sitemap (default); 'skip' follows links only; 'only' fetches sitemap pages without following links."),
      ...jobFields,
    }),
    execute: async (input) => {
      const { wait_seconds, limit, include_content, ...body } = input;
      return startAndWait(
        () => c.extract.crawl(body as Parameters<typeof c.extract.crawl>[0]),
        (id, q) => c.extract.crawlStatus(id, q),
        { wait_seconds, limit, include_content },
        pollMs,
      );
    },
  });
}

/** A crawl's progress and page results (GET /api/v1/extract/crawl/{id}). Free. */
export function scavioCrawlStatus(config?: ScavioToolConfig) {
  const c = client(config);
  return tool({
    description:
      "Read a crawl's progress and its page results by job id via the Scavio API, paged by cursor: `data` { status, stopped_reason, pages, credits_used, results: [{ url, status, content }], next_cursor }. Results are kept for 3 days after the crawl finishes. Free: reading a job costs 0 credits.",
    inputSchema: jobStatusSchema,
    execute: async ({ id, limit, ...q }) =>
      (await c.extract.crawlStatus(id, { ...q, limit: limit ?? JOB_RESULTS_DEFAULT_LIMIT })) as unknown as Record<string, unknown>,
  });
}

/** Extract a list of URLs in one job (/api/v1/extract/batch), then wait (bounded). */
export function scavioBatchExtract(config?: ScavioToolConfig) {
  const c = client(config);
  const pollMs = config?.pollIntervalMs ?? JOB_POLL_INTERVAL_MS;
  return tool({
    description:
      "Extract a list of URLs (up to 1,000, plan-limited) in one job via the Scavio API, each returned as Markdown, text or HTML exactly like scavio_extract. Waits up to wait_seconds (default 45) and returns `data` { id, status, pages, credits_used, results, next_cursor }; if status is still queued or running, call scavio_batch_status with the id later. " +
      JOB_PRICE,
    inputSchema: z.object({
      urls: z.array(z.string()).min(1).max(1000).describe("The pages to extract (duplicates removed). Plan limits: Free 10, PAYG 50, Project 100, Bootstrap 500, Startup and Growth 1,000."),
      ...jobFields,
    }),
    execute: async (input) => {
      const { wait_seconds, limit, include_content, ...body } = input;
      return startAndWait(
        () => c.extract.batch(body as Parameters<typeof c.extract.batch>[0]),
        (id, q) => c.extract.batchStatus(id, q),
        { wait_seconds, limit, include_content },
        pollMs,
      );
    },
  });
}

/** A batch's progress and page results (GET /api/v1/extract/batch/{id}). Free. */
export function scavioBatchStatus(config?: ScavioToolConfig) {
  const c = client(config);
  return tool({
    description:
      "Read a batch extract's progress and its page results by job id via the Scavio API, paged by cursor: `data` { status, pages, credits_used, results: [{ url, status, content }], next_cursor }. Results are kept for 3 days after the batch finishes. Free: reading a job costs 0 credits.",
    inputSchema: jobStatusSchema,
    execute: async ({ id, limit, ...q }) =>
      (await c.extract.batchStatus(id, { ...q, limit: limit ?? JOB_RESULTS_DEFAULT_LIMIT })) as unknown as Record<string, unknown>,
  });
}

/** HEB grocery product search. */
export function scavioHebSearch(config?: ScavioToolConfig) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "Search HEB grocery products via the Scavio API: price, sale status, unit price, UPC, stock, EBT/SNAP eligibility. Products come back under `data.products`.",
    inputSchema: z.object({
      query: z.string().describe("Search keywords (1-200 characters)."),
      page: z.number().optional().describe("Results page, 1-based."),
      page_size: z.number().optional().describe("Results per page, 1-60. Default 30."),
    }),
    execute: async (input) => trimData(await c.heb.search(input), "products", max),
  });
}

/** HEB product detail. */
export function scavioHebProduct(config?: ScavioToolConfig) {
  const c = client(config);
  return tool({
    description: "Full HEB product detail via the Scavio API: nutrition, ingredients, images, coupons, EBT/SNAP eligibility.",
    inputSchema: z.object({
      product_url: z.string().optional().describe("Full or relative product URL from heb.com. Preferred."),
      product_id: z.string().optional().describe("HEB product id. Requires slug."),
      slug: z.string().optional().describe("Product slug. Required with product_id."),
    }),
    execute: async (input) => (await c.heb.product(input)) as Record<string, unknown>,
  });
}

/** HEB store locator. */
export function scavioHebStores(config?: ScavioToolConfig) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "Find HEB stores near a ZIP code or city via the Scavio API. Stores come back under `data.stores`.",
    inputSchema: z.object({
      zip: z.string().optional().describe("5-digit US ZIP code."),
      city: z.string().optional().describe("City name. Pass zip or city."),
    }),
    execute: async (input) => trimData(await c.heb.stores(input), "stores", max),
  });
}

/** Kroger grocery product search. */
export function scavioKrogerSearch(config?: ScavioToolConfig) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "Search Kroger grocery products via the Scavio API: price, promo deals, UPC, stock, SNAP eligibility, dietary info. Kroger operates Kroger, Ralphs, Fred Meyer, Harris Teeter, King Soopers and Fry's. Products come back under `data.products`.",
    inputSchema: z.object({
      query: z.string().describe("Search keywords (1-200 characters)."),
      page: z.number().optional().describe("Results page, 1-based."),
    }),
    execute: async (input) => trimData(await c.kroger.search(input), "products", max),
  });
}

/** Kroger product detail. */
export function scavioKrogerProduct(config?: ScavioToolConfig) {
  const c = client(config);
  return tool({
    description: "Full Kroger product detail via the Scavio API: nutrition, allergens, ingredients, images, rating, dietary flags, SNAP eligibility.",
    inputSchema: z.object({
      product_url: z.string().optional().describe("Full or relative product URL from kroger.com. Preferred."),
      upc: z.string().optional().describe("Kroger product UPC."),
      slug: z.string().optional().describe("Product slug. Optional with upc."),
    }),
    execute: async (input) => (await c.kroger.product(input)) as Record<string, unknown>,
  });
}

/** Decathlon product search across 7 country domains. */
export function scavioDecathlonSearch(config?: ScavioToolConfig) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return tool({
    description: "Search Decathlon products by keyword via the Scavio API across 7 country domains (FR, ES, IT, IN, UK, PT, NET). Returns product name, brand, price (cents), currency, availability, rating, review count and image. Products come back under `data.products`.",
    inputSchema: z.object({
      query: z.string().describe("Search keywords (1-200 characters)."),
      country: z.enum(["fr", "es", "it", "in", "uk", "pt", "net"]).describe("Country domain."),
      page: z.number().optional().describe("Results page, 1-based (1-50)."),
    }),
    execute: async (input) => trimData(await c.decathlon.search(input), "products", max),
  });
}

/** Decathlon product detail. */
export function scavioDecathlonProduct(config?: ScavioToolConfig) {
  const c = client(config);
  return tool({
    description: "Full Decathlon product detail via the Scavio API: description, images, SKU, GTIN, color, price (cents), list price, availability, offers/variants, rating, review count, category and breadcrumbs.",
    inputSchema: z.object({
      product_url: z.string().optional().describe("Full or relative product URL from any Decathlon domain. Preferred."),
      product_id: z.string().optional().describe("Decathlon numeric product ID."),
      country: z.enum(["fr", "es", "it", "in", "uk", "pt", "net"]).describe("Country domain."),
    }),
    execute: async (input) => (await c.decathlon.product(input)) as Record<string, unknown>,
  });
}

/**
 * All Scavio tools as an object keyed by tool name, ready to spread into the
 * `tools` option of `generateText` / `streamText`.
 */
export function scavioTools(config?: ScavioToolConfig) {
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
    scavio_heb_search: scavioHebSearch(config),
    scavio_heb_product: scavioHebProduct(config),
    scavio_heb_stores: scavioHebStores(config),
    scavio_kroger_search: scavioKrogerSearch(config),
    scavio_kroger_product: scavioKrogerProduct(config),
    scavio_decathlon_search: scavioDecathlonSearch(config),
    scavio_decathlon_product: scavioDecathlonProduct(config),
    ...(config?.enableCrawl
      ? {
          scavio_map_website: scavioMapWebsite(config),
          scavio_crawl_website: scavioCrawlWebsite(config),
          scavio_crawl_status: scavioCrawlStatus(config),
          scavio_batch_extract: scavioBatchExtract(config),
          scavio_batch_status: scavioBatchStatus(config),
        }
      : {}),
  };
}
