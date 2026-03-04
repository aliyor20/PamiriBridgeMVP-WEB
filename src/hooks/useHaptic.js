import { useCallback } from 'react';

/**
 * Hook to trigger haptic feedback using the navigator.vibrate API.
 * Provides presets for common interactions: 'light', 'medium', 'heavy', 'success', 'error'.
 */
export const useHaptic = () => {
    const trigger = useCallback((type = 'light') => {
        // Check for support
        if (typeof navigator === 'undefined' || !navigator.vibrate) return;

        try {
            switch (type) {
                case 'light':
                    navigator.vibrate(10); // Subtle tick
                    break;
                case 'medium':
                    navigator.vibrate(20); // Noticeable tick
                    break;
                case 'heavy':
                    navigator.vibrate(40); // Hard thud
                    break;
                case 'success':
                    navigator.vibrate([10, 30, 20]); // Da-da-DA
                    break;
                case 'error':
                    navigator.vibrate([50, 50, 50]); // Buzz-Buzz-Buzz
                    break;
                default:
                    navigator.vibrate(10);
            }
        } catch (e) {
            // Ignore errors, haptics are progressive enhancement
            console.debug('Haptics failed:', e);
        }
    }, []);

    return trigger;
};
