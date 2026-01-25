import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

// Initialize Database (Async in new Expo SQLite)
let db = null;
let dbInitPromise = null;

// WEB FALLBACK: In-memory store for development/web preview
let webEntries = [];
const STORAGE_KEY = 'pamiri_lexicon_web_data';

// Ensure database is initialized - returns a promise that resolves when ready
const ensureDatabase = async () => {
    // WEB SUPPORT
    if (Platform.OS === 'web') {
        // Try to load from localStorage if empty
        if (webEntries.length === 0) {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    webEntries = JSON.parse(stored);
                    console.log(`[Web] Loaded ${webEntries.length} entries from localStorage`);
                }
            } catch (e) {
                console.warn("[Web] Failed to load from localStorage", e);
            }
        }
        return { type: 'web_mock' };
    }

    // If already initialized, return immediately
    if (db) return db;

    // If initialization is in progress, wait for it
    if (dbInitPromise) {
        await dbInitPromise;
        return db;
    }

    // Start initialization
    dbInitPromise = initDatabaseInternal();
    await dbInitPromise;
    return db;
};

const initDatabaseInternal = async () => {
    try {
        db = await SQLite.openDatabaseAsync('pamiri_lexicon.db');

        // Create table if not exists
        await db.execAsync(`
            PRAGMA journal_mode = WAL;
            CREATE TABLE IF NOT EXISTS entries (
                id TEXT PRIMARY KEY NOT NULL,
                word TEXT,
                meaning TEXT,
                dialect TEXT,
                audioURL TEXT,
                status TEXT,
                search_tokens TEXT, 
                _normalized TEXT,
                timestamp INTEGER
            );
            CREATE INDEX IF NOT EXISTS idx_normalized ON entries (_normalized);
            CREATE INDEX IF NOT EXISTS idx_dialect ON entries (dialect);
        `);
        console.log("Database initialized.");
        return db;
    } catch (error) {
        console.error("Database init error:", error);
        dbInitPromise = null; // Reset so we can retry
        throw error;
    }
};

export const initDatabase = async () => {
    return ensureDatabase();
};

/**
 * Clear all entries from local database (for forcing fresh sync)
 */
export const clearLocalDatabase = async () => {
    const database = await ensureDatabase();
    if (!database) return false;

    if (database.type === 'web_mock') {
        webEntries = [];
        try {
            localStorage.removeItem(STORAGE_KEY);
            console.log("Web local database cleared");
        } catch (e) {
            console.error("Web clear error", e);
        }
        return true;
    }

    try {
        await database.runAsync('DELETE FROM entries');
        console.log("Local database cleared");
        return true;
    } catch (error) {
        console.error("Error clearing database:", error);
        return false;
    }
};

