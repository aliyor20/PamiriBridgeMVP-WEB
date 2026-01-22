/**
 * TypewriterText - Animated typing/deleting text effect
 * Cycles through multiple text options with random delays
 * Cursor hides during pause periods when not actively typing
 */
import React, { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
} from 'react-native-reanimated';

export default function TypewriterText({
    prefix = '',
    suffixes = [],
    style,
    typingSpeed = 80,
    deletingSpeed = 50,
    pauseDuration = 2500,
    startDelay = 0,
    cursorHoldTime = 500, // New prop: delay before/after cursor state changes
    startFull = false,
    showCursorDuringPause = false,
}) {
    // Initial state: Always start in "Typing" mode logic to handle the full cycle transition correctly
    // even efficiently if starting full
    const [displayText, setDisplayText] = useState(startFull && suffixes.length > 0 ? prefix + suffixes[0] : '');
    const [isTyping, setIsTyping] = useState(true);
    const [suffixIndex, setSuffixIndex] = useState(0);
    const [charIndex, setCharIndex] = useState(startFull && suffixes.length > 0 ? suffixes[0].length : 0);
    const [hasStarted, setHasStarted] = useState(startDelay === 0);
    const [isActivelyTyping, setIsActivelyTyping] = useState(false);
    const timeoutRef = useRef(null);

    // Start delay timer
    useEffect(() => {
        if (startDelay === 0) {
            setHasStarted(true);
            return;
        }
        const startTimer = setTimeout(() => {
            setHasStarted(true);
        }, startDelay);
        return () => clearTimeout(startTimer);
    }, [startDelay]);

    // Typing/deleting logic
    useEffect(() => {
        if (!hasStarted) return;
        if (suffixes.length === 0) return;

        const currentSuffix = suffixes[suffixIndex];

        if (isTyping) {
            // Typing phase
            if (charIndex < currentSuffix.length) {
                if (!isActivelyTyping) setIsActivelyTyping(true);

                timeoutRef.current = setTimeout(() => {
                    setDisplayText(prefix + currentSuffix.substring(0, charIndex + 1));
                    setCharIndex(prev => prev + 1);
                }, typingSpeed + Math.random() * 40);
            } else {
                // Finished typing (or started full)
                // Cycle: Hold Cursor (if visible) -> Hide -> Pause -> Show Cursor -> Hold -> Switch to Delete

                // 1. Hold cursor visible for a moment after typing finishes
                timeoutRef.current = setTimeout(() => {
                    // 2. Hide cursor (unless forced active)
                    setIsActivelyTyping(false);

                    // 3. Wait for reading pause
                    timeoutRef.current = setTimeout(() => {
                        // 4. Show cursor again (warning: about to delete)
                        setIsActivelyTyping(true);

                        // 5. Short delay with cursor visible before deleting starts
                        timeoutRef.current = setTimeout(() => {
                            setIsTyping(false); // Switch to deleting phase
                        }, cursorHoldTime);

                    }, pauseDuration);

                }, cursorHoldTime);
            }
        } else {
            // Deleting phase
            if (charIndex > 0) {
                if (!isActivelyTyping) setIsActivelyTyping(true);

                timeoutRef.current = setTimeout(() => {
                    setCharIndex(prev => prev - 1);
                    setDisplayText(prefix + currentSuffix.substring(0, charIndex - 1));
                }, deletingSpeed);
            } else {
                // Finished deleting, move to next suffix immediately
                const nextIndex = (suffixIndex + 1) % suffixes.length;
                setSuffixIndex(nextIndex);
                setIsTyping(true);
            }
        }

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [hasStarted, charIndex, isTyping, suffixIndex, suffixes, prefix, typingSpeed, deletingSpeed, pauseDuration, cursorHoldTime]);

    // Blinking cursor animation
    const cursorOpacity = useSharedValue(1);

    useEffect(() => {
        cursorOpacity.value = withRepeat(
            withSequence(
                withTiming(0, { duration: 400 }),
                withTiming(1, { duration: 400 })
            ),
            -1, // infinite
            false
        );
    }, []);

    const cursorStyle = useAnimatedStyle(() => ({
        opacity: cursorOpacity.value,
    }));

    // Determine if cursor should be visible
    const shouldShowCursor = !hasStarted ? false : (isActivelyTyping || showCursorDuringPause);

    // If not started yet...
    if (!hasStarted) {
        if (startFull && suffixes.length > 0) {
            const suffixPart = suffixes[0];
            return (
                <View style={styles.row}>
                    <Text style={style}>{prefix}</Text>
                    <Text style={style}>{suffixPart}</Text>
                </View>
            );
        }
        return (
            <View style={styles.row}>
                <Text style={style}>{prefix}</Text>
            </View>
        );
    }

    // Main render
    const suffixPart = displayText.substring(prefix.length);

    return (
        <View style={styles.row}>
            <Text style={style}>{prefix}</Text>
            <Text style={style}>{suffixPart}</Text>
            {shouldShowCursor && (
                <Animated.Text style={[style, cursorStyle]}>|</Animated.Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',  // Left align so prefix stays fixed
        minWidth: 280,  // Fixed width to prevent shifting
    },
});
