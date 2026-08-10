import { describe, it, expect, vi, beforeEach } from "vitest";

const search = vi.fn();
const youtubeSearch = vi.fn();
const youtubeComments = vi.fn();
const redditSearch = vi.fn();
const walmartSearch = vi.fn();
const tiktokSearch = vi.fn();
const instagramSearchUsers = vi.fn();
const amazonSearch = vi.fn();
const amazonOffers = vi.fn();
const extract_ = vi.fn();

vi.mock("scavio", () => ({
  Scavio: class {
    google = { search };
    youtube = { search: youtubeSearch, comments: youtubeComments };
    reddit = { search: redditSearch };
    amazon = { search: amazonSearch, offers: amazonOffers };
    walmart = { search: walmartSearch };
    tiktok = { searchVideos: tiktokSearch };
    instagram = { searchUsers: instagramSearchUsers };
    // extract is a TOP-LEVEL method, never a namespace: c.extract({ url }),
    // never c.extract.extract(). Mocked as a method so the wrong call throws.
    extract = extract_;
  },
}));

import {
  scavioSearch,
  scavioYoutubeSearch,
  scavioYoutubeComments,
  scavioRedditSearch,
  scavioWalmartSearch,
  scavioTiktokSearch,
  scavioInstagramSearch,
  scavioTools,
  scavioAmazonSearch,
  scavioAmazonOffers,
  scavioExtract,
} from "./index.js";

/**
 * The live envelope on every non-Google endpoint is four keys:
 * `{ data, response_time, credits_used, credits_remaining }`. The payload lives
 * inside `data`, so the mocks below use that exact shape - trimming the top
 * level would be a silent no-op against it.
 */
function envelope(data: Record<string, unknown>, credits_used = 1): Record<string, unknown> {
  return { data, response_time: 1200, credits_used, credits_remaining: 4999 };
}

