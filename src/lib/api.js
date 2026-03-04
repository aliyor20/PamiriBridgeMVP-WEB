// GitHub Pages Base URL relative to the project root or absolute?
// Ideally absolute to the deployed location.
const DATA_BASE_URL = 'https://khushnood.github.io/PamiriBridgeMVP'; // Replace with actual repo URL if known, or user provided?
// Wait, I saw "PamiriDataPublisher" in the logs.
// I'll use a const for now that matches the mobile config if possible, or a placeholder.
// Mobile used: `DATA_ENDPOINTS` in `src/constants/dataConfig.js` (I recall seeing this).

// Let's assume standard GH pages structure:
// khushnood.github.io/PamiriBridgeMVP/version.json
// khushnood.github.io/PamiriBridgeMVP/dictionary.json

export const DIALECTS = [
    'All',
    'Shughni',
    'Rushani',
    'Bartangi',
    'Roshorvi',
    'Sarikoli',
    'Yazghulami',
    'Wakhi',
    'Ishkashimi'
];

export const API_ENDPOINTS = {
    VERSION: '/version.json',
    DICTIONARY: '/dictionary.json',
};

// Use relative paths if we proxy, but for GH pages we need full URL usually unless we are hosting THERE.
// Since we are developing locallly, we need the full URL to the production data for testing.
// I will use a placeholder base for now and ask user or check mobile config.
// Mobile used: `https://raw.githubusercontent.com/...` or GH Pages.
// I'll try to find the actual URL from the mobile app analysis if possible.
// In `src/services/SyncService.js` it imported `DATA_ENDPOINTS`.
// It's likely `https://<user>.github.io/<repo>/...` based on `publish-data.js`.

const BASE_URL = import.meta.env.VITE_DATA_SOURCE_URL || 'https://raw.githubusercontent.com/aliyor20/pamiri-dictionary-data/main';
// Better yet, use the `publish-data.js` output structure.
// `https://<username>.github.io/<repo>`

export const fetchRemoteVersion = async () => {
    try {
        const res = await fetch(`${BASE_URL}/version.json`);
        if (!res.ok) throw new Error('Version fetch failed');
        return await res.json();
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
};

export const fetchRemoteDictionary = async () => {
    try {
        const res = await fetch(`${BASE_URL}/dictionary.json`);
        if (!res.ok) throw new Error('Dictionary fetch failed');
        return await res.json();
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
};
