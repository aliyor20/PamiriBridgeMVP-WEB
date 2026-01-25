import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Platform, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
    FadeIn,
    FadeInDown,
    ZoomIn
} from 'react-native-reanimated';
import { usePreferences } from '../context/PreferencesContext';
import { LinearGradient } from 'expo-linear-gradient';
import NumberTicker from './NumberTicker';

const { width, height } = Dimensions.get('window');

export default function ShareableStatsModal({ visible, onClose, userData, contributionCount }) {
    const { colors, isDark } = usePreferences();

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint={isDark ? 'dark' : 'light'} style={styles.container}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

                <Animated.View
                    entering={ZoomIn.springify().damping(18).stiffness(120)}
                    style={[styles.card, { backgroundColor: isDark ? '#0F0F0F' : '#ffffff' }]}
                >
                    {/* Shareable Content Container */}
                    <View style={styles.contentContainer}>
                        {/* Decorative Background Elements */}
                        <LinearGradient
                            colors={[colors.primary, colors.secondary || '#8b5cf6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.headerGradient}
                        />
                        <View style={[styles.circleDeco, { backgroundColor: colors.surface }]} />

                        {/* Avatar */}
                        <View style={styles.avatarContainer}>
                            <LinearGradient
                                colors={['#ffffff', '#f0f0f0']}
                                style={styles.avatarGradient}
                            >
                                <Text style={[styles.avatarText, { color: colors.primary }]}>
                                    {(userData?.displayName || 'U').charAt(0).toUpperCase()}
                                </Text>
                            </LinearGradient>
                            {/* User Status Badge */}
                            {userData?.status === 'Guide' || userData?.isAdmin ? (
                                <View style={[styles.statusBadge, { backgroundColor: userData.isAdmin ? '#ef4444' : '#eab308' }]}>
                                    <Ionicons name={userData.isAdmin ? 'shield' : 'compass'} size={12} color="#fff" />
                                </View>
                            ) : null}
                        </View>

                        {/* User Info */}
                        <View style={styles.infoSection}>
                            <Text style={[styles.displayName, { color: colors.text }]}>
                                {userData?.displayName || 'Pamiri User'}
                            </Text>
                            {/* Removed @pamirilexicon */}
                            <View style={[styles.rolePill, { backgroundColor: `${colors.primary}15`, marginTop: 8 }]}>
                                <Text style={[styles.roleText, { color: colors.primary }]}>
                                    {userData?.isAdmin ? 'Administrator' : (userData?.status || 'Contributor').toUpperCase()}
                                </Text>
                            </View>
                        </View>

                        {/* Stats Grid */}
                        <View style={styles.statsGrid}>
                            <View style={[styles.statItem, { backgroundColor: isDark ? '#1a1a1a' : '#f9f9f9', borderColor: colors.border }]}>
                                <NumberTicker
                                    number={contributionCount || 0}
                                    textSize={24}
                                    textStyle={{ fontWeight: '800', color: colors.text, marginBottom: 4 }}
                                />
                                <Text style={[styles.statLabel, { color: colors.textLight }]}>CONTRIBUTIONS</Text>
                            </View>

                            <View style={[styles.statItem, { backgroundColor: isDark ? '#1a1a1a' : '#f9f9f9', borderColor: colors.border }]}>
                                <NumberTicker
                                    number={userData?.points || 0}
                                    textSize={24}
                                    textStyle={{ fontWeight: '800', color: colors.text, marginBottom: 4 }}
                                />
                                <Text style={[styles.statLabel, { color: colors.textLight }]}>TOTAL POINTS</Text>
                            </View>

                            <View style={[styles.statItem, { backgroundColor: isDark ? '#1a1a1a' : '#f9f9f9', borderColor: colors.border }]}>
                                <NumberTicker
                                    number={(userData?.badges || []).length}
                                    textSize={24}
                                    textStyle={{ fontWeight: '800', color: colors.text, marginBottom: 4 }}
                                />
                                <Text style={[styles.statLabel, { color: colors.textLight }]}>BADGES</Text>
                            </View>
                        </View>

                        {/* Footer Logo */}
                        <View style={styles.footer}>
                            <Image
                                source={require('../../assets/icon.png')}
                                style={{ width: 24, height: 24, borderRadius: 6 }}
                            />
                            <Text style={[styles.appName, { color: colors.textLight }]}>Pamiri Bridge</Text>
                        </View>
                    </View>

                    {/* Close Button */}
                    <TouchableOpacity style={[styles.closeBtn, { borderColor: colors.border }]} onPress={onClose}>
                        <Ionicons name="close" size={20} color={colors.text} />
                    </TouchableOpacity>
                </Animated.View>
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)'
    },
    card: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 32,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    contentContainer: {
        alignItems: 'center',
        paddingBottom: 32,
    },
    headerGradient: {
        width: '100%',
        height: 120,
        position: 'absolute',
        top: 0,
    },
    circleDeco: {
        width: '100%',
        height: 60,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        marginTop: 80, // Overlap gradient
    },
    avatarContainer: {
        marginTop: -90, // Pull up into gradient
        marginBottom: 16,
    },
    avatarGradient: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#fff',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    avatarText: {
        fontSize: 40,
        fontWeight: '800',
    },
    statusBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    infoSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    displayName: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 4,
    },
    username: {
        fontSize: 14,
        marginBottom: 12,
        opacity: 0.7,
    },
    rolePill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    statsGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 20,
        marginBottom: 24,
        gap: 8,
    },
    statItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
        opacity: 0.6,
        textAlign: 'center',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        opacity: 0.5,
    },
    appName: {
        fontSize: 12,
        fontWeight: '600',
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        // backgroundColor: 'rgba(255,255,255,0.2)',
    }
});