describe("@scavio/ai-sdk tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scavioSearch maps params to v2 and trims organic_results", async () => {
    // Google is the one family with a flat body: no `data` wrapper.
    search.mockResolvedValue({
      organic_results: Array.from({ length: 20 }, (_, i) => ({
        title: `r${i}`,
        link: `https://x/${i}`,
        snippet: `s${i}`,
      })),
      response_time: 900,
      credits_used: 1,
      credits_remaining: 4999,
    });
    const t = scavioSearch({ apiKey: "test", maxResults: 3 });
    const out = (await t.execute!(
      { query: "agno", countryCode: "us", language: "en", page: 2 },
      {} as never,
    )) as { organic_results: Array<{ link: string; snippet: string }> };
    expect(out.organic_results).toHaveLength(3);
    expect(out.organic_results[0].link).toBe("https://x/0");
    expect(out.organic_results[0].snippet).toBe("s0");
    // v2 wire params: gl/hl/start, page 2 -> start 10.
    expect(search).toHaveBeenCalledWith({ query: "agno", gl: "us", hl: "en", start: 10 });
    // no dead v1 params leak through.
    const args = search.mock.calls[0][0];
    expect(args).not.toHaveProperty("country_code");
    expect(args).not.toHaveProperty("search_type");
    expect(args).not.toHaveProperty("light_request");
  });

  it("scavioSearch omits start on page 1 and sends only provided params", async () => {
    search.mockResolvedValue({ organic_results: [], response_time: 900, credits_used: 1, credits_remaining: 4999 });
    const t = scavioSearch({ apiKey: "test" });
    await t.execute!({ query: "agno" }, {} as never);
    expect(search).toHaveBeenCalledWith({ query: "agno" });
  });

  it("scavioYoutubeSearch trims results inside data and keeps the envelope", async () => {
    youtubeSearch.mockResolvedValue(
      envelope(
        {
          results: Array.from({ length: 20 }, (_, i) => ({ video_id: `v${i}` })),
          channels: [{ channel_id: "c1" }],
          next_cursor: "c",
          has_more: true,
        },
        2,
      ),
    );
    const t = scavioYoutubeSearch({ apiKey: "test", maxResults: 4 });
    const out = (await t.execute!({ query: "scavio", cursor: "prev" }, {} as never)) as {
      data: { results: unknown[]; next_cursor: string };
      credits_used: number;
    };
    expect(out.data.results).toHaveLength(4);
    expect(out.data.next_cursor).toBe("c");
    expect(out.credits_used).toBe(2);
    expect(youtubeSearch.mock.calls[0][0]).toMatchObject({ query: "scavio", cursor: "prev" });
  });

  it("scavioYoutubeComments trims comments inside data", async () => {
    youtubeComments.mockResolvedValue(
      envelope({
        comments: Array.from({ length: 12 }, (_, i) => ({ comment_id: `c${i}` })),
        next_cursor: null,
        has_more: false,
      }),
    );
    const t = scavioYoutubeComments({ apiKey: "test", maxResults: 2 });
    const out = (await t.execute!({ video_id: "dQw4w9WgXcQ" }, {} as never)) as {
      data: { comments: unknown[] };
    };
    expect(out.data.comments).toHaveLength(2);
  });

  // /reddit/search takes only query + cursor. A `sort` or `type` is stripped by
  // the backend, so offering one would tell a model it had filtered when it had not.
  it("scavioRedditSearch trims data.results and sends no sort/type", async () => {
    redditSearch.mockResolvedValue(
      envelope({
        results: Array.from({ length: 25 }, (_, i) => ({ post_id: `t3_${i}`, title: `p${i}` })),
        next_cursor: "abc",
        has_more: true,
      }),
    );
    const t = scavioRedditSearch({ apiKey: "test", maxResults: 5 });
    const out = (await t.execute!({ query: "serpapi alternative", cursor: "abc" }, {} as never)) as {
      data: { results: unknown[]; has_more: boolean };
      credits_used: number;
    };
    expect(out.data.results).toHaveLength(5);
    expect(out.data.has_more).toBe(true);
    // 1 credit, not 2.
    expect(out.credits_used).toBe(1);
    expect(redditSearch).toHaveBeenCalledWith({ query: "serpapi alternative", cursor: "abc" });
    const args = redditSearch.mock.calls[0][0];
    expect(args).not.toHaveProperty("sort");
    expect(args).not.toHaveProperty("type");
  });

  it("scavioWalmartSearch trims products inside data", async () => {
    walmartSearch.mockResolvedValue(
      envelope({
        products: Array.from({ length: 30 }, (_, i) => ({ id: `w${i}` })),
        products_count: 30,
      }),
    );
    const t = scavioWalmartSearch({ apiKey: "test", maxResults: 6 });
    const out = (await t.execute!({ query: "keyboard" }, {} as never)) as {
      data: { products: unknown[]; products_count: number };
    };
    expect(out.data.products).toHaveLength(6);
    expect(out.data.products_count).toBe(30);
  });

  // TikTok nests its videos under `data.aweme_list`, not `results`.
  it("scavioTiktokSearch trims aweme_list inside data", async () => {
    tiktokSearch.mockResolvedValue(
      envelope({
        aweme_list: Array.from({ length: 20 }, (_, i) => ({ aweme_id: `v${i}` })),
        cursor: 20,
        has_more: 1,
      }),
    );
    const t = scavioTiktokSearch({ apiKey: "test", maxResults: 5 });
    const out = (await t.execute!({ keyword: "scavio" }, {} as never)) as {
      data: { aweme_list: unknown[]; has_more: number };
    };
    expect(out.data.aweme_list).toHaveLength(5);
    expect(out.data.has_more).toBe(1);
    expect(tiktokSearch).toHaveBeenCalledWith({
      keyword: "scavio",
      sort_type: undefined,
      publish_time: undefined,
    });
  });

  // Instagram nests its users under `data.users`.
  it("scavioInstagramSearch trims users inside data", async () => {
    instagramSearchUsers.mockResolvedValue(
      envelope(
        {
          users: Array.from({ length: 18 }, (_, i) => ({ pk: `${i}`, username: `u${i}` })),
          count: 18,
          rank_token: "rt",
        },
        10,
      ),
    );
    const t = scavioInstagramSearch({ apiKey: "test", maxResults: 3 });
    const out = (await t.execute!({ keyword: "fashion" }, {} as never)) as {
      data: { users: unknown[]; count: number };
      credits_used: number;
    };
    expect(out.data.users).toHaveLength(3);
    expect(out.data.count).toBe(18);
    expect(out.credits_used).toBe(10);
  });

  it("scavioAmazonSearch trims products inside data", async () => {
    amazonSearch.mockResolvedValue(
      envelope({
        query: "laptop",
        count: 20,
        products: Array.from({ length: 20 }, (_, i) => ({ asin: `A${i}`, price: i })),
      }),
    );
    const t = scavioAmazonSearch({ apiKey: "test", maxResults: 4 });
    const out = (await t.execute!({ query: "laptop" }, {} as never)) as {
      data: { products: unknown[]; count: number };
      credits_used: number;
    };
    expect(out.data.products).toHaveLength(4);
    expect(out.data.count).toBe(20);
    expect(out.credits_used).toBe(1);
    expect(amazonSearch).toHaveBeenCalledWith({ query: "laptop", country: undefined });
  });

  it("scavioAmazonOffers trims offers inside data", async () => {
    amazonOffers.mockResolvedValue(
      envelope({
        asin: "B09V3KXJPB",
        total_offers: 15,
        offers: Array.from({ length: 15 }, (_, i) => ({ seller_id: `S${i}` })),
      }),
    );
    const t = scavioAmazonOffers({ apiKey: "test", maxResults: 3 });
    const out = (await t.execute!({ asin: "B09V3KXJPB", country: "gb" }, {} as never)) as {
      data: { offers: unknown[]; total_offers: number };
    };
    expect(out.data.offers).toHaveLength(3);
    expect(out.data.total_offers).toBe(15);
    expect(amazonOffers).toHaveBeenCalledWith({ asin: "B09V3KXJPB", country: "gb" });
  });

  // Extract is the one tool that returns page CONTENT rather than a result
  // list: nothing to trim, and `maxResults` must not touch it.
  it("scavioExtract sends url/format/mode and returns the page whole", async () => {
    const body = "x".repeat(50_000);
    extract_.mockResolvedValue(
      envelope({
        url: "https://example.com/pricing",
        format: "markdown",
        mode: "normal",
        content: body,
        content_length: body.length,
      }),
    );
    const t = scavioExtract({ apiKey: "test", maxResults: 3 });
    const out = (await t.execute!({ url: "https://example.com/pricing" }, {} as never)) as {
      data: { content: string; content_length: number };
      credits_used: number;
    };
    // maxResults is meaningless here - the page must survive whole.
    expect(out.data.content).toHaveLength(50_000);
    expect(out.data.content_length).toBe(50_000);
    expect(out.credits_used).toBe(1);
    expect(extract_).toHaveBeenCalledWith({
      url: "https://example.com/pricing",
      format: undefined,
      mode: undefined,
    });
  });

  // mode is the PRICE-BEARING param: normal 1, advanced 1, ultra 2.
  it("scavioExtract forwards format and mode", async () => {
    extract_.mockResolvedValue(envelope({ content: "hi", content_length: 2 }, 2));
    const t = scavioExtract({ apiKey: "test" });
    const out = (await t.execute!(
      { url: "https://example.com", format: "text", mode: "ultra" },
      {} as never,
    )) as { credits_used: number };
    expect(extract_).toHaveBeenCalledWith({
      url: "https://example.com",
      format: "text",
      mode: "ultra",
    });
    expect(out.credits_used).toBe(2);
  });

  it("scavioTools exposes every tool keyed by name", () => {
    const tools = scavioTools({ apiKey: "test" });
    expect(Object.keys(tools)).toEqual([
      "scavio_extract",
      "scavio_search",
      "scavio_youtube_search",
      "scavio_youtube_video",
      "scavio_youtube_transcript",
      "scavio_youtube_comments",
      "scavio_youtube_channel",
      "scavio_reddit_search",
      "scavio_amazon_search",
      "scavio_amazon_offers",
      "scavio_walmart_search",
      "scavio_tiktok_search",
      "scavio_instagram_search",
    ]);
    expect(Object.keys(tools)).toHaveLength(13);
  });
});
