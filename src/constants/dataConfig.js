/**
 * Data Configuration for GitHub Pages Static Data Layer
 * 
 * These URLs point to the gh-pages branch where publish-data.js
 * pushes the static JSON snapshots.
 * 
 * UPDATE THIS after enabling GitHub Pages in your repo settings.
 */

// Base URL for GitHub Pages
// Format: https://<username>.github.io/<repo>
// Or use raw.githubusercontent.com for immediate availability
export const GITHUB_PAGES_BASE_URL = 'https://raw.githubusercontent.com/aliyor20/PamiriLexiconMVP/gh-pages';

// Individual endpoints
export const DATA_ENDPOINTS = {
    VERSION: `${GITHUB_PAGES_BASE_URL}/version.json`,
    DICTIONARY: `${GITHUB_PAGES_BASE_URL}/dictionary.json`,
    LEADERBOARD: `${GITHUB_PAGES_BASE_URL}/leaderboard.json`,
};

// Cache configuration
export const CACHE_CONFIG = {
    // How often to check for updates (in hours)
    CHECK_INTERVAL_HOURS: 1,

    // AsyncStorage keys
    KEYS: {
        VERSION: 'gh_pages_version',
        DICTIONARY_VERSION: 'gh_pages_dictionary_version',
        LEADERBOARD_DATA: 'gh_pages_leaderboard_cache',
        LEADERBOARD_VERSION: 'gh_pages_leaderboard_version',
        LAST_CHECK: 'gh_pages_last_check',
    }
};

export const DIALECTS = ["All", "Shughni", "Rushani", "Wakhi", "Yazghulami", "Sarikoli", "Bartangi", "Ishkashimi"];
