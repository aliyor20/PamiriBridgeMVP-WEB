import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { SPACING, LAYOUT } from '../constants/theme';
import { usePreferences } from '../context/PreferencesContext';

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
    const { colors } = usePreferences();

    return (
        <View style={[styles.container, style]}>
            {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
            <View style={[
                styles.inputContainer,
                { backgroundColor: colors.inputBg, borderColor: error ? colors.error : colors.border },
                multiline && { height: 100, alignItems: 'flex-start' }
            ]}>
                <TextInput
                    style={[styles.input, { color: colors.text }, multiline && { paddingTop: 12 }]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textLight}
                    secureTextEntry={secureTextEntry}
                    autoCapitalize={autoCapitalize}
                    keyboardType={keyboardType}
                    multiline={multiline}
                />
                {rightIcon && <View style={styles.iconContainer}>{rightIcon}</View>}
            </View>
            {error && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}
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
        marginBottom: SPACING.xs,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: LAYOUT.borderRadius.m,
        borderWidth: 1,
    },
    input: {
        flex: 1,
        padding: 12,
        fontSize: 16,
        minHeight: 48,
    },
    iconContainer: {
        paddingRight: 12,
    },
    errorText: {
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    }
});
