import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';

import { SPACING, LAYOUT } from '../constants/theme';
import { usePreferences } from '../context/PreferencesContext';
import ThemePicker from '../components/ThemePicker';
import { auth } from '../firebaseConfig';

import { DIALECTS } from '../constants/dataConfig';

import ActionModal from '../components/ActionModal';

export default function SettingsScreen() {
    const navigation = useNavigation();
    const {
        primaryDialect,
        updatePrimaryDialect,
        colors,
    } = usePreferences();

    const [clearingCache, setClearingCache] = useState(false);

    // --- MODAL STATE ---
    const [modal, setModal] = useState({
        visible: false,
        type: 'info',
        title: '',
        message: '',
        onAction: () => { },
    });

    const showModal = (config) => {
        setModal({ ...config, visible: true });
    };

    const hideModal = () => {
        setModal(prev => ({ ...prev, visible: false }));
    };

    const SectionHeader = ({ title }) => (
        <Text style={[styles.sectionHeader, { color: colors.textLight }]}>{title}</Text>
    );

    const ToggleRow = ({ label, value, onValueChange, description }) => (
        <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>{label}</Text>
                {description && (
                    <Text style={[styles.toggleDescription, { color: colors.textLight }]}>
                        {description}
                    </Text>
                )}
            </View>
            <Switch
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={'#fff'}
                ios_backgroundColor={colors.border}
                onValueChange={(val) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onValueChange(val);
                }}
                value={value}
            />
        </View>
    );

    const ActionRow = ({ label, icon, onPress, destructive, loading }) => (
        <TouchableOpacity
            style={styles.actionRow}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress();
            }}
            disabled={loading}
        >
            <Ionicons
                name={icon}
                size={20}
                color={destructive ? colors.error : colors.primary}
            />
            <Text style={[
                styles.actionLabel,
                { color: destructive ? colors.error : colors.text }
            ]}>
                {loading ? 'Processing...' : label}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </TouchableOpacity>
    );

    const handleClearCache = async () => {
        showModal({
            type: 'confirm',
            title: 'Clear Audio Cache',
            message: 'This will delete all cached audio files. They will be re-downloaded when you play them again.',
            primaryActionLabel: 'Clear',
            secondaryActionLabel: 'Cancel',
            onSecondaryAction: hideModal,
            onPrimaryAction: async () => {
                hideModal();
                setClearingCache(true);
                try {
                    const audioDir = FileSystem.documentDirectory + 'audio/';
                    const dirInfo = await FileSystem.getInfoAsync(audioDir);
                    if (dirInfo.exists) {
                        await FileSystem.deleteAsync(audioDir, { idempotent: true });
                    }
                    setTimeout(() => {
                        showModal({
                            type: 'success',
                            title: 'Success',
                            message: 'Audio cache cleared successfully.',
                            onPrimaryAction: hideModal
                        });
                    }, 500);
                } catch (error) {
                    console.error("Clear cache error:", error);
                    setTimeout(() => {
                        showModal({
                            type: 'error',
                            title: 'Error',
                            message: 'Failed to clear cache.',
                            onPrimaryAction: hideModal
                        });
                    }, 500);
                } finally {
                    setClearingCache(false);
                }
            }
        });
    };

    // Audio is always compressed to 32kbps AAC per Firebase Spark Plan specs
    // No data saver toggle needed - compression is mandatory

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Appearance Section */}
                <SectionHeader title="Appearance" />
                <View style={[styles.card, { backgroundColor: colors.surface }]}>
                    <ThemePicker />
                </View>

                {/* Your Identity Section */}
                <SectionHeader title="Your Identity" />
                <View style={[styles.card, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.helperText, { color: colors.textLight }]}>
                        Choose your primary dialect to filter the home feed by default.
                    </Text>
                    <View style={styles.dialectGrid}>
                        {DIALECTS.map((d) => (
                            <TouchableOpacity
                                key={d}
                                style={[
                                    styles.dialectChip,
                                    { backgroundColor: colors.background, borderColor: colors.border },
                                    primaryDialect === d && { backgroundColor: colors.primary, borderColor: colors.primary }
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    updatePrimaryDialect(d);
                                }}
                            >
                                <Text style={[
                                    styles.chipText,
                                    { color: colors.text },
                                    primaryDialect === d && styles.selectedChipText
                                ]}>
                                    {d}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* About Section */}
                <SectionHeader title="About" />
                <View style={[styles.card, { backgroundColor: colors.surface }]}>
                    <View style={styles.aboutRow}>
                        <Text style={[styles.aboutLabel, { color: colors.textLight }]}>Version</Text>
                        <Text style={[styles.aboutValue, { color: colors.text }]}>1.0.0 (Beta)</Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.aboutRow}>
                        <Text style={[styles.aboutLabel, { color: colors.textLight }]}>Build</Text>
                        <Text style={[styles.aboutValue, { color: colors.text }]}>2026.1</Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <Text style={[styles.aboutText, { color: colors.textLight }]}>
                        Pamiri Bridge is a community-driven dictionary for preserving Pamiri languages.
                        Your contributions help keep our heritage alive.
                    </Text>
                </View>

                {/* Privacy Section */}
                <SectionHeader title="Privacy & Security" />
                <View style={[styles.card, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.aboutText, { color: colors.textLight }]}>
                        Your data is stored securely in Firebase. Audio recordings and contributions
                        are associated with your account. You can delete your contributions at any time
                        from your profile.
                    </Text>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <Text style={[styles.privacyNote, { color: colors.primary }]}>
                        📍 All data belongs to the Pamiri community
                    </Text>
                </View>

                {/* Account Section */}
                <SectionHeader title="Account" />
                <View style={[styles.card, { backgroundColor: colors.surface }]}>
                    <ActionRow
                        label="Sign Out"
                        icon="log-out-outline"
                        onPress={() => {
                            showModal({
                                type: 'confirm',
                                title: 'Sign Out',
                                message: 'Are you sure you want to sign out?',
                                primaryActionLabel: 'Sign Out',
                                secondaryActionLabel: 'Cancel',
                                onSecondaryAction: hideModal,
                                onPrimaryAction: () => {
                                    hideModal();
                                    auth.signOut();
                                }
                            });
                        }}
                        destructive
                    />
                </View>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: colors.textLight }]}>
                        Made with ❤️ for the Pamiri diaspora
                    </Text>
                </View>

            </ScrollView>

            <ActionModal
                visible={modal.visible}
                type={modal.type}
                title={modal.title}
                message={modal.message}
                primaryActionLabel={modal.primaryActionLabel}
                onPrimaryAction={modal.onAction || modal.onPrimaryAction || hideModal}
                secondaryActionLabel={modal.secondaryActionLabel}
                onSecondaryAction={modal.onSecondaryAction}
                onDismiss={hideModal}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.m,
        borderBottomWidth: 1,
    },
    backButton: {
        marginRight: SPACING.m,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        padding: SPACING.m,
        paddingBottom: SPACING.xxl,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: SPACING.s,
        marginTop: SPACING.m,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    card: {
        borderRadius: LAYOUT.borderRadius.m,
        padding: SPACING.m,
        marginBottom: SPACING.s,
    },
    helperText: {
        fontSize: 14,
        marginBottom: SPACING.m,
    },
    dialectGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    dialectChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 14,
    },
    selectedChipText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.s,
    },
    toggleLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    toggleDescription: {
        fontSize: 12,
        marginTop: 2,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.m,
        gap: SPACING.m,
    },
    actionLabel: {
        flex: 1,
        fontSize: 16,
    },
    divider: {
        height: 1,
        marginVertical: SPACING.s,
    },
    aboutRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: SPACING.s,
    },
    aboutLabel: {
        fontSize: 14,
    },
    aboutValue: {
        fontSize: 14,
        fontWeight: '500',
    },
    aboutText: {
        fontSize: 14,
        lineHeight: 20,
        paddingVertical: SPACING.s,
    },
    privacyNote: {
        fontSize: 13,
        fontWeight: '500',
        paddingVertical: SPACING.s,
    },
    footer: {
        marginTop: SPACING.xl,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
    },
});
