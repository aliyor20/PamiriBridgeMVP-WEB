/**
 * Publish Data to GitHub Pages
 * 
 * Exports verified dictionary entries and leaderboard data from Firestore
 * to static JSON files, then commits/pushes to the gh-pages branch.
 * 
 * USAGE:
 *   npm run publish-data           # Full publish
 *   npm run publish-data --dry-run # Preview without git push
 * 
 * PREREQUISITES:
 *   1. Firebase service account key at scripts/serviceAccountKey.json
 *   2. Git configured with push access to this repo
 *   3. gh-pages branch exists (create with: git checkout --orphan gh-pages)
 * 
 * OUTPUT:
 *   gh-pages branch will contain:
 *     - version.json    (lightweight metadata for version checks)
 *     - dictionary.json (full dictionary entries)
 *     - leaderboard.json (user rankings + valley stats)
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// --- Configuration ---
const DRY_RUN = process.argv.includes('--dry-run');
const BRANCH = 'gh-pages';
const OUTPUT_DIR = path.join(__dirname, '..', '.gh-pages-data');

// --- Initialize Firebase Admin ---
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ ERROR: Service account key not found!');
    console.error('');
    console.error('To use this script:');
    console.error('1. Go to Firebase Console > Project Settings > Service Accounts');
    console.error('2. Click "Generate New Private Key"');
    console.error('3. Save the file as: scripts/serviceAccountKey.json');
    console.error('4. Run this script again');
    console.error('');
    console.error('⚠️  IMPORTANT: Never commit serviceAccountKey.json to git!');
    process.exit(1);
}

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// --- Valley list for aggregation ---
const VALLEYS = ['shughnan', 'rushan', 'wakhan', 'bartang', 'yazghulami', 'ishkashim', 'sarikol'];

/**
 * Fetch verified dictionary entries from Firestore
 */
async function fetchDictionaryEntries() {
    console.log('📖 Fetching dictionary entries...');

    const snapshot = await db.collection('entries')
        .where('status', 'in', ['verified', 'pending'])
        .orderBy('timestamp')
        .get();

    console.log(`   Found ${snapshot.size} entries`);

    const entries = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        // Only export public fields - no contributorId or sensitive data
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
            } : { seconds: Math.floor(Date.now() / 1000) }
        });
    });

    return entries;
}

/**
 * Fetch users and generate leaderboard data
 */
async function fetchLeaderboardData() {
    console.log('🏆 Fetching leaderboard data...');

    const snapshot = await db.collection('users')
        .orderBy('points', 'desc')
        .limit(100)
        .get();

    console.log(`   Found ${snapshot.size} users`);

    const users = [];
    const valleyStats = {};

    // Initialize valley stats
    VALLEYS.forEach(v => {
        valleyStats[v] = { count: 0, points: 0 };
    });

    snapshot.forEach(doc => {
        const data = doc.data();
        const valley = data.valley_affiliation || 'unknown';

        // Public leaderboard data only
        users.push({
            id: doc.id,
            displayName: data.displayName || 'Anonymous',
            points: data.points || 0,
            valley_affiliation: valley,
            // Don't include email or other private data
        });

        // Aggregate valley stats
        if (valleyStats[valley]) {
            valleyStats[valley].count++;
            valleyStats[valley].points += data.points || 0;
        }
    });

    return { users, valleyStats };
}

/**
 * Generate all JSON files
 */
async function generateDataFiles() {
    const now = new Date();
    const versionTimestamp = Math.floor(now.getTime() / 1000);

    // Fetch all data
    const entries = await fetchDictionaryEntries();
    const { users, valleyStats } = await fetchLeaderboardData();

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Generate version.json (lightweight, fetched first by clients)
    const versionData = {
        version: versionTimestamp,
        updated_at: now.toISOString(),
        dictionary_count: entries.length,
        leaderboard_count: users.length
    };
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'version.json'),
        JSON.stringify(versionData, null, 2)
    );
    console.log('✅ Generated version.json');

    // Generate dictionary.json
    const dictionaryData = {
        version: versionTimestamp,
        updated_at: now.toISOString(),
        entry_count: entries.length,
        entries: entries
    };
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'dictionary.json'),
        JSON.stringify(dictionaryData)  // No pretty print to save space
    );
    console.log(`✅ Generated dictionary.json (${entries.length} entries)`);

    // Generate leaderboard.json
    const leaderboardData = {
        version: versionTimestamp,
        updated_at: now.toISOString(),
        users: users,
        valley_stats: valleyStats
    };
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'leaderboard.json'),
        JSON.stringify(leaderboardData, null, 2)
    );
    console.log(`✅ Generated leaderboard.json (${users.length} users)`);

    // Add a simple index.html for GitHub Pages
    const indexHtml = `<!DOCTYPE html>
<html>
<head>
    <title>Pamiri Bridge Data API</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        h1 { color: #6366f1; }
        a { color: #6366f1; }
        code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
        .updated { color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <h1>📚 Pamiri Bridge Data API</h1>
    <p class="updated">Last updated: ${now.toISOString()}</p>
    <h2>Endpoints:</h2>
    <ul>
        <li><a href="./version.json"><code>version.json</code></a> - Version metadata</li>
        <li><a href="./dictionary.json"><code>dictionary.json</code></a> - Dictionary entries (${entries.length})</li>
        <li><a href="./leaderboard.json"><code>leaderboard.json</code></a> - Leaderboard data (${users.length} users)</li>
    </ul>
    <p>This data is consumed by the Pamiri Bridge mobile app.</p>
</body>
</html>`;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), indexHtml);
    console.log('✅ Generated index.html');

    return { versionTimestamp, entryCount: entries.length, userCount: users.length };
}

