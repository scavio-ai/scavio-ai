# Scavio

TypeScript SDK for the [Scavio Search API](https://scavio.dev) — real-time Google, Amazon, Walmart, YouTube, Reddit, TikTok, and Instagram data.

## Install

```bash
npm install scavio
```

## Quick Start

```typescript
import { Scavio } from "scavio";

const client = new Scavio({ apiKey: "sk_..." });

// Google search
const results = await client.search({ query: "web scraping api" });

// Amazon product lookup
const product = await client.amazon.product({ asin: "B09V3KXJPB" });

// Check usage
const usage = await client.getUsage();
```

## Configuration

```typescript
const client = new Scavio({
  apiKey: "sk_...",               // or set SCAVIO_API_KEY env var
  baseUrl: "https://api.scavio.dev", // default
  timeout: 30_000,                   // ms, default
  maxRequestsPerSecond: 1,           // 1-10, default 1
});
```

## API Reference

### Google

```typescript
await client.google.search({
  query: "web scraping",
  country_code: "us",     // optional
  language: "en",          // optional
  page: 1,                 // optional
  search_type: "news",     // optional
  device: "desktop",       // optional
  nfpr: false,             // optional — no auto-correct
  light_request: false,    // optional
});
```

### Amazon

```typescript
// Search products
await client.amazon.search({
  query: "laptop",
  domain: "amazon.com",    // optional
  country: "us",           // optional
  sort_by: "price_asc",   // optional
  pages: 1,                // optional
});

// Get product by ASIN
await client.amazon.product({
  asin: "B09V3KXJPB",
  domain: "amazon.com",    // optional
});
```

### Walmart

```typescript
// Search products
await client.walmart.search({
  query: "tv",
  min_price: 100,          // optional
  max_price: 500,          // optional
});

// Get product by ID
await client.walmart.product({
  product_id: "123456",
});
```

### YouTube

```typescript
// Search videos
await client.youtube.search({
  query: "typescript tutorial",
  upload_date: "week",     // optional
  sort_by: "relevance",   // optional
  hd: true,                // optional
});

// Get video metadata
await client.youtube.metadata({
  video_id: "dQw4w9WgXcQ",
});
```

### Reddit

```typescript
// Search posts
await client.reddit.search({
  query: "typescript",
  sort: "relevance",       // optional
  type: "link",            // optional
});

// Get specific post
await client.reddit.post({
  url: "https://reddit.com/r/typescript/comments/abc123",
});
```

### TikTok

```typescript
// User profile
await client.tiktok.profile({ username: "testuser" });

// User posts
await client.tiktok.userPosts({ sec_user_id: "abc123", count: 30 });

// Video details
await client.tiktok.video({ video_id: "vid123" });

// Video comments
await client.tiktok.videoComments({ video_id: "vid123", count: 20 });

// Comment replies
await client.tiktok.commentReplies({ video_id: "vid123", comment_id: "c456" });

// Search videos
await client.tiktok.searchVideos({ keyword: "dance", sort_type: "likes" });

// Search users
await client.tiktok.searchUsers({ keyword: "cooking" });

// Hashtag info
await client.tiktok.hashtag({ hashtag_name: "fyp" });

// Hashtag videos
await client.tiktok.hashtagVideos({ hashtag_id: "h789", count: 30 });

// User followers
await client.tiktok.userFollowers({ sec_user_id: "abc123" });

// User followings
await client.tiktok.userFollowings({ sec_user_id: "abc123" });
```

### Instagram

```typescript
// User profile
await client.instagram.profile({ username: "instagram" });

// User posts / reels / tagged
await client.instagram.userPosts({ username: "instagram", count: 12 });
await client.instagram.userReels({ username: "instagram" });
await client.instagram.userTagged({ username: "instagram" });

// User stories
await client.instagram.userStories({ username: "instagram" });

// Post detail (by url, media_id, or shortcode)
await client.instagram.post({ shortcode: "DUajw4YkorV" });

// Post comments and replies
await client.instagram.postComments({ shortcode: "DUajw4YkorV", sort_order: "newest" });
await client.instagram.commentReplies({ media_id: "123", comment_id: "456" });

// Search
await client.instagram.searchUsers({ keyword: "justin" });
await client.instagram.searchHashtags({ keyword: "fashion" });

// Followers / followings
await client.instagram.userFollowers({ username: "instagram", count: 50 });
await client.instagram.userFollowings({ username: "instagram" });
```

### Usage

```typescript
const usage = await client.getUsage();
```

## Error Handling

```typescript
import { Scavio, InvalidAPIKeyError, RateLimitError } from "scavio";

try {
  const results = await client.search({ query: "test" });
} catch (error) {
  if (error instanceof InvalidAPIKeyError) {
    // 401 — bad API key
  } else if (error instanceof RateLimitError) {
    // 429 — too many requests
  }
}
```

All error classes:

| Class | HTTP Status | Description |
|-------|------------|-------------|
| `MissingAPIKeyError` | — | No API key provided |
| `InvalidAPIKeyError` | 401 | Invalid API key |
| `InsufficientCreditsError` | 402 | No credits remaining |
| `BadRequestError` | 400 | Invalid request parameters |
| `RateLimitError` | 429 | Rate limit exceeded |
| `ScavioAPIError` | other | Catch-all (has `.statusCode`) |

## Runtime Support

- Node.js 18+
- Deno
- Bun

Zero dependencies — uses native `fetch`.

## License

MIT


## About Scavio

[Scavio](https://scavio.dev) is a unified [search API](https://scavio.dev/docs/search-api) built for AI agents — one API key, structured JSON, no scraping or proxies. A real-time [Tavily alternative](https://scavio.dev) and [SerpAPI alternative](https://scavio.dev) with data from:

- [Google Search API](https://scavio.dev/docs/search-api) — SERP results, news, images, maps, and knowledge graph
- [Amazon Product API](https://scavio.dev/docs/amazon-api) and [Walmart API](https://scavio.dev/docs/walmart-api) — product search and details
- [YouTube API](https://scavio.dev/docs/youtube-api), [TikTok API](https://scavio.dev/docs/tiktok-api), and [Instagram API](https://scavio.dev/docs/instagram-api) — video and social media data
- [Reddit API](https://scavio.dev/docs/reddit-api) — posts and threaded comments

Get a free [API key](https://dashboard.scavio.dev) and explore the [documentation](https://scavio.dev/docs/introduction).
