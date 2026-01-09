import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, LAYOUT, SHADOWS, SPACING } from '../constants/theme';

export default function Card({ children, style, variant = 'elevated', onPress }) {
    // If we need onPress, we should wrap in Touchable, but for now just View
    return (
        <View style={[
            styles.card,
            variant === 'elevated' && SHADOWS.small,
            variant === 'outlined' && styles.outlined,
            style
        ]}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: LAYOUT.borderRadius.m,
        padding: SPACING.m,
        marginBottom: SPACING.s,
    },
    outlined: {
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowOpacity: 0,
        elevation: 0,
    }
});
