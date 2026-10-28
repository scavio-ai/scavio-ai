import * as ai from 'ai';
import { ScavioConfig } from 'scavio';

interface ScavioToolConfig extends ScavioConfig {
    /**
     * Max number of items to keep in the tool's result list. Defaults to 10.
     * Trimmed inside `data` on every platform except Google, whose body is flat.
     * Ignored by `scavioExtract`, which returns page content rather than a list.
     */
    maxResults?: number;
    /**
     * Add the five website tools (map, crawl, crawl status, batch extract, batch
     * status) to `scavioTools()`. Off by default: a crawl bills per page. The
     * individual factories (`scavioCrawlWebsite` and friends) work regardless.
     */
    enableCrawl?: boolean;
    /** Milliseconds between progress polls while a crawl or batch tool waits. Default 3000. */
    pollIntervalMs?: number;
}
/**
 * Read any URL (/api/v1/extract).
 *
 * The one tool here that is not tied to a platform, and the only one `maxResults`
 * does not touch: extract returns page CONTENT, not a result list, so there is
 * nothing to trim and the body is returned whole. `extract` is a TOP-LEVEL
 * method on the SDK client - `c.extract({ url })`, never `c.extract.extract()`.
 *
 * Credits are a function of `mode`, not a per-call constant: "normal" 1,
 * "advanced" 1, "ultra" 2. Only a successful read is billed.
 */
declare function scavioExtract(config?: ScavioToolConfig): ai.Tool<{
    url: string;
    format?: "html" | "markdown" | "text" | undefined;
    mode?: "normal" | "advanced" | "ultra" | undefined;
}, Record<string, unknown>>;
/** Google web search (/api/v2/google, 1 credit). */
declare function scavioSearch(config?: ScavioToolConfig): ai.Tool<{
    query: string;
    countryCode?: string | undefined;
    language?: string | undefined;
    page?: number | undefined;
    device?: "desktop" | "mobile" | undefined;
    nfpr?: boolean | undefined;
}, Record<string, unknown>>;
/** YouTube video search (2 credits). */
declare function scavioYoutubeSearch(config?: ScavioToolConfig): ai.Tool<{
    query: string;
    type?: string | undefined;
    upload_date?: string | undefined;
    duration?: string | undefined;
    sort_by?: string | undefined;
    cursor?: string | undefined;
}, Record<string, unknown>>;
/** YouTube video details (1 credit). */
declare function scavioYoutubeVideo(config?: ScavioToolConfig): ai.Tool<{
    video_id: string;
}, Record<string, unknown>>;
/** YouTube video transcript / subtitles (5 credits). */
declare function scavioYoutubeTranscript(config?: ScavioToolConfig): ai.Tool<{
    video_id: string;
    format?: "text" | "srt" | undefined;
    language?: string | undefined;
}, Record<string, unknown>>;
/** YouTube video comments (1 credit). */
declare function scavioYoutubeComments(config?: ScavioToolConfig): ai.Tool<{
    video_id: string;
    cursor?: string | undefined;
}, Record<string, unknown>>;
/** YouTube channel details (1 credit). */
declare function scavioYoutubeChannel(config?: ScavioToolConfig): ai.Tool<{
    channel_id: string;
}, Record<string, unknown>>;
/**
 * Reddit post search (1 credit).
 *
 * The endpoint takes `query` and `cursor` and nothing else - it cannot sort or
 * filter by type, so no such input is offered. The API silently ignores those
 * params, which would leave a model believing it had filtered when it had not.
 */
declare function scavioRedditSearch(config?: ScavioToolConfig): ai.Tool<{
    query: string;
    cursor?: string | undefined;
}, Record<string, unknown>>;
/**
 * Amazon product search.
 *
 * `domain` was dropped in favour of `country`, a two-letter marketplace code -
 * the Amazon endpoint changed in 2026-07 and no longer takes a domain
 * suffix. It still works on the wire as a deprecated alias, but a model should
 * only ever see one spelling of a param.
 */
