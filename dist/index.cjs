"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  scavioAmazonSearch: () => scavioAmazonSearch,
  scavioRedditSearch: () => scavioRedditSearch,
  scavioSearch: () => scavioSearch,
  scavioTools: () => scavioTools,
  scavioWalmartSearch: () => scavioWalmartSearch,
  scavioYoutubeSearch: () => scavioYoutubeSearch
});
module.exports = __toCommonJS(index_exports);
var import_ai = require("ai");
var import_zod = require("zod");
var import_scavio = require("scavio");
function client(config) {
  return new import_scavio.Scavio({ apiKey: config?.apiKey });
}
function trim(res, max) {
  const results = res.results;
  if (Array.isArray(results) && results.length > max) {
    return { ...res, results: results.slice(0, max) };
  }
  return res;
}
function scavioSearch(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return (0, import_ai.tool)({
    description: "Search the web with Google via the Scavio API. Returns real-time organic search results.",
    inputSchema: import_zod.z.object({
      query: import_zod.z.string().describe("The search query."),
      country_code: import_zod.z.string().optional().describe('Two-letter country code to localize results, e.g. "us".'),
      language: import_zod.z.string().optional().describe('Two-letter language code, e.g. "en".')
    }),
    execute: async ({ query, country_code, language }) => trim(await c.google.search({ query, country_code, language }), max)
  });
}
function scavioYoutubeSearch(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return (0, import_ai.tool)({
    description: "Search YouTube for videos via the Scavio API.",
    inputSchema: import_zod.z.object({
      query: import_zod.z.string().describe("The search query.")
    }),
    execute: async ({ query }) => trim(await c.youtube.search({ query }), max)
  });
}
function scavioRedditSearch(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return (0, import_ai.tool)({
    description: "Search Reddit posts and communities via the Scavio API.",
    inputSchema: import_zod.z.object({
      query: import_zod.z.string().describe("The search query."),
      sort: import_zod.z.string().optional().describe("Sort order for results.")
    }),
    execute: async ({ query, sort }) => trim(await c.reddit.search({ query, sort }), max)
  });
}
function scavioAmazonSearch(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return (0, import_ai.tool)({
    description: "Search Amazon for products via the Scavio API.",
    inputSchema: import_zod.z.object({
      query: import_zod.z.string().describe("The product search query."),
      domain: import_zod.z.string().optional().describe('Amazon domain, e.g. "amazon.com".')
    }),
    execute: async ({ query, domain }) => trim(await c.amazon.search({ query, domain }), max)
  });
}
function scavioWalmartSearch(config) {
  const c = client(config);
  const max = config?.maxResults ?? 10;
  return (0, import_ai.tool)({
    description: "Search Walmart for products via the Scavio API.",
    inputSchema: import_zod.z.object({
      query: import_zod.z.string().describe("The product search query.")
    }),
    execute: async ({ query }) => trim(await c.walmart.search({ query }), max)
  });
}
function scavioTools(config) {
  return {
    scavio_search: scavioSearch(config),
    scavio_youtube_search: scavioYoutubeSearch(config),
    scavio_reddit_search: scavioRedditSearch(config),
    scavio_amazon_search: scavioAmazonSearch(config),
    scavio_walmart_search: scavioWalmartSearch(config)
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  scavioAmazonSearch,
  scavioRedditSearch,
  scavioSearch,
  scavioTools,
  scavioWalmartSearch,
  scavioYoutubeSearch
});
//# sourceMappingURL=index.cjs.map