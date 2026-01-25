// Use legacy API to avoid deprecation warnings in Expo SDK 54+
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';

const AUDIO_DIR = FileSystem.documentDirectory + 'audio/';

// Ensure directory exists
const ensureDir = async () => {
    const dirInfo = await FileSystem.getInfoAsync(AUDIO_DIR);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
    }
};

/**
 * Plays audio for a given entry.
 * Checks local cache first; if missing, downloads and caches it.
 * @param {string} url - The Firebase Storage URL
 * @param {string} entryId - The unique ID of the entry (used for filename)
 * @returns {Promise<Audio.Sound>} The loaded sound object
 */
export const playAudio = async (url, entryId) => {
    if (!url) return null;

    try {
        await ensureDir();
        const localUri = AUDIO_DIR + entryId + '.m4a';

        // 1. Check if file exists locally
        const fileInfo = await FileSystem.getInfoAsync(localUri);

        let soundObject;

        if (fileInfo.exists) {
            console.log("Playing from cache:", localUri);
            const { sound } = await Audio.Sound.createAsync(
                { uri: localUri },
                { shouldPlay: true }
            );
            soundObject = sound;
        } else {
            console.log("Not cached, downloading...", url);
            // 2. Download and save to local cache
            const downloadRes = await FileSystem.downloadAsync(url, localUri);

            if (downloadRes.status === 200) {
                console.log("Downloaded to:", downloadRes.uri);
                const { sound } = await Audio.Sound.createAsync(
                    { uri: downloadRes.uri },
                    { shouldPlay: true }
                );
                soundObject = sound;
            } else {
                // Fallback: Stream directly if download fails
                console.warn("Download failed, streaming...");
                const { sound } = await Audio.Sound.createAsync(
                    { uri: url },
                    { shouldPlay: true }
                );
                soundObject = sound;
            }
        }

        return soundObject;

    } catch (error) {
        console.error("AudioService Error:", error);
        // Last resort fallback
        try {
            const { sound } = await Audio.Sound.createAsync(
                { uri: url },
                { shouldPlay: true }
            );
            return sound;
        } catch (e) {
            console.error("Playback failed:", e);
            return null;
        }
    }
};

/**
 * Clear all cached audio files
 * Used by Settings > Clear Cache
 */
export const clearAudioCache = async () => {
    try {
        const dirInfo = await FileSystem.getInfoAsync(AUDIO_DIR);
        if (dirInfo.exists) {
            await FileSystem.deleteAsync(AUDIO_DIR, { idempotent: true });
            console.log("Audio cache cleared");
            return true;
        }
        return true;
    } catch (error) {
        console.error("Clear cache error:", error);
        return false;
    }
};

/**
 * Start recording audio
 * @returns {Promise<{recording: Audio.Recording, uri: string | null}>}
 */
export const startRecording = async () => {
    try {
        const permission = await Audio.requestPermissionsAsync();
        if (permission.status !== 'granted') {
            throw new Error('Permission not granted');
        }

        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.HIGH_QUALITY
        );

        return recording;
    } catch (err) {
        console.error('Failed to start recording', err);
        throw err;
    }
};

/**
 * Stop recording
 * @param {Audio.Recording} recording 
 * @returns {Promise<string>} uri of the recorded file
 */
export const stopRecording = async (recording) => {
    if (!recording) return null;

    try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        return uri;
    } catch (error) {
        console.error('Failed to stop recording', error);
        return null;
    }
};
