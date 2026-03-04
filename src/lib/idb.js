import { openDB } from 'idb';

const DB_NAME = 'pamiri_lexicon';
const DB_VERSION = 2;

/**
 * Open the database (creates schema if needed)
 */
export const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // 1. Entries Store (The Dictionary)
            if (!db.objectStoreNames.contains('entries')) {
                const store = db.createObjectStore('entries', { keyPath: 'id' });
                // Create indices for searching
                store.createIndex('word', 'word', { unique: false });
                store.createIndex('dialect', 'dialect', { unique: false });
                store.createIndex('status', 'status', { unique: false });
            }

            // 2. Metadata Store (Version info, sync timestamp)
            if (!db.objectStoreNames.contains('metadata')) {
                db.createObjectStore('metadata', { keyPath: 'key' });
            }
        },
    });
};

/**
 * Bulk insert entries (used during hydration)
 * @param {Array} entries 
 */
export const bulkPutEntries = async (entries) => {
    const db = await initDB();
    const tx = db.transaction('entries', 'readwrite');
    const store = tx.objectStore('entries');

    // Use Promise.all for speed, or wait for tx.done
    // For massive datasets, we might want to chunk this.
    // 2MB json -> ~5000 entries is fine to do in one go usually.
    for (const entry of entries) {
        store.put(entry);
    }

    await tx.done;
    return entries.length;
};

/**
 * Get local version metadata
 */
export const getLocalVersion = async () => {
    const db = await initDB();
    return db.get('metadata', 'version');
};

/**
 * Set local version metadata
 * @param {Object} versionData - content of version.json
 */
export const setLocalVersion = async (versionData) => {
    const db = await initDB();
    return db.put('metadata', { key: 'version', ...versionData });
};

/**
 * Prefix Search (Fast)
 * Uses IDB KeyRange to find words starting with "term"
 */
export const searchEntries = async (term, limit = 50) => {
    if (!term) return [];
    const db = await initDB();
    const lowerTerm = term.toLowerCase(); // Ensure we index/search lower

    // Note: We need a 'normalized_word' or similar index if the source data isn't clean.
    // Assuming 'word' index works for now. 
    // IDB prefix search trick: range(term, term + '\uffff')

    const range = IDBKeyRange.bound(lowerTerm, lowerTerm + '\uffff');
    const index = db.transaction('entries').store.index('word');

    let cursor = await index.openCursor(range);
    const results = [];

    while (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor = await cursor.continue();
    }

    return results;
};

/**
 * Get single entry by ID
 */
export const getEntryById = async (id) => {
    const db = await initDB();
    return db.get('entries', id);
};

/**
 * Get all entries (for in-memory Fuse.js indexing)
 */
export const getAllEntries = async () => {
    const db = await initDB();
    return db.getAll('entries');
};
