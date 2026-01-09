import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS, SPACING, LAYOUT, SHADOWS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function Button({
    title,
    onPress,
    variant = 'primary', // primary, secondary, ghost, danger
    size = 'medium', // small, medium, large
    icon,
    loading = false,
    disabled = false,
    style
}) {
    const getBackgroundColor = () => {
        if (disabled) return COLORS.border;
        if (variant === 'primary') return COLORS.primary;
        if (variant === 'secondary') return COLORS.secondary;
        if (variant === 'danger') return COLORS.error;
        return 'transparent';
    };

    const getTextColor = () => {
        if (disabled) return COLORS.textLight;
        if (variant === 'ghost') return COLORS.primary;
        return COLORS.surface;
    };

    const btnStyle = [
        styles.base,
        { backgroundColor: getBackgroundColor() },
        variant !== 'ghost' && SHADOWS.small,
        size === 'small' && styles.small,
        size === 'large' && styles.large,
        style,
    ];

    return (
        <TouchableOpacity
            style={btnStyle}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <>
                    {icon && <Ionicons name={icon} size={20} color={getTextColor()} style={{ marginRight: 8 }} />}
                    <Text style={[styles.text, { color: getTextColor() }, size === 'small' && styles.textSmall]}>
                        {title}
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: LAYOUT.borderRadius.m,
    },
    small: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    large: {
        paddingVertical: 16,
        paddingHorizontal: 32,
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
    },
    textSmall: {
        fontSize: 14,
    }
});
