import { describe, it, expect, vi, beforeEach } from "vitest";

const search = vi.fn();
const youtubeSearch = vi.fn();

vi.mock("scavio", () => ({
  Scavio: class {
    google = { search };
    youtube = { search: youtubeSearch };
    reddit = { search: vi.fn() };
    amazon = { search: vi.fn() };
    walmart = { search: vi.fn() };
  },
}));

import { scavioSearch, scavioTools } from "./index.js";

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

  it("scavioTools exposes all five tools keyed by name", () => {
    const tools = scavioTools({ apiKey: "test" });
    expect(Object.keys(tools)).toEqual([
      "scavio_search",
      "scavio_youtube_search",
      "scavio_reddit_search",
      "scavio_amazon_search",
      "scavio_walmart_search",
    ]);
  });
});
