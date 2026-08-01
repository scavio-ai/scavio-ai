import { describe, it, expect, vi, beforeEach } from "vitest";

const search = vi.fn();
const youtubeSearch = vi.fn();

const tiktokSearch = vi.fn();
const amazonSearch = vi.fn();
const amazonOffers = vi.fn();

vi.mock("scavio", () => ({
  Scavio: class {
    google = { search };
    youtube = { search: youtubeSearch };
    reddit = { search: vi.fn() };
    amazon = { search: amazonSearch, offers: amazonOffers };
    walmart = { search: vi.fn() };
    tiktok = { searchVideos: tiktokSearch };
    instagram = { searchUsers: vi.fn() };
  },
}));

import {
  scavioSearch,
  scavioTiktokSearch,
  scavioTools,
  scavioAmazonSearch,
  scavioAmazonOffers,
} from "./index.js";

describe("@scavio/ai-sdk tools", () => {
  beforeEach(() => {
    search.mockReset();
    youtubeSearch.mockReset();
  });

  it("scavioSearch maps params to v2 and trims organic_results", async () => {
    search.mockResolvedValue({
      organic_results: Array.from({ length: 20 }, (_, i) => ({
        title: `r${i}`,
        link: `https://x/${i}`,
        snippet: `s${i}`,
      })),
      credits_used: 1,
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
    search.mockResolvedValue({ organic_results: [], credits_used: 1 });
    const t = scavioSearch({ apiKey: "test" });
    await t.execute!({ query: "agno" }, {} as never);
    expect(search).toHaveBeenCalledWith({ query: "agno" });
  });

  it("scavioTiktokSearch executes and trims results to maxResults", async () => {
    tiktokSearch.mockResolvedValue({
      results: Array.from({ length: 20 }, (_, i) => ({ id: `v${i}` })),
      credits_used: 1,
    });
    const t = scavioTiktokSearch({ apiKey: "test", maxResults: 5 });
    const out = (await t.execute!({ keyword: "scavio" }, {} as never)) as { results: unknown[] };
    expect(out.results).toHaveLength(5);
    expect(tiktokSearch).toHaveBeenCalledWith({
      keyword: "scavio",
      sort_type: undefined,
      publish_time: undefined,
    });
  });

  // Amazon nests its payload under `data`, unlike Google v2 which is flat.
  // Trimming the top level is a silent no-op there, which is exactly the bug
  // these two cover.
  it("scavioAmazonSearch trims products inside data", async () => {
    amazonSearch.mockResolvedValue({
      data: {
        query: "laptop",
        count: 20,
        products: Array.from({ length: 20 }, (_, i) => ({ asin: `A${i}`, price: i })),
      },
      response_time: 1200,
      credits_used: 1,
    });
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
    amazonOffers.mockResolvedValue({
      data: {
        asin: "B09V3KXJPB",
        total_offers: 15,
        offers: Array.from({ length: 15 }, (_, i) => ({ seller_id: `S${i}` })),
      },
      credits_used: 1,
    });
    const t = scavioAmazonOffers({ apiKey: "test", maxResults: 3 });
    const out = (await t.execute!({ asin: "B09V3KXJPB", country: "gb" }, {} as never)) as {
      data: { offers: unknown[]; total_offers: number };
    };
    expect(out.data.offers).toHaveLength(3);
    expect(out.data.total_offers).toBe(15);
    expect(amazonOffers).toHaveBeenCalledWith({ asin: "B09V3KXJPB", country: "gb" });
  });

  it("scavioTools exposes every tool keyed by name", () => {
    const tools = scavioTools({ apiKey: "test" });
    expect(Object.keys(tools)).toEqual([
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
  });
});
