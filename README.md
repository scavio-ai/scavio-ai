# @scavio/ai-sdk

Scavio search tools for the [Vercel AI SDK](https://sdk.vercel.ai). Give any AI SDK agent real-time
search across Google, YouTube, Reddit, Amazon, Walmart, TikTok, and Instagram via the
[Scavio](https://scavio.dev) API.

**This package exposes a curated subset of the Scavio API**, chosen for agent
use: 12 tools over 7 platforms. The full surface is 97 billable endpoints across
ten platforms, adding X, LinkedIn, TikTok Shop and the Google verticals (Maps,
Shopping, News, Flights, Hotels, Trends, AI Mode). To reach all of them, point
your agent at the [Scavio MCP server](https://scavio.dev/docs/mcp-server) at
`mcp.scavio.dev` -- one tool per endpoint, nothing to vendor.

Credits are not uniform: most calls cost 1, YouTube search costs 2 and
transcript costs 8, and Instagram costs 2 to 10 depending on the endpoint.

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
| `scavioSearch` | `scavio_search` | Google web search, `/api/v2/google` (1 credit) |
| `scavioYoutubeSearch` | `scavio_youtube_search` | YouTube video search (2 credits) |
| `scavioYoutubeVideo` | `scavio_youtube_video` | YouTube video details (1 credit) |
| `scavioYoutubeTranscript` | `scavio_youtube_transcript` | YouTube transcript / subtitles (8 credits) |
| `scavioYoutubeComments` | `scavio_youtube_comments` | YouTube video comments (1 credit) |
| `scavioYoutubeChannel` | `scavio_youtube_channel` | YouTube channel details (1 credit) |
| `scavioRedditSearch` | `scavio_reddit_search` | Reddit posts (1 credit) |
| `scavioAmazonSearch` | `scavio_amazon_search` | Amazon products (1 credit) |
| `scavioAmazonOffers` | `scavio_amazon_offers` | Amazon seller offers for one ASIN (1 credit) |
| `scavioWalmartSearch` | `scavio_walmart_search` | Walmart products (1 credit) |
| `scavioTiktokSearch` | `scavio_tiktok_search` | TikTok videos (1 credit) |
| `scavioInstagramSearch` | `scavio_instagram_search` | Instagram users (10 credits) |
| `scavioTools` | all of the above | bundle for `tools:` |

Each factory accepts `{ apiKey?, maxResults?, ...ScavioConfig }`. The key falls back to `SCAVIO_API_KEY`.
Get a key at [dashboard.scavio.dev](https://dashboard.scavio.dev) - new accounts get 50 free credits, no
credit card.

`maxResults` trims the result list in place. Google returns a flat body, so it trims
`organic_results`; every other endpoint nests its payload under `data`, so those trim inside `data`
(`data.results`, `data.products`, `data.aweme_list`, `data.users`, ...) and the
`{ data, response_time, credits_used, credits_remaining }` envelope is preserved.

These tools cover the most common surfaces. The full Scavio API - 98 endpoints across Google,
YouTube, Amazon, Walmart, Reddit, TikTok, TikTok Shop, Instagram, X and LinkedIn - is available
directly through the [`scavio`](https://www.npmjs.com/package/scavio) SDK or the
[MCP server](https://scavio.dev/docs).

## License

MIT
