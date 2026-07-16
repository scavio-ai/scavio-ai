import { describe, it, expect, vi, beforeEach } from "vitest";

const search = vi.fn();
const youtubeSearch = vi.fn();

const tiktokSearch = vi.fn();

vi.mock("scavio", () => ({
  Scavio: class {
    google = { search };
    youtube = { search: youtubeSearch };
    reddit = { search: vi.fn() };
    amazon = { search: vi.fn() };
    walmart = { search: vi.fn() };
    tiktok = { searchVideos: tiktokSearch };
    instagram = { searchUsers: vi.fn() };
  },
}));

import { scavioSearch, scavioTiktokSearch, scavioTools } from "./index.js";

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

  it("scavioTools exposes all seven tools keyed by name", () => {
    const tools = scavioTools({ apiKey: "test" });
    expect(Object.keys(tools)).toEqual([
      "scavio_search",
      "scavio_youtube_search",
      "scavio_reddit_search",
      "scavio_amazon_search",
      "scavio_walmart_search",
      "scavio_tiktok_search",
      "scavio_instagram_search",
    ]);
  });
});
