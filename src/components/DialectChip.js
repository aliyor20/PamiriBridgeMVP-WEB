import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SPACING } from '../constants/theme';
import { usePreferences } from '../context/PreferencesContext';

export default function DialectChip({ label, selected, onPress }) {
    const { colors } = usePreferences();

    return (
        <TouchableOpacity
            style={[
                styles.chip,
                {
                    backgroundColor: selected ? colors.primary : colors.surface,
                    borderColor: selected ? colors.primary : colors.border
                }
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={[
                styles.text,
                { color: selected ? colors.surface : colors.text }
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
        borderWidth: 1,
        marginRight: SPACING.s,
    },
    text: {
        fontSize: 14,
        fontWeight: '500',
    }
});
