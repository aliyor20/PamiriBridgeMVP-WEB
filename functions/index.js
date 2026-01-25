const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();

// Threshold for acceptance
const VOTE_THRESHOLD = 5;

exports.onEditProposalUpdate = functions.firestore
    .document('edit_proposals/{proposalId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();

        // 1. Security/Logic Check: Only run if status is pending
        if (after.status !== 'pending') {
            console.log('Proposal already finalized. Skipping.');
            return null;
        }

        // 2. Edge Trigger:
        // Run ONLY if votes_for was LESS than threshold BEFORE, and meets/exceeds it AFTER.
        const metThresholdNow = after.votes_for >= VOTE_THRESHOLD;
        const metThresholdBefore = before.votes_for >= VOTE_THRESHOLD;

        if (metThresholdNow && !metThresholdBefore) {
            console.log(`Proposal ${context.params.proposalId} reached threshold (${after.votes_for}). Merging to ${after.originalEntryId}.`);

            try {
                const entryRef = db.collection('entries').doc(after.originalEntryId);

                // Transaction to ensure atomicity usually good, but simple update is okay here for MVP
                // We update the MAIN entry
                await entryRef.update({
                    word: after.suggestedWord,
                    meaning: after.suggestedMeaning,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    lastEditProposalId: context.params.proposalId // Traceability
                });

                // Mark proposal as merged
                await change.after.ref.update({
                    status: 'merged',
                    mergedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                console.log(`Successfully merged proposal ${context.params.proposalId}`);

            } catch (error) {
                console.error(`Error merging proposal ${context.params.proposalId}:`, error);
                // Optionally log error to proposal
            }
        }

        return null;
    });
