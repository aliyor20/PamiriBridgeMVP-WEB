import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, LAYOUT } from '../constants/theme';

export default function DialectChip({ label, selected, onPress }) {
    return (
        <TouchableOpacity
            style={[
                styles.chip,
                selected && styles.chipSelected
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={[
                styles.text,
                selected && styles.textSelected
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    chip: {
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: SPACING.s,
    },
    chipSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    text: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
    textSelected: {
        color: COLORS.surface,
        fontWeight: '600',
    }
});
