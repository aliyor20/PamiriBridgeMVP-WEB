import { collection, query, where, orderBy, limit, getDocs, doc, setDoc, serverTimestamp, runTransaction, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';

/**
 * Fetches recent verified word additions/edits from Firestore.
 * This acts as the "Delta" to the massive JSON bulk download.
 * @param {string|number|Date} lastSyncTimestamp - The timestamp of the last known update.
 * @returns {Array} Array of dictionary entry objects.
 */
export async function fetchDeltasFromFirestore(lastSyncTimestamp) {
    try {
        const dictionaryRef = collection(db, 'dictionary');

        // Firestore strictly expects Date objects to compare against Timestamps accurately
        // It will fail if comparing a Number against a Timestamp.
        let safeDateToCompare = lastSyncTimestamp;
        if (typeof lastSyncTimestamp === 'number' || typeof lastSyncTimestamp === 'string') {
            safeDateToCompare = new Date(lastSyncTimestamp);
        } else if (lastSyncTimestamp?.toDate) {
            safeDateToCompare = lastSyncTimestamp.toDate();
        }

        // Ensure we only grab verified words, ordered by oldest first after the last sync point.
        // Limit to 20 to prevent accidental massive reads if the sync falls way behind or bugs out.
        const q = query(
            dictionaryRef,
            where('status', '==', 'verified'),
            where('updatedAt', '>', safeDateToCompare),
            orderBy('updatedAt', 'asc'),
            limit(20)
        );

        const querySnapshot = await getDocs(q);
        const deltas = [];
        querySnapshot.forEach((doc) => {
            deltas.push({ id: doc.id, ...doc.data() });
        });

        return deltas;
    } catch (error) {
        console.error("Error fetching deltas:", error);
        return []; // Fail gracefully, user still gets IDB base data.
    }
}

/**
 * Submits a new dictionary entry to the 'entries' collection for verification.
 */
export async function submitContribution({ word, definitions, alphabet, dialect, example, contributorId, audioBlob }) {
    const newEntryRef = doc(collection(db, 'entries'));
    let audioURL = null;

    if (audioBlob) {
        const audioRef = ref(storage, `audio/${newEntryRef.id}.m4a`);
        await uploadBytes(audioRef, audioBlob);
        audioURL = await getDownloadURL(audioRef);
    }

    const entryData = {
        word: word.trim().toLowerCase(),
        definitions, // Object like { en: "...", ru: "..." }
        alphabet, // 'Cyrillic' or 'Latin'
        dialect,
        example: example?.trim() || null,
        contributorId,
        status: 'pending',
        timestamp: serverTimestamp(),
        upvotes: 0,
        downvotes: 0,
        voters: [], // array of UIDs to track who voted
        audioURL
    };

    await setDoc(newEntryRef, entryData);

    // Save locally for Profile History (Cache warning applies to iOS)
    const localHistory = JSON.parse(localStorage.getItem('pb_contribution_history') || '[]');
    localHistory.unshift({
        id: newEntryRef.id,
        word: entryData.word,
        meaning: entryData.meaning,
        date: new Date().toISOString(),
        status: 'pending'
    });
    localStorage.setItem('pb_contribution_history', JSON.stringify(localHistory));

    return newEntryRef.id;
}

/**
 * Executes a vote transaction for the Verification Engine (3 vote consensus).
 * Rewards voter with 1 Karma point.
 */
export async function voteOnEntry(entryId, voterId, isApproved) {
    const entryRef = doc(db, 'entries', entryId);
    const userRef = doc(db, 'users', voterId);

    try {
        await runTransaction(db, async (transaction) => {
            const entryDoc = await transaction.get(entryRef);
            if (!entryDoc.exists()) {
                throw new Error("Entry does not exist!");
            }

            const data = entryDoc.data();
            if (data.voters && data.voters.includes(voterId)) {
                throw new Error("User has already voted on this entry.");
            }

            const newUpvotes = data.upvotes + (isApproved ? 1 : 0);
            const newDownvotes = data.downvotes + (isApproved ? 0 : 1);

            // Reached Threshold => Move to Verified
            let newStatus = data.status;
            if (newUpvotes >= 3 && newStatus === 'pending') {
                newStatus = 'verified';
                // Note: For a real production app, moving a document from `entries` to `dictionary`
                // via a Cloud Function is safer, but MVP can do it via transaction or client directly.
                // We'll trust the Android logic where status='verified' makes it discoverable.
            }

            transaction.update(entryRef, {
                upvotes: newUpvotes,
                downvotes: newDownvotes,
                voters: [...(data.voters || []), voterId],
                status: newStatus,
                ...(newStatus === 'verified' && { verifiedAt: serverTimestamp() })
            });

            // Reward Voter
            const userDoc = await transaction.get(userRef);
            if (userDoc.exists()) {
                const currentKarma = userDoc.data().karma || 0;
                transaction.update(userRef, { karma: currentKarma + 1 });
            }
        });
        return true;
    } catch (error) {
        console.error("Transaction failed: ", error);
        throw error;
    }
}

/**
 * Updates a user's points safely using Firestore increment.
 * Used for batching local gamification points.
 */
import { updateDoc, increment } from 'firebase/firestore';

export async function updateUserPoints(userId, pointsToAdd) {
    if (!userId || pointsToAdd <= 0) return;
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            points: increment(pointsToAdd)
        });
        console.log(`Successfully added ${pointsToAdd} points to user ${userId}`);
    } catch (error) {
        console.error("Failed to update user points:", error);
        throw error;
    }
}
