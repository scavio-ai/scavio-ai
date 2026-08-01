import * as ai from 'ai';
import { ScavioConfig } from 'scavio';

interface ScavioToolConfig extends ScavioConfig {
    /** Max number of results to keep in `results`-style lists. Defaults to 10. */
    maxResults?: number;
}
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
}, Record<string, unknown>>;
/** YouTube video details (1 credit). */
declare function scavioYoutubeVideo(config?: ScavioToolConfig): ai.Tool<{
    video_id: string;
}, Record<string, unknown>>;
/** YouTube video transcript / subtitles (8 credits). */
declare function scavioYoutubeTranscript(config?: ScavioToolConfig): ai.Tool<{
    video_id: string;
    language?: string | undefined;
    format?: "text" | "srt" | undefined;
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
/** Reddit post/community search (costs 2 credits). */
declare function scavioRedditSearch(config?: ScavioToolConfig): ai.Tool<{
    query: string;
    sort?: string | undefined;
}, Record<string, unknown>>;
/**
 * Amazon product search.
 *
 * `domain` was dropped in favour of `country`, a two-letter marketplace code -
 * the upstream provider changed in 2026-07 and no longer takes a domain
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
    sort_type?: string | undefined;
    publish_time?: string | undefined;
}, Record<string, unknown>>;
/** Instagram user search. */
declare function scavioInstagramSearch(config?: ScavioToolConfig): ai.Tool<{
    keyword: string;
}, Record<string, unknown>>;
/**
 * All Scavio tools as an object keyed by tool name, ready to spread into the
 * `tools` option of `generateText` / `streamText`.
 */
declare function scavioTools(config?: ScavioToolConfig): {
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
    }, Record<string, unknown>>;
    scavio_youtube_video: ai.Tool<{
        video_id: string;
    }, Record<string, unknown>>;
    scavio_youtube_transcript: ai.Tool<{
        video_id: string;
        language?: string | undefined;
        format?: "text" | "srt" | undefined;
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
        sort?: string | undefined;
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
        sort_type?: string | undefined;
        publish_time?: string | undefined;
    }, Record<string, unknown>>;
    scavio_instagram_search: ai.Tool<{
        keyword: string;
    }, Record<string, unknown>>;
};

export { type ScavioToolConfig, scavioAmazonOffers, scavioAmazonSearch, scavioInstagramSearch, scavioRedditSearch, scavioSearch, scavioTiktokSearch, scavioTools, scavioWalmartSearch, scavioYoutubeChannel, scavioYoutubeComments, scavioYoutubeSearch, scavioYoutubeTranscript, scavioYoutubeVideo };
