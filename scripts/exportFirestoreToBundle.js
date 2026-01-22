/**
 * Export Firestore entries to bundled JSON file
 * 
 * This script exports all verified + pending entries from Firestore
 * to a JSON file that gets bundled with the app.
 * 
 * USAGE:
 *   node scripts/exportFirestoreToBundle.js
 * 
 * OUTPUT:
 *   assets/data/dictionary_bundle.json
 * 
 * WEEKLY WORKFLOW:
 *   1. Run this script
 *   2. Update BUNDLED_DB_VERSION in src/services/SyncService.js
 *   3. Commit and build new app version
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
// You need to download your service account key from Firebase Console:
// Project Settings > Service Accounts > Generate New Private Key
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('ERROR: Service account key not found!');
    console.error('');
    console.error('To use this script:');
    console.error('1. Go to Firebase Console > Project Settings > Service Accounts');
    console.error('2. Click "Generate New Private Key"');
    console.error('3. Save the file as: scripts/serviceAccountKey.json');
    console.error('4. Run this script again');
    console.error('');
    console.error('IMPORTANT: Never commit serviceAccountKey.json to git!');
    process.exit(1);
}

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function exportToBundle() {
    console.log('Starting Firestore export...');

    try {
        // Fetch all verified and pending entries
        const snapshot = await db.collection('entries')
            .where('status', 'in', ['verified', 'pending'])
            .orderBy('timestamp')
            .get();

        console.log(`Found ${snapshot.size} entries`);

        const entries = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            entries.push({
                id: doc.id,
                word: data.word,
                meaning: data.meaning || '',
                dialect: data.dialect,
                audioURL: data.audioURL || '',
                status: data.status,
                search_tokens: data.search_tokens || [],
                _normalized: data._normalized || '',
                timestamp: data.timestamp ? {
                    seconds: data.timestamp.seconds || Math.floor(Date.now() / 1000)
                } : { seconds: Math.floor(Date.now() / 1000) },
                // Don't include contributorId in bundle for privacy
            });
        });

        const now = new Date();
        const version = now.toISOString().split('T')[0].replace(/-/g, '');

        const bundle = {
            version: version,
            exportTimestamp: Math.floor(now.getTime() / 1000),
            exportDate: now.toISOString(),
            entryCount: entries.length,
            entries: entries
        };

        // Write to assets/data/dictionary_bundle.json
        const outputPath = path.join(__dirname, '..', 'assets', 'data', 'dictionary_bundle.json');

        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outputPath, JSON.stringify(bundle, null, 2));

        console.log('');
        console.log('✅ Export complete!');
        console.log(`   Version: ${version}`);
        console.log(`   Entries: ${entries.length}`);
        console.log(`   Output:  ${outputPath}`);
        console.log('');
        console.log('Next steps:');
        console.log(`1. Update BUNDLED_DB_VERSION to '${version}' in src/services/SyncService.js`);
        console.log('2. Commit changes and build new app version');

        process.exit(0);

    } catch (error) {
        console.error('Export failed:', error);
        process.exit(1);
    }
}

exportToBundle();
