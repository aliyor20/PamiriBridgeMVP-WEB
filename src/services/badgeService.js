/**
 * Badge Service - Automatic badge awarding system
 * 
 * Badges per documentation:
 * - Pioneer: First contribution
 * - Scribe: 50+ words added
 * - Voice of the Mountain: 10+ minutes of audio
 * - Polyglot: Contributions in 3+ dialects
 * - Word Collector: 10+ contributions
 */

import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Badge definitions with thresholds and metadata
export const BADGES = {
    pioneer: {
        id: 'pioneer',
        name: 'Pioneer',
        description: 'Made your first contribution',
        icon: 'flag',
        color: '#00897b', // Primary teal
        threshold: (stats) => stats.wordsAdded >= 1
    },
    word_collector: {
        id: 'word_collector',
        name: 'Word Collector',
        description: 'Contributed 10+ words',
        icon: 'book',
        color: '#6366f1', // Indigo
        threshold: (stats) => stats.wordsAdded >= 10
    },
    scribe: {
        id: 'scribe',
        name: 'Scribe',
        description: 'Contributed 50+ words',
        icon: 'create',
        color: '#f59e0b', // Amber
        threshold: (stats) => stats.wordsAdded >= 50
    },
    voice_of_mountain: {
        id: 'voice_of_mountain',
        name: 'Voice of the Mountain',
        description: '10+ minutes of audio recorded',
        icon: 'mic',
        color: '#ef4444', // Red
        threshold: (stats) => stats.audioMinutes >= 10
    },
    polyglot: {
        id: 'polyglot',
        name: 'Polyglot',
        description: 'Contributed in 3+ dialects',
        icon: 'globe',
        color: '#10b981', // Emerald
        threshold: (stats) => stats.dialectCount >= 3
    },
    elder: {
        id: 'elder',
        name: 'Elder',
        description: 'Trusted community verifier',
        icon: 'shield-checkmark',
        color: '#b7282e', // Secondary red
        threshold: (stats) => stats.isAdmin === true
    }
};

/**
 * Check and award badges based on user stats
 * @param {string} userId - Firebase user ID
 * @param {object} stats - User statistics {wordsAdded, audioMinutes, dialectCount, isAdmin}
 * @returns {Promise<string[]>} - Array of newly earned badge IDs
 */
export const checkAndAwardBadges = async (userId, stats) => {
    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            console.log('User document not found for badge check');
            return [];
        }

        const userData = userDoc.data();
        const currentBadges = userData.badges || [];
        const newBadges = [];

        // Check each badge
        for (const [badgeId, badge] of Object.entries(BADGES)) {
            // Skip if already earned
            if (currentBadges.includes(badgeId)) continue;

            // Check if threshold is met
            if (badge.threshold(stats)) {
                newBadges.push(badgeId);
            }
        }

        // Award new badges
        if (newBadges.length > 0) {
            await updateDoc(userRef, {
                badges: arrayUnion(...newBadges)
            });
            console.log(`Awarded badges to ${userId}:`, newBadges);
        }

        return newBadges;
    } catch (error) {
        console.error('Error checking/awarding badges:', error);
        return [];
    }
};

/**
 * Get user's contribution stats for badge calculation
 * @param {string} userId - Firebase user ID
 * @returns {Promise<object>} - Stats object
 */
export const getUserStats = async (userId) => {
    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            return { wordsAdded: 0, audioMinutes: 0, dialectCount: 0, isAdmin: false };
        }

        const data = userDoc.data();
        return {
            wordsAdded: data.points || 0, // Points = words contributed
            audioMinutes: data.audio_minutes || 0,
            dialectCount: data.dialect_count || 0,
            isAdmin: data.isAdmin || false
        };
    } catch (error) {
        console.error('Error fetching user stats:', error);
        return { wordsAdded: 0, audioMinutes: 0, dialectCount: 0, isAdmin: false };
    }
};

/**
 * Get badge details by ID
 * @param {string} badgeId - Badge identifier
 * @returns {object|null} - Badge details or null
 */
export const getBadgeById = (badgeId) => {
    return BADGES[badgeId] || null;
};

/**
 * Get all badges with earned status for a user
 * @param {string[]} earnedBadges - Array of earned badge IDs
 * @returns {object[]} - Array of badge objects with earned flag
 */
export const getAllBadgesWithStatus = (earnedBadges = []) => {
    return Object.values(BADGES).map(badge => ({
        ...badge,
        earned: earnedBadges.includes(badge.id)
    }));
};