export const upsertEntries = async (entries) => {
    const database = await ensureDatabase();
    if (!database) {
        console.error("Database not available for upsert");
        return;
    }

    if (database.type === 'web_mock') {
        entries.forEach(entry => {
            // Check for delete status
            if (entry.status === 'deleted') {
                webEntries = webEntries.filter(e => e.id !== entry.id);
            } else {
                const idx = webEntries.findIndex(e => e.id === entry.id);
                if (idx >= 0) {
                    webEntries[idx] = entry;
                } else {
                    webEntries.push(entry);
                }
            }
        });

        // Persist to localStorage
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(webEntries));
            console.log(`[Web] Upserted ${entries.length} entries. Total: ${webEntries.length}. Saved to localStorage.`);
        } catch (e) {
            console.error("[Web] Failed to save to localStorage", e);
        }

        return;
    }

    // Batch insert using a transaction
    try {
        await database.withTransactionAsync(async () => {
            for (const entry of entries) {
                if (entry.status === 'deleted') {
                    await database.runAsync('DELETE FROM entries WHERE id = ?', [String(entry.id)]);
                } else {
                    await database.runAsync(
                        `INSERT OR REPLACE INTO entries (id, word, meaning, dialect, audioURL, status, search_tokens, _normalized, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                        [
                            String(entry.id),
                            String(entry.word || ''),
                            String(entry.meaning || ''),
                            String(entry.dialect || ''),
                            String(entry.audioURL || ''),
                            String(entry.status || 'active'),
                            JSON.stringify(entry.search_tokens || []),
                            String(entry._normalized || ''),
                            Number(entry.timestamp?.seconds || Date.now() / 1000)
                        ]
                    );
                }
            }
        });
        console.log(`Upserted/Pruned ${entries.length} entries.`);
    } catch (error) {
        console.error("Upsert error:", error);
    }
};

export const searchLocalEntries = async (searchTerm, dialectFilter) => {
    const database = await ensureDatabase();
    if (!database) {
        console.log("Database not available, returning empty results");
        return [];
    }

    if (database.type === 'web_mock') {
        let results = webEntries;

        // Filter by dialect
        if (dialectFilter && dialectFilter !== 'All') {
            results = results.filter(e => e.dialect === dialectFilter);
        }

        // Fuzzy search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            results = results.filter(e =>
                (e.word && e.word.toLowerCase().includes(term)) ||
                (e.meaning && e.meaning.toLowerCase().includes(term))
            );
        }

        // Check if words exist, if not, maybe we need to reload?
        // Sort A-Z
        results.sort((a, b) => a.word.localeCompare(b.word));
        return results.slice(0, 50);
    }

    try {
        let queryStr = `SELECT * FROM entries WHERE 1=1`;
        const params = [];

        if (dialectFilter && dialectFilter !== 'All') {
            queryStr += ` AND dialect = ?`;
            params.push(String(dialectFilter));
        }

        if (searchTerm) {
            // Fuzzy search using LIKE %term%
            queryStr += ` AND (word LIKE ? OR meaning LIKE ? OR _normalized LIKE ?)`;
            const likeTerm = `%${String(searchTerm)}%`;
            params.push(likeTerm, likeTerm, likeTerm);
        }

        queryStr += ` ORDER BY word ASC LIMIT 50`;

        // Ensure no undefined values in params
        const safeParams = params.map(p => (p === undefined || p === null) ? '' : p);

        const results = await database.getAllAsync(queryStr, safeParams);

        return results.map(row => ({
            ...row,
            search_tokens: JSON.parse(row.search_tokens || '[]')
        }));

    } catch (error) {
        console.error("Local search error:", error);
        return [];
    }
};

export const getEntryCount = async () => {
    const database = await ensureDatabase();
    if (!database) return 0;

    if (database.type === 'web_mock') {
        return webEntries.length;
    }

    try {
        const result = await database.getFirstAsync('SELECT COUNT(*) as count FROM entries');
        return result?.count || 0;
    } catch (error) {
        console.error("Entry count error:", error);
        return 0;
    }
};

export const insertLocalEntry = async (entry) => {
    const database = await ensureDatabase();
    if (!database) {
        return false;
    }

    if (database.type === 'web_mock') {
        webEntries.push({
            ...entry,
            status: entry.status || 'pending',
            timestamp: entry.timestamp?.seconds || Math.floor(Date.now() / 1000)
        });

        // Persist to localStorage
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(webEntries));
        } catch (e) {
            console.error("[Web] Failed to save to localStorage", e);
        }

        return true;
    }

    try {
        await database.runAsync(
            `INSERT OR REPLACE INTO entries (id, word, meaning, dialect, audioURL, status, search_tokens, _normalized, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
                entry.id,
                entry.word,
                entry.meaning || '',
                entry.dialect,
                entry.audioURL || '',
                entry.status || 'pending',
                JSON.stringify(entry.search_tokens || []),
                entry._normalized || '',
                entry.timestamp?.seconds || Math.floor(Date.now() / 1000)
            ]
        );
        console.log(`Inserted local entry: ${entry.word}`);
        return true;
    } catch (error) {
        console.error("Local insert error:", error);
        return false;
    }
};

export const updateEntryStatus = async (entryId, newStatus) => {
    const database = await ensureDatabase();
    if (!database) return false;

    if (database.type === 'web_mock') {
        const entry = webEntries.find(e => e.id === entryId);
        if (entry) {
            entry.status = newStatus;

            // Persist to localStorage
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(webEntries));
            } catch (e) {
                console.error("[Web] Failed to save to localStorage", e);
            }

            return true;
        }
        return false;
    }

    try {
        const result = await database.runAsync(
            'UPDATE entries SET status = ? WHERE id = ?',
            [newStatus, entryId]
        );
        return result.changes > 0;
    } catch (error) {
        console.error("Status update error:", error);
        return false;
    }
};

/**
 * Get related entries for discovery
 */
export const getRelatedEntries = async (currentEntryId, headword, dialect, limit = 5) => {
    const database = await ensureDatabase();
    if (!database) return [];

    const safeLimit = Number(limit) || 5;

    if (database.type === 'web_mock') {
        // Filter by dialect and exclude current
        let candidates = webEntries.filter(e => e.dialect === dialect && e.id !== currentEntryId);

        // Prioritize same start letter
        if (headword) {
            const firstChar = headword.charAt(0).toLowerCase();
            candidates.sort((a, b) => {
                const aMatch = a.word.toLowerCase().startsWith(firstChar);
                const bMatch = b.word.toLowerCase().startsWith(firstChar);
                if (aMatch && !bMatch) return -1;
                if (!aMatch && bMatch) return 1;
                return 0.5 - Math.random(); // Shuffle rest
            });
        } else {
            // Shuffle (Fisher-Yates)
            for (let i = candidates.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
            }
        }

        return candidates.slice(0, safeLimit);
    }

    try {
        // Safe inputs
        const safeDialect = dialect ? String(dialect) : '';
        const safeId = currentEntryId ? String(currentEntryId) : '';
        const firstLetter = headword ? headword.charAt(0) : '';

        // Strategy: Try to find words with same first letter first
        let similarResults = [];
        if (firstLetter) {
            const likePattern = `${firstLetter}%`;
            similarResults = await database.getAllAsync(
                `SELECT * FROM entries WHERE dialect = ? AND id != ? AND word LIKE ? ORDER BY word ASC LIMIT ?`,
                [safeDialect, safeId, likePattern, safeLimit]
            );
        }

        // If we need more, fill with random
        let randomResults = [];
        if (similarResults.length < safeLimit) {
            const needed = safeLimit - similarResults.length;
            // Exclude already found IDs
            const excludeIds = [safeId, ...similarResults.map(r => r.id)];
            const placeHolders = excludeIds.map(() => '?').join(',');

            randomResults = await database.getAllAsync(
                `SELECT * FROM entries WHERE dialect = ? AND id NOT IN (${placeHolders}) ORDER BY RANDOM() LIMIT ?`,
                [safeDialect, ...excludeIds, needed]
            );
        }

        const results = [...similarResults, ...randomResults];

        return results.map(row => ({
            ...row,
            search_tokens: JSON.parse(row.search_tokens || '[]')
        }));
    } catch (error) {
        console.error("Related entries error:", error);
        return [];
    }
};
