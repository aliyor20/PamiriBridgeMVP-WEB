import React, { createContext, useContext, useEffect, useState } from 'react';
import * as idb from '../lib/idb';
import * as api from '../lib/api';
import { fetchDeltasFromFirestore } from '../lib/firebaseService';
import Fuse from 'fuse.js';

const DictionaryContext = createContext();

export const useDictionary = () => useContext(DictionaryContext);

export const DictionaryProvider = ({ children }) => {
    const [status, setStatus] = useState('initializing'); // initializing, syncing, ready, error
    const [progress, setProgress] = useState(0);
    const [stats, setStats] = useState({ count: 0, version: 0, lastUpdated: null });
    const [error, setError] = useState(null);
    const [fuse, setFuse] = useState(null);

    useEffect(() => {
        initDictionary();
    }, []);

    const requestPersistence = async () => {
        if (navigator.storage && navigator.storage.persist) {
            try {
                const isPersisted = await navigator.storage.persist();
                console.log(`Persistent storage granted: ${isPersisted}`);
            } catch (error) {
                console.log('Failed to request persistent storage', error);
            }
        }
    };

    const initDictionary = async () => {
        try {
            setStatus('initializing');

            await requestPersistence();

            // 1. Check Local DB
            await idb.initDB();
            let meta = await idb.getLocalVersion();
            const localVersion = meta ? meta.version : 0;
            let lastDeltaTimestamp = meta ? meta.last_delta_timestamp : null;

            console.log('Local Dictionary Version:', localVersion);

            // 2. Check Remote Version
            let remoteMeta = null;
            try {
                remoteMeta = await api.fetchRemoteVersion();
                console.log('Remote Version:', remoteMeta?.version);
            } catch (e) {
                console.warn('Offline or GitHub unreachable', e);
            }

            // 3. Sync if needed
            if (remoteMeta && remoteMeta.version > localVersion) {
                console.log('Update available. Downloading...');
                setStatus('syncing');

                const dictData = await api.fetchRemoteDictionary();

                if (dictData && dictData.entries) {
                    console.log(`Downloaded ${dictData.entries.length} entries.`);

                    // Bulk Put
                    await idb.bulkPutEntries(dictData.entries);

                    // Update Metadata
                    meta = {
                        version: dictData.version,
                        updated_at: dictData.lastUpdated || dictData.updated_at,
                        entry_count: dictData.count || dictData.entries.length,
                        last_delta_timestamp: dictData.lastUpdated || dictData.updated_at
                    };
                    await idb.setLocalVersion(meta);
                    lastDeltaTimestamp = dictData.lastUpdated || dictData.updated_at;

                    console.log('Sync Complete.');
                }
            } else {
                console.log('Dictionary up to date.');
            }

            // 4. Delta Sync from Firestore
            const lastSyncTime = parseInt(localStorage.getItem('pb_last_delta_sync') || '0', 10);
            const now = Date.now();
            if (now - lastSyncTime > 5 * 60 * 1000 && lastDeltaTimestamp) {
                console.log('Checking for Delta updates from Firestore...');
                const deltas = await fetchDeltasFromFirestore(lastDeltaTimestamp);
                if (deltas && deltas.length > 0) {
                    console.log(`Pulled ${deltas.length} new words from Deltas`);
                    await idb.bulkPutEntries(deltas);
                    meta = await idb.getLocalVersion();

                    // Convert Firestore Timestamp to milliseconds for clean local storage
                    const newestDelta = deltas[deltas.length - 1];
                    let deltaMs = meta.last_delta_timestamp;
                    if (newestDelta.updatedAt) {
                        if (newestDelta.updatedAt.toMillis) {
                            deltaMs = newestDelta.updatedAt.toMillis();
                        } else if (newestDelta.updatedAt.seconds) {
                            deltaMs = newestDelta.updatedAt.seconds * 1000;
                        } else if (newestDelta.updatedAt instanceof Date) {
                            deltaMs = newestDelta.updatedAt.getTime();
                        }
                    }
                    meta.last_delta_timestamp = deltaMs;

                    meta.entry_count = meta.entry_count ? meta.entry_count + deltas.length : deltas.length;
                    await idb.setLocalVersion(meta);
                }
                localStorage.setItem('pb_last_delta_sync', now.toString());
            }

            // 5. Load everything into Fuse.js memory
            const allEntries = await idb.getAllEntries();
            const fuseInstance = new Fuse(allEntries, {
                keys: ['word', 'dialect', 'meaning'],
                threshold: 0.3, // Fuzzy tolerance
                ignoreLocation: true
            });
            setFuse(fuseInstance);

            // Calculate dialect counts
            const dialectCounts = { shughni: 0, rushani: 0, bartangi: 0, yazgulyami: 0, ishkashimi: 0, wakhi: 0, sarykoli: 0 };
            allEntries.forEach(entry => {
                const dialect = (entry.dialect || '').toLowerCase();
                if (dialect.includes('shughni')) dialectCounts.shughni++;
                else if (dialect.includes('rushan')) dialectCounts.rushani++;
                else if (dialect.includes('bartang')) dialectCounts.bartangi++;
                else if (dialect.includes('yazg')) dialectCounts.yazgulyami++;
                else if (dialect.includes('ishkashim')) dialectCounts.ishkashimi++;
                else if (dialect.includes('wakhi') || dialect.includes('vakh')) dialectCounts.wakhi++;
                else if (dialect.includes('sarykol')) dialectCounts.sarykoli++;
                // If it's empty, or "general", we just don't increment the specific dialect buckets
            });

            // 6. Update Stats
            meta = await idb.getLocalVersion();
            setStats({
                version: meta?.version || 0,
                lastUpdated: meta?.updated_at || null,
                count: meta?.entry_count || 0,
                dialects: dialectCounts
            });

            setStatus('ready');

        } catch (err) {
            console.error('Dictionary Init Error:', err);
            setError(err.message);
            setStatus('error');
        }
    };

    const search = async (term) => {
        if (!term) return [];
        if (!fuse) {
            console.warn("Fuse not initialized, falling back to IDB prefix");
            return idb.searchEntries(term);
        }
        const results = fuse.search(term, { limit: 50 });
        return results.map(res => res.item);
    };

    return (
        <DictionaryContext.Provider value={{ status, progress, stats, error, search, retry: initDictionary }}>
            {children}
        </DictionaryContext.Provider>
    );
};
