import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS, LAYOUT } from '../constants/theme';

export default function Skeleton({ width, height, style }) {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    return (
        <Animated.View
            style={[
                styles.skeleton,
                { width, height, opacity },
                style
            ]}
        />
    );
}

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: COLORS.border, // Light gray for structure
        borderRadius: LAYOUT.borderRadius.s,
    },
});