declare function scavioAmazonSearch(config?: ScavioToolConfig): ai.Tool<{
    query: string;
    country?: string | undefined;
}, Record<string, unknown>>;
/** Every seller offer for one Amazon ASIN. */
declare function scavioAmazonOffers(config?: ScavioToolConfig): ai.Tool<{
    asin: string;
    country?: string | undefined;
}, Record<string, unknown>>;
/** Walmart product search. */
declare function scavioWalmartSearch(config?: ScavioToolConfig): ai.Tool<{
    query: string;
}, Record<string, unknown>>;
/** TikTok video search. */
declare function scavioTiktokSearch(config?: ScavioToolConfig): ai.Tool<{
    keyword: string;
    sort_type?: "0" | "1" | undefined;
    publish_time?: "0" | "1" | "7" | "30" | "90" | "180" | undefined;
}, Record<string, unknown>>;
/** Instagram user search. */
declare function scavioInstagramSearch(config?: ScavioToolConfig): ai.Tool<{
    keyword: string;
}, Record<string, unknown>>;
/** Map a website's URLs (/api/v1/extract/map). 1 credit on 'normal'. */
declare function scavioMapWebsite(config?: ScavioToolConfig): ai.Tool<{
    url: string;
    mode?: "normal" | "advanced" | "ultra" | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    sitemap?: "include" | "only" | "skip" | undefined;
    include_subdomains?: boolean | undefined;
    include_paths?: string[] | undefined;
    exclude_paths?: string[] | undefined;
    ignore_query_parameters?: boolean | undefined;
}, Record<string, unknown>>;
/** Crawl a website (/api/v1/extract/crawl), then wait (bounded) for it. */
declare function scavioCrawlWebsite(config?: ScavioToolConfig): ai.Tool<{
    url: string;
    format?: "html" | "markdown" | "text" | undefined;
    mode?: "normal" | "advanced" | "ultra" | undefined;
    limit?: number | undefined;
    include_content?: boolean | undefined;
    sitemap?: "include" | "only" | "skip" | undefined;
    include_paths?: string[] | undefined;
    exclude_paths?: string[] | undefined;
    ignore_query_parameters?: boolean | undefined;
    max_pages?: number | undefined;
    max_depth?: number | undefined;
    allow_subdomains?: boolean | undefined;
    wait_seconds?: number | undefined;
}, Record<string, unknown>>;
/** A crawl's progress and page results (GET /api/v1/extract/crawl/{id}). Free. */
declare function scavioCrawlStatus(config?: ScavioToolConfig): ai.Tool<{
    id: string;
    status?: "failed" | "succeeded" | "skipped" | undefined;
    cursor?: string | undefined;
    limit?: number | undefined;
    include_content?: boolean | undefined;
}, Record<string, unknown>>;
/** Extract a list of URLs in one job (/api/v1/extract/batch), then wait (bounded). */
declare function scavioBatchExtract(config?: ScavioToolConfig): ai.Tool<{
    urls: string[];
    format?: "html" | "markdown" | "text" | undefined;
    mode?: "normal" | "advanced" | "ultra" | undefined;
    limit?: number | undefined;
    include_content?: boolean | undefined;
    wait_seconds?: number | undefined;
}, Record<string, unknown>>;
/** A batch's progress and page results (GET /api/v1/extract/batch/{id}). Free. */
declare function scavioBatchStatus(config?: ScavioToolConfig): ai.Tool<{
    id: string;
    status?: "failed" | "succeeded" | "skipped" | undefined;
    cursor?: string | undefined;
    limit?: number | undefined;
    include_content?: boolean | undefined;
}, Record<string, unknown>>;
/** HEB grocery product search. */
declare function scavioHebSearch(config?: ScavioToolConfig): ai.Tool<{
    query: string;
    page?: number | undefined;
    page_size?: number | undefined;
    store_id?: string | undefined;
}, Record<string, unknown>>;
/** HEB product detail. */
declare function scavioHebProduct(config?: ScavioToolConfig): ai.Tool<{
    store_id?: string | undefined;
    product_url?: string | undefined;
    product_id?: string | undefined;
    slug?: string | undefined;
}, Record<string, unknown>>;
/** HEB store locator. */
declare function scavioHebStores(config?: ScavioToolConfig): ai.Tool<{
    zip?: string | undefined;
    city?: string | undefined;
}, Record<string, unknown>>;
/** Kroger grocery product search. */
declare function scavioKrogerSearch(config?: ScavioToolConfig): ai.Tool<{
    query: string;
    page?: number | undefined;
}, Record<string, unknown>>;
/** Kroger product detail. */
declare function scavioKrogerProduct(config?: ScavioToolConfig): ai.Tool<{
    product_url?: string | undefined;
    slug?: string | undefined;
    upc?: string | undefined;
}, Record<string, unknown>>;
/** Decathlon product search across 7 country domains. */
declare function scavioDecathlonSearch(config?: ScavioToolConfig): ai.Tool<{
    query: string;
    country: "fr" | "es" | "it" | "in" | "uk" | "pt" | "net";
    page?: number | undefined;
}, Record<string, unknown>>;
/** Decathlon product detail. */
declare function scavioDecathlonProduct(config?: ScavioToolConfig): ai.Tool<{
    country: "fr" | "es" | "it" | "in" | "uk" | "pt" | "net";
    product_url?: string | undefined;
    product_id?: string | undefined;
}, Record<string, unknown>>;
/**
 * All Scavio tools as an object keyed by tool name, ready to spread into the
 * `tools` option of `generateText` / `streamText`.
 */
