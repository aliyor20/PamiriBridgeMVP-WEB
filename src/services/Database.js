import * as SQLite from 'expo-sqlite';

// Initialize Database (Async in new Expo SQLite)
let db = null;
let dbInitPromise = null;

// Ensure database is initialized - returns a promise that resolves when ready
const ensureDatabase = async () => {
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

    // Batch insert using a transaction
    try {
        // Use withTransactionAsync for atomic updates
        // Use withTransactionAsync for atomic updates
        await database.withTransactionAsync(async () => {
            for (const entry of entries) {
                // SPARK PLAN OPTIMIZATION: 'Soft Delete' handling
                // If the server says it's deleted, we remove it locally to save space
                // and keep the list clean without a full re-sync.
                if (entry.status === 'deleted') {
                    await database.runAsync('DELETE FROM entries WHERE id = ?', [entry.id]);
                } else {
                    // Ensure text fields are safe strings
                    await database.runAsync(
                        `INSERT OR REPLACE INTO entries (id, word, meaning, dialect, audioURL, status, search_tokens, _normalized, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                        [
                            entry.id,
                            entry.word,
                            entry.meaning || '',
                            entry.dialect,
                            entry.audioURL || '',
                            entry.status,
                            JSON.stringify(entry.search_tokens || []),
                            entry._normalized || '',
                            entry.timestamp?.seconds || Date.now() / 1000
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

    try {
        // Show all entries (verified + pending) so users see their own submissions
        let queryStr = `SELECT * FROM entries WHERE 1=1`;
        const params = [];

        if (dialectFilter && dialectFilter !== 'All') {
            queryStr += ` AND dialect = ?`;
            params.push(dialectFilter);
        }

        if (searchTerm) {
            // Fuzzy-ish SQL search
            // We search in word, _normalized, or we could look in search_tokens string
            queryStr += ` AND (word LIKE ? OR _normalized LIKE ? OR search_tokens LIKE ?)`;
            const likeTerm = `%${searchTerm}%`;
            params.push(likeTerm, likeTerm, likeTerm);
        }

        queryStr += ` ORDER BY word ASC LIMIT 50`;

        const results = await database.getAllAsync(queryStr, params);

        // Parse search_tokens back to array
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

    try {
        const result = await database.getFirstAsync('SELECT COUNT(*) as count FROM entries');
        return result?.count || 0;
    } catch (error) {
        console.error("Entry count error:", error);
        return 0;
    }
};

/**
 * Insert a single entry into local database (for dual-write pattern)
 * Used after successful Firebase write to immediately add to local cache
 * @param {object} entry - Entry object with id, word, meaning, dialect, etc.
 */
export const insertLocalEntry = async (entry) => {
    const database = await ensureDatabase();
    if (!database) {
        console.error("Database not available for local insert");
        return false;
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

/**
 * Update the status of an existing entry in local database
 * Used when entry transitions from 'pending' to 'verified'
 * @param {string} entryId - The entry ID to update
 * @param {string} newStatus - New status ('verified' or 'pending')
 */
export const updateEntryStatus = async (entryId, newStatus) => {
    const database = await ensureDatabase();
    if (!database) {
        console.error("Database not available for status update");
        return false;
    }

    try {
        const result = await database.runAsync(
            'UPDATE entries SET status = ? WHERE id = ?',
            [newStatus, entryId]
        );
        console.log(`Updated entry ${entryId} to status: ${newStatus}`);
        return result.changes > 0;
    } catch (error) {
        console.error("Status update error:", error);
        return false;
    }
};

