# @scavio/ai-sdk

Scavio search tools for the [Vercel AI SDK](https://sdk.vercel.ai). Give any AI SDK agent real-time
search across Google, YouTube, Reddit, Amazon, Walmart, TikTok, and Instagram via the
[Scavio](https://scavio.dev) API.

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
  model: openai("gpt-4o-mini"),
  tools: { scavio_search: scavioSearch({ maxResults: 5 }) },
  stopWhen: stepCountIs(3),
  prompt: "Find the official GitHub repo of the Agno framework",
});

// Or all tools at once:
const res2 = await generateText({
  model: openai("gpt-4o-mini"),
  tools: scavioTools(),
  stopWhen: stepCountIs(3),
  prompt: "Compare prices for a mechanical keyboard on Amazon and Walmart",
});
```

## Tools

| Factory | Tool name | Provider |
| --- | --- | --- |
| `scavioSearch` | `scavio_search` | Google web search |
| `scavioYoutubeSearch` | `scavio_youtube_search` | YouTube video search |
| `scavioRedditSearch` | `scavio_reddit_search` | Reddit (2 credits) |
| `scavioAmazonSearch` | `scavio_amazon_search` | Amazon products |
| `scavioAmazonOffers` | `scavio_amazon_offers` | Amazon seller offers for one ASIN |
| `scavioWalmartSearch` | `scavio_walmart_search` | Walmart products |
| `scavioTiktokSearch` | `scavio_tiktok_search` | TikTok videos |
| `scavioInstagramSearch` | `scavio_instagram_search` | Instagram users (10 credits) |
| `scavioTools` | all of the above | bundle for `tools:` |

Each factory accepts `{ apiKey?, maxResults?, ...ScavioConfig }`. The key falls back to `SCAVIO_API_KEY`.
Get a key at [dashboard.scavio.dev](https://dashboard.scavio.dev).

## License

MIT
