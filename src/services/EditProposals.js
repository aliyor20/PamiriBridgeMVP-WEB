// src/services/EditProposals.js
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';

// Create a new edit proposal (shadow entry)
export const createEditProposal = async ({ originalEntryId, originalWord, originalMeaning, suggestedWord, suggestedMeaning }) => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    const proposal = {
        originalEntryId,
        originalWord,
        originalMeaning,
        suggestedWord,
        suggestedMeaning,
        suggesterId: user.uid,
        status: 'pending',
        votes_for: 0,
        votes_against: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    const ref = await addDoc(collection(db, 'edit_proposals'), proposal);
    return ref.id;
};

// Fetch pending edit proposals for ReviewScreen
export const fetchPendingEditProposals = async () => {
    const q = query(collection(db, 'edit_proposals'), where('status', '==', 'pending'));
    const snapshot = await getDocs(q);
    const proposals = [];
    snapshot.forEach(docSnap => {
        proposals.push({ id: docSnap.id, ...docSnap.data() });
    });
    return proposals;
};

// Vote on a proposal (upvote or downvote)
export const voteEditProposal = async (proposalId, isUpvote) => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    const proposalRef = doc(db, 'edit_proposals', proposalId);
    const field = isUpvote ? 'votes_for' : 'votes_against';
    await updateDoc(proposalRef, {
        [field]: increment(1),
        updatedAt: serverTimestamp()
    });
};
