# @scavio/ai-sdk

Scavio search and page-extraction tools for the [Vercel AI SDK](https://sdk.vercel.ai). Give any AI
SDK agent real-time search across Google, YouTube, Reddit, Amazon, Walmart, TikTok, and Instagram --
plus `scavio_extract`, which reads any URL, and opt-in tools that map, crawl or batch-extract whole sites -- via the [Scavio](https://scavio.dev) API.

**This package exposes a curated subset of the Scavio API**, chosen for agent
use: 13 tools by default -- 12 over 7 platforms, plus the core `extract` endpoint, which
belongs to no platform -- and 5 opt-in website tools (map, crawl, batch) on top. The full surface is 195 endpoints across 31 platforms,
adding X, LinkedIn, TikTok Shop, eBay, Target, Home Depot, Zillow, Redfin,
Booking, Airbnb, Tripadvisor, Yelp, Indeed, Glassdoor, the App Store, Google
Play, SEC, Companies House, G2, Capterra, Google Ads, Meta Ad Library, Threads,
Kuaishou and the Google verticals (Maps, Shopping, News, Flights, Hotels,
Trends, AI Mode). To reach all of them, point your agent at the
[Scavio MCP server](https://scavio.dev/docs/mcp-server) at `mcp.scavio.dev` --
191 tools over every endpoint, nothing to vendor.

Credits are not uniform: most calls cost 1, YouTube search costs 2 and
transcript costs 5, Instagram costs 2 to 10 depending on the endpoint, and
`scavio_extract` is priced by the `mode` you ask for (1 / 1 / 2), not per call.

> **Amazon changed (breaking).** The upstream provider moved in 2026-07:
> `domain` is replaced by `country`, a two-letter marketplace code (`us`, `gb`
> -- the UK is `gb`, not `uk` -- `de`, `jp`, ...), and `sort_by`, `pages`,
> `category_id`, `merchant_id`, `language`, `currency`, `device`, `zip_code`
> and `autoselect_variant` are gone. The marketplace ignores all of them
> (`sort_by` returns the identical unordered set for every value), so they are
> removed rather than kept as silent no-ops. Rank and filter results yourself.

## Install

```bash
npm install @scavio/ai-sdk ai zod
export SCAVIO_API_KEY=sk_live_your_key
```

`ai` and `zod` are peer dependencies; `scavio` (the JS SDK) is bundled.

## Usage

```ts
import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { scavioSearch, scavioTools } from "@scavio/ai-sdk";

// A single tool:
const res = await generateText({
  model: openai("gpt-5.5"),
  tools: { scavio_search: scavioSearch({ maxResults: 5 }) },
  stopWhen: stepCountIs(3),
  prompt: "Find the official GitHub repo of the Agno framework",
});

// Or all tools at once:
const res2 = await generateText({
  model: openai("gpt-5.5"),
  tools: scavioTools(),
  stopWhen: stepCountIs(3),
  prompt: "Compare prices for a mechanical keyboard on Amazon and Walmart",
});
```

## Tools

| Factory | Tool name | Provider |
| --- | --- | --- |
| `scavioExtract` | `scavio_extract` | Read any URL as Markdown / text / HTML, `/api/v1/extract` (1 credit on `normal` and `advanced`, 2 on `ultra`) |
| `scavioSearch` | `scavio_search` | Google web search, `/api/v2/google` (1 credit) |
| `scavioYoutubeSearch` | `scavio_youtube_search` | YouTube video search (2 credits) |
| `scavioYoutubeVideo` | `scavio_youtube_video` | YouTube video details (1 credit) |
| `scavioYoutubeTranscript` | `scavio_youtube_transcript` | YouTube transcript / subtitles (5 credits) |
| `scavioYoutubeComments` | `scavio_youtube_comments` | YouTube video comments (1 credit) |
| `scavioYoutubeChannel` | `scavio_youtube_channel` | YouTube channel details (1 credit) |
| `scavioRedditSearch` | `scavio_reddit_search` | Reddit posts (1 credit) |
| `scavioAmazonSearch` | `scavio_amazon_search` | Amazon products (1 credit) |
| `scavioAmazonOffers` | `scavio_amazon_offers` | Amazon seller offers for one ASIN (1 credit) |
| `scavioWalmartSearch` | `scavio_walmart_search` | Walmart products (1 credit) |
| `scavioTiktokSearch` | `scavio_tiktok_search` | TikTok videos (1 credit) |
| `scavioInstagramSearch` | `scavio_instagram_search` | Instagram users (10 credits) |
| `scavioMapWebsite` | `scavio_map_website` | A site's page URLs from its sitemaps and start page, `/api/v1/extract/map` (1 credit on `normal`) |
| `scavioCrawlWebsite` | `scavio_crawl_website` | Crawl a site from one URL, every page as Markdown / text / HTML (per successful page) |
| `scavioCrawlStatus` | `scavio_crawl_status` | A crawl's progress and page results, cursor-paged (free) |
| `scavioBatchExtract` | `scavio_batch_extract` | Extract a list of URLs in one job (per successful page) |
| `scavioBatchStatus` | `scavio_batch_status` | A batch's progress and page results, cursor-paged (free) |
| `scavioTools` | all of the above (the five website tools only with `enableCrawl: true`) | bundle for `tools:` |

Each factory accepts `{ apiKey?, maxResults?, enableCrawl?, pollIntervalMs?, ...ScavioConfig }`. The key falls back to `SCAVIO_API_KEY`.
Get a key at [dashboard.scavio.dev](https://dashboard.scavio.dev) - new accounts get 50 free credits, no
credit card.

`maxResults` trims the result list in place. Google returns a flat body, so it trims
`organic_results`; every other endpoint nests its payload under `data`, so those trim inside `data`
(`data.results`, `data.products`, `data.aweme_list`, `data.users`, ...) and the
`{ data, response_time, credits_used, credits_remaining }` envelope is preserved. `scavioExtract`
ignores `maxResults`: it returns page content, not a list, so the page comes back whole.

### Reading a page

```ts
const page = await generateText({
  model: openai("gpt-5.5"),
  tools: { scavio_extract: scavioExtract() },
  stopWhen: stepCountIs(3),
  prompt: "Summarise the pricing page at https://scavio.dev/pricing",
});
```

`scavio_extract` takes `url` plus an optional `format` (`markdown` default, `text`, `html`) and
`mode`. `mode` is the price-bearing param: `normal` is the standard fetch (1 credit), `advanced`
renders JavaScript-built pages (1 credit), and `ultra` reaches the hardest pages (2 credits). Only a successful read is billed - a dead link, a bot wall or
a timeout costs nothing. See [the extract docs](https://scavio.dev/docs/extract).

These tools cover the most common surfaces. The full Scavio API - 195 endpoints across 31 platforms
(Google, YouTube, Amazon, Walmart, Reddit, TikTok, TikTok Shop, Instagram, X, LinkedIn, eBay, Target,
Home Depot, Zillow, Redfin, Booking, Airbnb, Tripadvisor, Yelp, Indeed, Glassdoor, the App Store,
Google Play, SEC, Companies House, G2, Capterra, Google Ads, Meta Ad Library, Threads and Kuaishou),
plus `extract` - is available directly through the
[`scavio`](https://www.npmjs.com/package/scavio) SDK or the [MCP server](https://scavio.dev/docs).

## Map, crawl and batch

Five opt-in tools for whole sites: `scavioTools()` adds them with
`enableCrawl: true` (off by default, because a crawl bills per page), and each
factory works on its own:

| Tool | What it does | Credits |
|---|---|---|
| `scavio_map_website` | List a site's page URLs from its sitemaps and start page, deduplicated and filtered by path or search words | 1 (normal mode; advanced up to 2, ultra up to 10) |
| `scavio_crawl_website` | Crawl a site from one URL; every same-site page as Markdown, text or HTML | per successful page |
| `scavio_crawl_status` | A crawl's progress and page results, cursor-paged | free |
| `scavio_batch_extract` | Extract a list of URLs (up to 1,000, plan-limited) in one job | per successful page |
| `scavio_batch_status` | A batch's progress and page results, cursor-paged | free |

Map answers in one call. Crawl and batch run as background jobs: the start tool
posts the job and then **waits up to `wait_seconds` (default 45, max 300)** for
it to finish, returning the job's status with its first page of results (10 by
default, `limit` up to 100) either way. A job still `queued` or `running` when
the wait ends keeps going server-side: read the rest later with the matching
status tool, the returned `data.id` and `next_cursor`. That keeps an agent turn
bounded while a large crawl (up to 6 hours) runs on.

```ts
import { scavioTools, scavioCrawlWebsite } from "@scavio/ai-sdk";

// All tools plus the five website tools:
const tools = scavioTools({ enableCrawl: true });

// Or just the crawler:
const res = await generateText({
  model: openai("gpt-5.5"),
  tools: { scavio_crawl_website: scavioCrawlWebsite() },
  stopWhen: stepCountIs(3),
  prompt: "Crawl https://hono.dev/docs (25 pages max) and list its middleware guides",
});
// The tool returns { data: { id, status: "completed" | "running", pages, credits_used, results, next_cursor } }.
```

`pollIntervalMs` (default 3000) sets how often a waiting tool checks its job.

**Pricing.** Crawl and batch bill **per successful page** at Extract's price for
the mode: `normal` (the standard fetch) and `advanced` (renders JavaScript-built
pages) 1 credit, `ultra` (the hardest pages) 2. Failed and skipped pages are
free, and if your balance runs out the job stops cleanly with
`stopped_reason: "insufficient_credits"`. Reading a job is free. Crawl and map
obey the site's robots.txt, and results are kept for 3 days.

**Plan limits** (pages per crawl / active jobs / URLs per batch): Free 10/1/10,
PAYG 100/1/50, Project 500/2/100, Bootstrap 2,000/3/500, Startup 5,000/5/1,000,
Growth 10,000/10/1,000.

Cancellation, webhooks (signed `Scavio-Signature`) and idempotency keys exist in
the `scavio` SDK (`extract.cancelCrawl`, `webhook_url`, `idempotencyKey`) and the
[REST API](https://scavio.dev/docs/extract), but are deliberately not agent tools.

## License

MIT
