import { auth } from '../firebaseConfig';
import { upsertEntries, getEntryCount, initDatabase } from './Database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, InteractionManager } from 'react-native';
import { DATA_ENDPOINTS, CACHE_CONFIG } from '../constants/dataConfig';

// Keys for tracking sync state
const LAST_SYNC_TIME_KEY = 'last_sync_timestamp_seconds';
const LAST_SYNC_DATE_KEY = 'last_sync_date';
const BUNDLE_IMPORTED_KEY = 'bundle_imported_version';
const GITHUB_VERSION_KEY = CACHE_CONFIG.KEYS.VERSION;
const LEADERBOARD_CACHE_KEY = CACHE_CONFIG.KEYS.LEADERBOARD_DATA;
const LEADERBOARD_VERSION_KEY = CACHE_CONFIG.KEYS.LEADERBOARD_VERSION;

// Sync configuration
const SYNC_INTERVAL_HOURS = CACHE_CONFIG.CHECK_INTERVAL_HOURS;
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 15000;

// BUNDLED DATABASE VERSION - Update this when shipping new bundle
// Format: YYYYMMDD of the export date
export const BUNDLED_DB_VERSION = '20260109';

/**
 * HYBRID DATA STRATEGY (GitHub Pages + Bundled Fallback)
 * 
 * Primary: Fetch from GitHub Pages (zero Firestore reads!)
 * Fallback: Use bundled JSON asset on fresh install
 * 
 * WORKFLOW:
 * 1. Check GitHub Pages version.json
 * 2. If newer version available, download dictionary.json
 * 3. If offline or fetch fails, use local cache/bundle
 */

// ============================================================
// GitHub Pages Sync (Primary Data Source)
// ============================================================

/**
 * Fetch with timeout support
 */
const fetchWithTimeout = async (url, timeoutMs = FETCH_TIMEOUT_MS) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { 'Cache-Control': 'no-cache' }
        });
        return response;
    } finally {
        clearTimeout(timeout);
    }
};

/**
 * Check remote version from GitHub Pages
 */
const fetchRemoteVersion = async () => {
    try {
        const response = await fetchWithTimeout(DATA_ENDPOINTS.VERSION);
        if (!response.ok) {
            console.log(`Version fetch failed: ${response.status}`);
            return null;
        }
        const data = await response.json();
        return data.version; // Unix timestamp
    } catch (error) {
        console.log("Could not fetch remote version (offline?):", error.message);
        return null;
    }
};

/**
 * Get locally stored version
 */
const getLocalVersion = async () => {
    try {
        const version = await AsyncStorage.getItem(GITHUB_VERSION_KEY);
        return version ? parseInt(version, 10) : 0;
    } catch {
        return 0;
    }
};

/**
 * Fetch dictionary from GitHub Pages and update local SQLite
 */
const syncFromGitHubPages = async () => {
    console.log("Syncing dictionary from GitHub Pages...");

    try {
        const response = await fetchWithTimeout(DATA_ENDPOINTS.DICTIONARY);
        if (!response.ok) {
            throw new Error(`Dictionary fetch failed: ${response.status}`);
        }

        const data = await response.json();

        if (!data.entries || !Array.isArray(data.entries)) {
            throw new Error("Invalid dictionary format");
        }

        console.log(`Downloaded ${data.entries.length} entries from GitHub Pages`);

        // Ensure database is initialized
        await initDatabase();

        // Upsert all entries to SQLite
        await upsertEntries(data.entries);

        // Save version locally
        await AsyncStorage.setItem(GITHUB_VERSION_KEY, String(data.version));
        await AsyncStorage.setItem(LAST_SYNC_DATE_KEY, new Date().toISOString());
        await AsyncStorage.setItem(LAST_SYNC_TIME_KEY, String(Math.floor(Date.now() / 1000)));

        console.log(`Dictionary synced! Version: ${data.version}`);
        return { success: true, count: data.entries.length, source: 'github_pages' };

    } catch (error) {
        console.error("GitHub Pages sync failed:", error.message);
        return { success: false, error, source: 'github_pages' };
    }
};

/**
 * Sync leaderboard data from GitHub Pages
 */