declare function scavioTools(config?: ScavioToolConfig): {
    scavio_map_website?: ai.Tool<{
        url: string;
        mode?: "normal" | "advanced" | "ultra" | undefined;
        limit?: number | undefined;
        search?: string | undefined;
        sitemap?: "include" | "only" | "skip" | undefined;
        include_subdomains?: boolean | undefined;
        include_paths?: string[] | undefined;
        exclude_paths?: string[] | undefined;
        ignore_query_parameters?: boolean | undefined;
    }, Record<string, unknown>> | undefined;
    scavio_crawl_website?: ai.Tool<{
        url: string;
        format?: "html" | "markdown" | "text" | undefined;
        mode?: "normal" | "advanced" | "ultra" | undefined;
        limit?: number | undefined;
        include_content?: boolean | undefined;
        sitemap?: "include" | "only" | "skip" | undefined;
        include_paths?: string[] | undefined;
        exclude_paths?: string[] | undefined;
        ignore_query_parameters?: boolean | undefined;
        max_pages?: number | undefined;
        max_depth?: number | undefined;
        allow_subdomains?: boolean | undefined;
        wait_seconds?: number | undefined;
    }, Record<string, unknown>> | undefined;
    scavio_crawl_status?: ai.Tool<{
        id: string;
        status?: "failed" | "succeeded" | "skipped" | undefined;
        cursor?: string | undefined;
        limit?: number | undefined;
        include_content?: boolean | undefined;
    }, Record<string, unknown>> | undefined;
    scavio_batch_extract?: ai.Tool<{
        urls: string[];
        format?: "html" | "markdown" | "text" | undefined;
        mode?: "normal" | "advanced" | "ultra" | undefined;
        limit?: number | undefined;
        include_content?: boolean | undefined;
        wait_seconds?: number | undefined;
    }, Record<string, unknown>> | undefined;
    scavio_batch_status?: ai.Tool<{
        id: string;
        status?: "failed" | "succeeded" | "skipped" | undefined;
        cursor?: string | undefined;
        limit?: number | undefined;
        include_content?: boolean | undefined;
    }, Record<string, unknown>> | undefined;
    scavio_extract: ai.Tool<{
        url: string;
        format?: "html" | "markdown" | "text" | undefined;
        mode?: "normal" | "advanced" | "ultra" | undefined;
    }, Record<string, unknown>>;
    scavio_search: ai.Tool<{
        query: string;
        countryCode?: string | undefined;
        language?: string | undefined;
        page?: number | undefined;
        device?: "desktop" | "mobile" | undefined;
        nfpr?: boolean | undefined;
    }, Record<string, unknown>>;
    scavio_youtube_search: ai.Tool<{
        query: string;
        type?: string | undefined;
        upload_date?: string | undefined;
        duration?: string | undefined;
        sort_by?: string | undefined;
        cursor?: string | undefined;
    }, Record<string, unknown>>;
    scavio_youtube_video: ai.Tool<{
        video_id: string;
    }, Record<string, unknown>>;
    scavio_youtube_transcript: ai.Tool<{
        video_id: string;
        format?: "text" | "srt" | undefined;
        language?: string | undefined;
    }, Record<string, unknown>>;
    scavio_youtube_comments: ai.Tool<{
        video_id: string;
        cursor?: string | undefined;
    }, Record<string, unknown>>;
    scavio_youtube_channel: ai.Tool<{
        channel_id: string;
    }, Record<string, unknown>>;
    scavio_reddit_search: ai.Tool<{
        query: string;
        cursor?: string | undefined;
    }, Record<string, unknown>>;
    scavio_amazon_search: ai.Tool<{
        query: string;
        country?: string | undefined;
    }, Record<string, unknown>>;
    scavio_amazon_offers: ai.Tool<{
        asin: string;
        country?: string | undefined;
    }, Record<string, unknown>>;
    scavio_walmart_search: ai.Tool<{
        query: string;
    }, Record<string, unknown>>;
    scavio_tiktok_search: ai.Tool<{
        keyword: string;
        sort_type?: "0" | "1" | undefined;
        publish_time?: "0" | "1" | "7" | "30" | "90" | "180" | undefined;
    }, Record<string, unknown>>;
    scavio_instagram_search: ai.Tool<{
        keyword: string;
    }, Record<string, unknown>>;
    scavio_heb_search: ai.Tool<{
        query: string;
        page?: number | undefined;
        page_size?: number | undefined;
        store_id?: string | undefined;
    }, Record<string, unknown>>;
    scavio_heb_product: ai.Tool<{
        store_id?: string | undefined;
        product_url?: string | undefined;
        product_id?: string | undefined;
        slug?: string | undefined;
    }, Record<string, unknown>>;
    scavio_heb_stores: ai.Tool<{
        zip?: string | undefined;
        city?: string | undefined;
    }, Record<string, unknown>>;
    scavio_kroger_search: ai.Tool<{
        query: string;
        page?: number | undefined;
    }, Record<string, unknown>>;
    scavio_kroger_product: ai.Tool<{
        product_url?: string | undefined;
        slug?: string | undefined;
        upc?: string | undefined;
    }, Record<string, unknown>>;
    scavio_decathlon_search: ai.Tool<{
        query: string;
        country: "fr" | "es" | "it" | "in" | "uk" | "pt" | "net";
        page?: number | undefined;
    }, Record<string, unknown>>;
    scavio_decathlon_product: ai.Tool<{
        country: "fr" | "es" | "it" | "in" | "uk" | "pt" | "net";
        product_url?: string | undefined;
        product_id?: string | undefined;
    }, Record<string, unknown>>;
};

export { type ScavioToolConfig, scavioAmazonOffers, scavioAmazonSearch, scavioBatchExtract, scavioBatchStatus, scavioCrawlStatus, scavioCrawlWebsite, scavioDecathlonProduct, scavioDecathlonSearch, scavioExtract, scavioHebProduct, scavioHebSearch, scavioHebStores, scavioInstagramSearch, scavioKrogerProduct, scavioKrogerSearch, scavioMapWebsite, scavioRedditSearch, scavioSearch, scavioTiktokSearch, scavioTools, scavioWalmartSearch, scavioYoutubeChannel, scavioYoutubeComments, scavioYoutubeSearch, scavioYoutubeTranscript, scavioYoutubeVideo };
