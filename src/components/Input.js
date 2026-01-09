import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, LAYOUT, TYPOGRAPHY } from '../constants/theme';

export default function Input({
    label,
    value,
    onChangeText,
    placeholder,
    error,
    secureTextEntry,
    autoCapitalize = 'none',
    keyboardType = 'default',
    multiline = false,
    rightIcon,
    style
}) {
    return (
        <View style={[styles.container, style]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={[
                styles.inputContainer,
                error && styles.inputError,
                multiline && { height: 100, alignItems: 'flex-start' }
            ]}>
                <TextInput
                    style={[styles.input, multiline && { paddingTop: 12 }]} // Fix alignment for multiline
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.textLight}
                    secureTextEntry={secureTextEntry}
                    autoCapitalize={autoCapitalize}
                    keyboardType={keyboardType}
                    multiline={multiline}
                />
                {rightIcon && <View style={styles.iconContainer}>{rightIcon}</View>}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.m,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: SPACING.xs,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.inputBg,
        borderRadius: LAYOUT.borderRadius.m,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    inputError: {
        borderColor: COLORS.error,
    },
    input: {
        flex: 1,
        padding: 12,
        fontSize: 16,
        color: COLORS.text,
        minHeight: 48,
    },
    iconContainer: {
        paddingRight: 12,
    },
    errorText: {
        fontSize: 12,
        color: COLORS.error,
        marginTop: 4,
        marginLeft: 4,
    }
});
