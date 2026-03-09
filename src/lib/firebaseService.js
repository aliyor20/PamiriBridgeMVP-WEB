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
        const dictionaryRef = collection(db, 'entries'); // Use entries where new contributions live

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
            where('timestamp', '>', safeDateToCompare),
            orderBy('timestamp', 'asc'),
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

            // Read user doc BEFORE any writes to satisfy Firestore transaction rules
            const userDoc = await transaction.get(userRef);

            const data = entryDoc.data();
            if (data.voters && data.voters.includes(voterId)) {
                throw new Error("User has already voted on this entry.");
            }

            const currentUpvotes = typeof data.upvotes === 'number' && !isNaN(data.upvotes) ? data.upvotes : 0;
            const currentDownvotes = typeof data.downvotes === 'number' && !isNaN(data.downvotes) ? data.downvotes : 0;
            const newUpvotes = currentUpvotes + (isApproved ? 1 : 0);
            const newDownvotes = currentDownvotes + (isApproved ? 0 : 1);

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
                ...(newStatus === 'verified' && {
                    verifiedAt: serverTimestamp(),
                    timestamp: serverTimestamp() // Ensure delta sync catches this as freshly updated
                })
            });

            // Reward Voter
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

/**
 * Creates a new edit proposal for a given entry.
 */
export async function submitEditProposal({ originalEntryId, originalWord, originalMeaning, suggestedWord, suggestedMeaning, contributorId }) {
    const newProposalRef = doc(collection(db, 'edit_proposals'));
    const proposal = {
        originalEntryId,
        originalWord,
        originalMeaning,
        suggestedWord,
        suggestedMeaning,
        suggesterId: contributorId,
        status: 'pending',
        votes_for: 0,
        votes_against: 0,
        voters: [], // Track who voted
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    await setDoc(newProposalRef, proposal);
    return newProposalRef.id;
}

/**
 * Executes a vote transaction for an Edit Proposal (3 vote consensus).
 */
export async function voteOnEditProposal(proposalId, voterId, isUpvote) {
    const proposalRef = doc(db, 'edit_proposals', proposalId);

    return await runTransaction(db, async (transaction) => {
        const proposalDoc = await transaction.get(proposalRef);

        if (!proposalDoc.exists()) throw new Error("Proposal does not exist!");

        const data = proposalDoc.data();
        if (data.status !== 'pending') throw new Error("Proposal is already finalized.");

        if (data.voters && data.voters.includes(voterId)) {
            throw new Error("You have already voted on this proposal.");
        }

        // Firestore reads must happen before writes
        const userRef = doc(db, 'users', voterId);
        const userDoc = await transaction.get(userRef);

        const newVotesFor = isUpvote ? (data.votes_for || 0) + 1 : (data.votes_for || 0);
        const newVotesAgainst = !isUpvote ? (data.votes_against || 0) + 1 : (data.votes_against || 0);
        const newVoters = [...(data.voters || []), voterId];

        // 1. APPROVAL THRESHOLD (>= 3 For)
        if (newVotesFor >= 3) {
            const entryRef = doc(db, 'entries', data.originalEntryId);

            // Apply edit to original entry
            transaction.update(entryRef, {
                word: data.suggestedWord,
                meaning: data.suggestedMeaning,
                timestamp: serverTimestamp(), // Update timestamp so Delta Sync picks it up
                updatedAt: serverTimestamp(),
                lastEditedBy: voterId
            });

            // Mark proposal as approved
            transaction.update(proposalRef, {
                status: 'approved',
                votes_for: newVotesFor,
                voters: newVoters,
                resolvedAt: serverTimestamp()
            });

            return 'APPROVED';
        }

        // 2. REJECTION THRESHOLD (>= 3 Against)
        if (newVotesAgainst >= 3) {
            transaction.update(proposalRef, {
                status: 'rejected',
                votes_against: newVotesAgainst,
                voters: newVoters,
                resolvedAt: serverTimestamp()
            });
            return 'REJECTED';
        }

        // 3. JUST A VOTE
        transaction.update(proposalRef, {
            votes_for: newVotesFor,
            votes_against: newVotesAgainst,
            voters: newVoters,
            updatedAt: serverTimestamp()
        });

        // Award 1 point to the voter
        if (userDoc.exists()) {
            transaction.update(userRef, { points: increment(1) });
        }

        return 'VOTED';
    });
}