/**
 * Commit and push to gh-pages branch
 */
function publishToGitHubPages(stats) {
    console.log('');
    console.log('📤 Publishing to GitHub Pages...');

    const projectRoot = path.join(__dirname, '..');

    try {
        // Save current branch
        const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
            cwd: projectRoot,
            encoding: 'utf8'
        }).trim();

        console.log(`   Current branch: ${currentBranch}`);

        // Check if gh-pages branch exists
        try {
            execSync(`git rev-parse --verify ${BRANCH}`, { cwd: projectRoot, stdio: 'pipe' });
        } catch {
            console.log(`   Creating ${BRANCH} branch...`);
            execSync(`git checkout --orphan ${BRANCH}`, { cwd: projectRoot });
            execSync('git rm -rf .', { cwd: projectRoot, stdio: 'pipe' });
            execSync('git commit --allow-empty -m "Initialize gh-pages"', { cwd: projectRoot });
            execSync(`git checkout ${currentBranch}`, { cwd: projectRoot });
        }

        // Switch to gh-pages
        execSync(`git checkout ${BRANCH}`, { cwd: projectRoot });

        // Copy generated files to root
        const files = ['version.json', 'dictionary.json', 'leaderboard.json', 'index.html'];
        files.forEach(file => {
            fs.copyFileSync(
                path.join(OUTPUT_DIR, file),
                path.join(projectRoot, file)
            );
        });

        // Stage and commit
        execSync('git add version.json dictionary.json leaderboard.json index.html', { cwd: projectRoot });

        const commitMessage = `Update data: ${stats.entryCount} entries, ${stats.userCount} users`;
        execSync(`git commit -m "${commitMessage}"`, { cwd: projectRoot });

        if (DRY_RUN) {
            console.log('');
            console.log('🔍 DRY RUN - Skipping push');
            console.log('   To publish for real, run without --dry-run flag');
        } else {
            execSync(`git push origin ${BRANCH}`, { cwd: projectRoot });
            console.log('✅ Pushed to gh-pages!');
        }

        // Switch back to original branch
        execSync(`git checkout ${currentBranch}`, { cwd: projectRoot });
        console.log(`   Switched back to ${currentBranch}`);

    } catch (error) {
        console.error('❌ Git error:', error.message);
        // Try to recover by switching back to main
        try {
            execSync('git checkout main', { cwd: projectRoot, stdio: 'pipe' });
        } catch {
            try {
                execSync('git checkout master', { cwd: projectRoot, stdio: 'pipe' });
            } catch { }
        }
        throw error;
    }
}

/**
 * Cleanup temporary files
 */
function cleanup() {
    if (fs.existsSync(OUTPUT_DIR)) {
        fs.rmSync(OUTPUT_DIR, { recursive: true });
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   Pamiri Bridge - Publish Data to GitHub   ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('');

    if (DRY_RUN) {
        console.log('🔍 DRY RUN MODE - No changes will be pushed');
        console.log('');
    }

    try {
        const stats = await generateDataFiles();

        console.log('');
        console.log('📊 Summary:');
        console.log(`   Version:     ${stats.versionTimestamp}`);
        console.log(`   Entries:     ${stats.entryCount}`);
        console.log(`   Users:       ${stats.userCount}`);

        publishToGitHubPages(stats);

        console.log('');
        console.log('🎉 Publish complete!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Enable GitHub Pages for the gh-pages branch in repo settings');
        console.log('2. Your data will be available at:');
        console.log('   https://<username>.github.io/<repo>/dictionary.json');
        console.log('');

    } catch (error) {
        console.error('');
        console.error('❌ Publish failed:', error.message);
        process.exit(1);
    } finally {
        cleanup();
        process.exit(0);
    }
}

main();
