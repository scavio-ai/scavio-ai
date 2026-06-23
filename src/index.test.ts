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

describe("scavio-ai tools", () => {
  beforeEach(() => {
    search.mockReset();
    youtubeSearch.mockReset();
  });

  it("scavioSearch executes and trims results to maxResults", async () => {
    search.mockResolvedValue({
      results: Array.from({ length: 20 }, (_, i) => ({ title: `r${i}`, url: `https://x/${i}` })),
      credits_used: 1,
    });
    const t = scavioSearch({ apiKey: "test", maxResults: 3 });
    const out = (await t.execute!({ query: "agno" }, {} as never)) as { results: unknown[] };
    expect(out.results).toHaveLength(3);
    expect(search).toHaveBeenCalledWith({ query: "agno", country_code: undefined, language: undefined });
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