export const syncLeaderboard = async (forceRefresh = false) => {
    try {
        // Check if we need to refresh
        if (!forceRefresh) {
            const localVersion = await AsyncStorage.getItem(LEADERBOARD_VERSION_KEY);
            const remoteVersion = await fetchRemoteVersion();

            if (localVersion && remoteVersion && parseInt(localVersion, 10) >= remoteVersion) {
                console.log("Leaderboard is up to date");
                return { success: true, cached: true };
            }
        }

        console.log("Fetching leaderboard from GitHub Pages...");
        const response = await fetchWithTimeout(DATA_ENDPOINTS.LEADERBOARD);

        if (!response.ok) {
            throw new Error(`Leaderboard fetch failed: ${response.status}`);
        }

        const data = await response.json();

        // Cache the leaderboard data
        await AsyncStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify(data));
        await AsyncStorage.setItem(LEADERBOARD_VERSION_KEY, String(data.version));

        console.log(`Leaderboard synced: ${data.users?.length || 0} users`);
        return { success: true, data, cached: false };

    } catch (error) {
        console.log("Leaderboard sync failed, using cache:", error.message);
        return { success: false, error };
    }
};

/**
 * Get cached leaderboard data
 */
export const getCachedLeaderboard = async () => {
    try {
        const cached = await AsyncStorage.getItem(LEADERBOARD_CACHE_KEY);
        if (cached) {
            return JSON.parse(cached);
        }
        return null;
    } catch {
        return null;
    }
};

// ============================================================
// Bundled Database (Fallback for Cold Start)
// ============================================================

/**
 * Check if we should import from bundled database
 */
const shouldImportBundle = async () => {
    try {
        const importedVersion = await AsyncStorage.getItem(BUNDLE_IMPORTED_KEY);
        const githubVersion = await AsyncStorage.getItem(GITHUB_VERSION_KEY);
        const localCount = await getEntryCount();

        // Only use bundle if:
        // 1. No GitHub Pages data yet AND
        // 2. Never imported bundle AND
        // 3. Local DB is empty
        if (!githubVersion && !importedVersion && localCount === 0) {
            return true;
        }

        // Check if there's a newer bundle version (for app updates)
        if (!githubVersion && importedVersion && importedVersion < BUNDLED_DB_VERSION) {
            console.log(`Newer bundle available: ${BUNDLED_DB_VERSION} > ${importedVersion}`);
            return true;
        }

        return false;
    } catch (error) {
        console.error("Error checking bundle status:", error);
        return false;
    }
};

/**
 * Import dictionary from bundled JSON asset
 * This is the fallback for fresh installs with no network
 */
const importBundledDatabase = async () => {
    try {
        console.log("Checking for bundled database...");

        let bundleData = null;

        try {
            // Try to require the bundled asset
            const bundleAsset = require('../../assets/data/dictionary_bundle.json');
            bundleData = bundleAsset;
        } catch (e) {
            console.log("No bundled database found (assets/data/dictionary_bundle.json)");
            console.log("Run 'node scripts/exportFirestoreToBundle.js' to create one");
            return { imported: false, count: 0 };
        }

        if (!bundleData || !bundleData.entries || bundleData.entries.length === 0) {
            console.log("Bundle is empty or invalid");
            return { imported: false, count: 0 };
        }

        console.log(`Importing ${bundleData.entries.length} entries from bundle v${bundleData.version}...`);

        // Ensure database is initialized
        await initDatabase();

        // Import all entries from bundle
        await upsertEntries(bundleData.entries);

        // Mark bundle as imported
        await AsyncStorage.setItem(BUNDLE_IMPORTED_KEY, BUNDLED_DB_VERSION);

        // Set sync timestamp to bundle date
        if (bundleData.exportTimestamp) {
            await AsyncStorage.setItem(LAST_SYNC_TIME_KEY, String(bundleData.exportTimestamp));
            await AsyncStorage.setItem(LAST_SYNC_DATE_KEY, new Date(bundleData.exportTimestamp * 1000).toISOString());
        }

        console.log(`Successfully imported ${bundleData.entries.length} entries from bundle!`);
        return { imported: true, count: bundleData.entries.length };

    } catch (error) {
        console.error("Bundle import error:", error);
        return { imported: false, count: 0, error };
    }
};

// ============================================================
// Main Sync Logic
// ============================================================

/**
 * Check if enough time has passed since last sync
 */
const shouldSync = async () => {
    try {
        const lastSyncDate = await AsyncStorage.getItem(LAST_SYNC_DATE_KEY);
        if (!lastSyncDate) return true;

        const lastSync = new Date(lastSyncDate);
        const now = new Date();
        const hoursSinceSync = (now - lastSync) / (1000 * 60 * 60);

        console.log(`Hours since last sync: ${hoursSinceSync.toFixed(1)}`);
        return hoursSinceSync >= SYNC_INTERVAL_HOURS;
    } catch (error) {
        console.error("Error checking sync status:", error);
        return true;
    }
};

/**
 * Main sync implementation - GitHub Pages first, bundle fallback
 */
