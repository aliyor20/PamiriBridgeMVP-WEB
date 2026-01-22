import React, { useEffect } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedProps,
    withTiming,
    withDelay,
    Easing,
    runOnJS,
} from 'react-native-reanimated';

// Animated TextInput to display numbers
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export default function NumberTicker({ number, style, duration = 1000, delay = 0, suffix = '' }) {
    const animatedValue = useSharedValue(0);

    useEffect(() => {
        // Reset and start animation when number changes
        animatedValue.value = 0;
        animatedValue.value = withDelay(
            delay,
            withTiming(number, {
                duration: duration,
                easing: Easing.out(Easing.exp),
            })
        );
    }, [number, delay, duration]);

    const animatedProps = useAnimatedProps(() => {
        return {
            text: `${Math.round(animatedValue.value)}${suffix}`,
        };
    });

    return (
        <AnimatedTextInput
            underlineColorAndroid="transparent"
            editable={false}
            value={`${0}${suffix}`} // Initial value
            style={[styles.text, style]}
            animatedProps={animatedProps}
        />
    );
}

const styles = StyleSheet.create({
    text: {
        // Default text styles if none provided
        fontWeight: 'bold',
        color: '#000',
    },
});
