import * as ai from 'ai';
import { ScavioConfig } from 'scavio';

interface ScavioToolConfig extends ScavioConfig {
    /** Max number of results to keep in `results`-style lists. Defaults to 10. */
    maxResults?: number;
}
/** Google web search. */
declare function scavioSearch(config?: ScavioToolConfig): ai.Tool<{
    query: string;
    country_code?: string | undefined;
    language?: string | undefined;
}, Record<string, unknown>>;
/** YouTube video search. */
declare function scavioYoutubeSearch(config?: ScavioToolConfig): ai.Tool<{
    query: string;
}, Record<string, unknown>>;
/** Reddit post/community search (costs 2 credits). */
declare function scavioRedditSearch(config?: ScavioToolConfig): ai.Tool<{
    query: string;
    sort?: string | undefined;
}, Record<string, unknown>>;
/** Amazon product search. */
declare function scavioAmazonSearch(config?: ScavioToolConfig): ai.Tool<{
    query: string;
    domain?: string | undefined;
}, Record<string, unknown>>;
/** Walmart product search. */
declare function scavioWalmartSearch(config?: ScavioToolConfig): ai.Tool<{
    query: string;
}, Record<string, unknown>>;
/**
 * All Scavio tools as an object keyed by tool name, ready to spread into the
 * `tools` option of `generateText` / `streamText`.
 */
declare function scavioTools(config?: ScavioToolConfig): {
    scavio_search: ai.Tool<{
        query: string;
        country_code?: string | undefined;
        language?: string | undefined;
    }, Record<string, unknown>>;
    scavio_youtube_search: ai.Tool<{
        query: string;
    }, Record<string, unknown>>;
    scavio_reddit_search: ai.Tool<{
        query: string;
        sort?: string | undefined;
    }, Record<string, unknown>>;
    scavio_amazon_search: ai.Tool<{
        query: string;
        domain?: string | undefined;
    }, Record<string, unknown>>;
    scavio_walmart_search: ai.Tool<{
        query: string;
    }, Record<string, unknown>>;
};

export { type ScavioToolConfig, scavioAmazonSearch, scavioRedditSearch, scavioSearch, scavioTools, scavioWalmartSearch, scavioYoutubeSearch };