const syncDictionaryInternal = async () => {
    const localCount = await getEntryCount();

    // STEP 1: For completely fresh installs, try bundle first (instant, no network needed)
    if (localCount === 0) {
        const shouldUseBundleFirst = await shouldImportBundle();
        if (shouldUseBundleFirst) {
            const bundleResult = await importBundledDatabase();
            if (bundleResult.imported && bundleResult.count > 0) {
                console.log(`Cold start: Imported ${bundleResult.count} entries from bundle`);
                // Continue to check for updates from GitHub Pages
            }
        }
    }

    // STEP 2: Check if we need to sync from GitHub Pages
    const needsSync = await shouldSync();
    const currentLocalCount = await getEntryCount();

    if (!needsSync && currentLocalCount > 0) {
        console.log("Skipping sync - using cached data");
        return { success: true, count: 0, skipped: true };
    }

    // STEP 3: Check remote version
    const remoteVersion = await fetchRemoteVersion();
    const localVersion = await getLocalVersion();

    if (remoteVersion === null) {
        // Offline or GitHub Pages not configured
        if (currentLocalCount > 0) {
            console.log("Offline - using cached data");
            return { success: true, count: 0, offline: true };
        }
        // No data at all - this is a problem
        console.warn("No network and no local data!");
        return { success: false, error: "No network and no local data" };
    }

    // STEP 4: Sync if newer version available
    // FORCE SYNC if we have no local data but we do have a remote version (handles Web/Storage mismatches)
    if (remoteVersion > localVersion || currentLocalCount === 0) {
        console.log(`New version available or local DB empty: ${remoteVersion} > ${localVersion} (count: ${currentLocalCount})`);
        return await syncFromGitHubPages();
    }

    console.log("Already at latest version");
    await AsyncStorage.setItem(LAST_SYNC_DATE_KEY, new Date().toISOString());
    return { success: true, count: 0, upToDate: true };
};

/**
 * Sync with exponential backoff retry
 */
const syncWithRetry = async (retryCount = 0) => {
    try {
        return await syncDictionaryInternal();
    } catch (error) {
        if (retryCount < MAX_RETRIES) {
            const delay = INITIAL_DELAY_MS * Math.pow(2, retryCount);
            console.log(`Sync failed, retrying in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
            return syncWithRetry(retryCount + 1);
        }
        throw error;
    }
};

/**
 * Main sync function - runs in background, won't block UI
 */
export const syncDictionary = async () => {
    try {
        // Use InteractionManager to ensure sync runs after UI is responsive
        return new Promise((resolve) => {
            InteractionManager.runAfterInteractions(async () => {
                try {
                    const result = await syncWithRetry();
                    resolve(result);
                } catch (error) {
                    console.error("Sync failed:", error);
                    resolve({ success: false, error });
                }
            });
        });
    } catch (error) {
        console.error("Sync failed:", error);
        return { success: false, error };
    }
};

/**
 * Force sync - clears local version to force re-download
 */
export const forceSyncDictionary = async () => {
    await AsyncStorage.removeItem(LAST_SYNC_DATE_KEY);
    await AsyncStorage.removeItem(LAST_SYNC_TIME_KEY);
    await AsyncStorage.removeItem(GITHUB_VERSION_KEY);
    await AsyncStorage.removeItem(LEADERBOARD_VERSION_KEY);
    await AsyncStorage.removeItem(LEADERBOARD_CACHE_KEY);

    return syncDictionary();
};

/**
 * Background sync on app foreground
 */
export const setupBackgroundSync = () => {
    const subscription = AppState.addEventListener('change', nextState => {
        if (nextState === 'active') {
            console.log("App active, checking sync...");
            syncDictionary().catch(err =>
                console.warn("Background sync failed:", err)
            );
            syncLeaderboard().catch(err =>
                console.warn("Leaderboard sync failed:", err)
            );
        }
    });

    return () => subscription.remove();
};

/**
 * Sync everything on app launch
 */
export const syncAll = async () => {
    const dictResult = await syncDictionary();
    const leaderResult = await syncLeaderboard();

    return {
        dictionary: dictResult,
        leaderboard: leaderResult
    };
};

/**
 * COST SAVINGS WITH GITHUB PAGES:
 * 
 * BEFORE (Direct Firestore):
 * - Dictionary load: ~5000 reads per user session
 * - Leaderboard: 50 reads per view
 * - High traffic: Quota exhausted quickly
 * 
 * AFTER (GitHub Pages):
 * - Dictionary load: 0 Firestore reads!
 * - Leaderboard: 0 Firestore reads!
 * - Only writes (contributions) use Firestore
 * - GitHub Pages: Free, unlimited bandwidth
 */
