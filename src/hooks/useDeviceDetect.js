import { useState, useEffect } from 'react';

export function useDeviceDetect() {
    const [isIOS, setIsIOS] = useState(false);
    const [isAndroid, setIsAndroid] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        const userAgent = window.navigator.userAgent || window.navigator.vendor || window.opera;

        // Detect iOS (includes iPhone, iPad, iPod)
        if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
            setIsIOS(true);
        }

        // Detect Android
        if (/android/i.test(userAgent)) {
            setIsAndroid(true);
        }

        // Detect standalone (PWA installed)
        // Check window.matchMedia for standard PWA or navigator.standalone for iOS specifically
        const isStandalonePWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        setIsStandalone(!!isStandalonePWA);
    }, []);

    return { isIOS, isAndroid, isStandalone };
}
