import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ActivityIndicator,
    TouchableOpacity, Dimensions, StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING, LAYOUT } from '../constants/theme';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { getCachedLeaderboard, syncLeaderboard } from '../services/SyncService';
import { getEntryCount } from '../services/Database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePreferences } from '../context/PreferencesContext';
import { useNavigation } from '@react-navigation/native';
import Animated, {
    useSharedValue,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    interpolate,
    Extrapolation,
    FadeInDown,
    Layout
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import NumberTicker from '../components/NumberTicker';

const { width } = Dimensions.get('window');
const PERSONAL_STATS_CACHE_KEY = 'personal_stats_cache';
const PERSONAL_STATS_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const HEADER_HEIGHT_EXPANDED = 280;
const HEADER_HEIGHT_COLLAPSED = 100;

// ============================================================
// Sub-Components
// ============================================================

const DialectDistribution = ({ dialectStats, colors }) => {
    const [expanded, setExpanded] = useState(true);

    if (!dialectStats || Object.keys(dialectStats).length === 0) return null;

    const sorted = Object.entries(dialectStats)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]);

    const maxCount = sorted[0]?.[1] || 1;
    const total = sorted.reduce((sum, [_, count]) => sum + count, 0);

    const formatDialectName = (name) => name.charAt(0).toUpperCase() + name.slice(1);

    return (
        <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => setExpanded(!expanded)}>
                <View style={styles.sectionTitleRow}>
                    <Ionicons name="pie-chart" size={20} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Dialect Distribution</Text>
                </View>
                <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={colors.textLight} />
            </TouchableOpacity>

            {expanded && (
                <View style={styles.dialectList}>
                    {sorted.map(([dialect, count], idx) => {
                        const percentage = Math.round((count / total) * 100);
                        const barWidth = (count / maxCount) * 100;
                        return (
                            <View key={dialect} style={styles.dialectRow}>
                                <View style={styles.dialectInfo}>
                                    <Text style={[styles.dialectRank, { color: colors.textLight }]}>
                                        {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : `#${idx + 1}`}
                                    </Text>
                                    <Text style={[styles.dialectName, { color: colors.text }]}>{formatDialectName(dialect)}</Text>
                                </View>
                                <View style={styles.dialectBarContainer}>
                                    <View style={[styles.dialectBarBg, { backgroundColor: colors.border }]}>
                                        <Animated.View
                                            style={[
                                                styles.dialectBarFill,
                                                { width: `${barWidth}%`, backgroundColor: idx === 0 ? colors.primary : colors.primary + '80' }
                                            ]}
                                        />
                                    </View>
                                    <Text style={[styles.dialectCount, { color: colors.textLight }]}>{count} ({percentage}%)</Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
};

const PersonalStatsCard = ({ stats, colors, loading }) => {
    if (!stats) return null;

    const getBadge = (points) => {
        if (points >= 500) return { name: 'Diamond', icon: '💎', color: '#B9F2FF' };
        if (points >= 200) return { name: 'Gold', icon: '🥇', color: '#FFD700' };
        if (points >= 100) return { name: 'Silver', icon: '🥈', color: '#C0C0C0' };
        if (points >= 50) return { name: 'Bronze', icon: '🥉', color: '#CD7F32' };
        return { name: 'Newbie', icon: '⭐', color: '#FFE066' };
    };

    const badge = getBadge(stats.points || 0);

    return (
        <View style={styles.statsWrapper}>
            <BlurView intensity={80} tint={colors.dark ? "dark" : "light"} style={styles.glassContainer}>
                <View style={styles.personalHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 }]}>Your Impact</Text>
                    <View style={[styles.badgeChip, { backgroundColor: badge.color + '30' }]}>
                        <Text>{badge.icon}</Text>
                        <Text style={[styles.badgeText, { color: colors.text }]}> {badge.name}</Text>
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator color={colors.primary} />
                ) : (
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <NumberTicker number={stats.wordCount || 0} style={[styles.statValue, { color: colors.primary }]} />
                            <Text style={[styles.statLabel, { color: colors.textLight }]}>Words</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.statItem}>
                            <NumberTicker number={stats.points || 0} style={[styles.statValue, { color: colors.success }]} />
                            <Text style={[styles.statLabel, { color: colors.textLight }]}>Points</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.statItem}>
                            <NumberTicker number={stats.verifiedCount || 0} style={[styles.statValue, { color: colors.secondary }]} />
                            <Text style={[styles.statLabel, { color: colors.textLight }]}>Verified</Text>
                        </View>
                    </View>
                )}
            </BlurView>
        </View>
    );
};

// ============================================================
// Main Screen
// ============================================================

export default function StatisticsScreen() {
    const { colors, isDark } = usePreferences();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    // Data State
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [personalLoading, setPersonalLoading] = useState(true);
    const [globalStats, setGlobalStats] = useState({
        totalWords: 0,
        totalContributors: 0,
        userRank: null,
        dialectStats: {},
        topContributors: []
    });
    const [personalStats, setPersonalStats] = useState(null);

    const currentUserId = auth.currentUser?.uid;
    const scrollY = useSharedValue(0);

    useEffect(() => {
        loadAllStats();
    }, []);

    const loadAllStats = async () => {
        setLoading(true);
        await Promise.all([loadGlobalStats(), loadPersonalStats()]);
        setLoading(false);
    };

    const loadGlobalStats = async () => {
        try {
            let data = await getCachedLeaderboard();
            if (!data) {
                const result = await syncLeaderboard();
                if (result.success && result.data) data = result.data;
            }

            if (data) {
                let userRank = null;
                if (currentUserId && data.users) {
                    const idx = data.users.findIndex(u => u.id === currentUserId);
                    if (idx >= 0) userRank = idx + 1;
                }
                const localWordCount = await getEntryCount();
                setGlobalStats({
                    totalWords: data.dictionary_count || localWordCount || 0,
                    totalContributors: data.users?.length || 0,
                    userRank,
                    dialectStats: data.valley_stats || {},
                    topContributors: data.users || []
                });
            }
        } catch (error) {
            console.error('Error loading global stats:', error);
        }
    };

    const loadPersonalStats = async () => {
        if (!currentUserId) {
            setPersonalLoading(false);
            return;
        }
        try {
            const cached = await AsyncStorage.getItem(PERSONAL_STATS_CACHE_KEY);
            if (cached) {
                const { data, timestamp, userId } = JSON.parse(cached);
                if (Date.now() - timestamp < PERSONAL_STATS_CACHE_TTL && userId === currentUserId) {
                    setPersonalStats(data);
                    setPersonalLoading(false);
                    return;
                }
            }
            const userDoc = await getDoc(doc(db, 'users', currentUserId));
            if (userDoc.exists()) {
                const d = userDoc.data();
                const stats = { points: d.points || 0, wordCount: d.word_count || 0, verifiedCount: d.verified_count || 0, valley: d.valley_affiliation };
                setPersonalStats(stats);
                AsyncStorage.setItem(PERSONAL_STATS_CACHE_KEY, JSON.stringify({ data: stats, timestamp: Date.now(), userId: currentUserId }));
            }
        } catch (error) {
            console.error('Error loading personal stats:', error);
        } finally {
            setPersonalLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await syncLeaderboard(true);
        await AsyncStorage.removeItem(PERSONAL_STATS_CACHE_KEY);
        await loadAllStats();
        setRefreshing(false);
    }, []);

    const scrollHandler = useAnimatedScrollHandler((event) => {
        scrollY.value = event.contentOffset.y;
    });

    const AnimatedHeader = () => {
        const heightStyle = useAnimatedStyle(() => ({
            height: interpolate(scrollY.value, [0, 150], [HEADER_HEIGHT_EXPANDED, HEADER_HEIGHT_COLLAPSED], Extrapolation.CLAMP)
        }));

        const expandedOpacity = useAnimatedStyle(() => ({
            opacity: interpolate(scrollY.value, [0, 80], [1, 0], Extrapolation.CLAMP),
            transform: [{ scale: interpolate(scrollY.value, [0, 80], [1, 0.9], Extrapolation.CLAMP) }]
        }));

        const collapsedOpacity = useAnimatedStyle(() => ({
            opacity: interpolate(scrollY.value, [100, 150], [0, 1], Extrapolation.CLAMP),
            transform: [{ translateY: interpolate(scrollY.value, [100, 150], [20, 0], Extrapolation.CLAMP) }]
        }));

        return (
            <Animated.View style={[styles.headerContainer, heightStyle]}>
                <LinearGradient
                    colors={[colors.primary, '#4f46e5', colors.background]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0.8, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />

                {/* Expanded State */}
                <Animated.View style={[styles.headerExpanded, expandedOpacity, { paddingTop: insets.top + 40 }]}>
                    <Text style={styles.heroTitle}>Community Progress</Text>
                    <View style={styles.heroNumberContainer}>
                        <NumberTicker number={globalStats.totalWords} style={styles.heroNumber} />
                        <Text style={styles.heroSubtitle}>Total Words Preserved</Text>
                    </View>
                    <View style={styles.heroGrid}>
                        <View style={styles.heroItem}>
                            <Ionicons name="people" size={20} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.heroItemText}>{globalStats.totalContributors} Contributors</Text>
                        </View>
                        {globalStats.userRank && (
                            <View style={styles.heroItem}>
                                <Ionicons name="trophy" size={20} color="#FFD700" />
                                <Text style={styles.heroItemText}>Rank #{globalStats.userRank}</Text>
                            </View>
                        )}
                    </View>
                </Animated.View>

                {/* Collapsed State */}
                <Animated.View style={[styles.headerCollapsed, collapsedOpacity, { paddingTop: insets.top }]}>
                    <Text style={styles.headerCollapsedTitle}>Statistics</Text>
                    <Text style={styles.headerCollapsedSubtitle}>{globalStats.totalWords} Words Saved</Text>
                </Animated.View>

                {/* Settings Actions (if needed) */}
                <TouchableOpacity
                    style={[styles.settingsButton, { top: insets.top + 10 }]}
                    onPress={() => navigation.navigate('Settings')}
                >
                    <BlurView intensity={30} tint="dark" style={styles.iconBlur}>
                        <Ionicons name="settings-outline" size={20} color="#fff" />
                    </BlurView>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderContributor = ({ item, index }) => (
        <Animated.View
            entering={FadeInDown.delay(index * 50).springify()}
            layout={Layout.springify()}
            style={[styles.contributorCard, { backgroundColor: colors.surface, borderColor: item.id === currentUserId ? colors.primary : 'transparent' }]}
        >
            <View style={styles.contributorRank}>
                <Text style={styles.rankEmoji}>{index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.contributorName, { color: colors.text }]}>
                    {item.displayName || 'Anonymous'}
                    {item.id === currentUserId && <Text style={{ color: colors.primary }}> (You)</Text>}
                </Text>
                <Text style={[styles.contributorValley, { color: colors.textLight }]}>
                    {item.valley_affiliation ? `📍 ${item.valley_affiliation}` : 'No location'}
                </Text>
            </View>
            <View style={styles.contributorPoints}>
                <Text style={[styles.pointsValue, { color: colors.success }]}>{item.points}</Text>
                <Text style={{ fontSize: 10, color: colors.textLight }}>pts</Text>
            </View>
        </Animated.View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="light-content" />

            <AnimatedHeader />

            <Animated.FlatList
                data={globalStats.topContributors}
                keyExtractor={(item) => item.id}
                renderItem={renderContributor}
                contentContainerStyle={{
                    paddingTop: HEADER_HEIGHT_EXPANDED,
                    paddingHorizontal: SPACING.m,
                    paddingBottom: 100
                }}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                ListHeaderComponent={
                    <View style={{ marginBottom: 20 }}>
                        <PersonalStatsCard stats={personalStats} colors={colors} loading={personalLoading} />
                        <DialectDistribution dialectStats={globalStats.dialectStats} colors={colors} />
                        <Text style={[styles.sectionHeader, { color: colors.text, marginTop: 24, marginBottom: 12 }]}>Top Contributors</Text>
                    </View>
                }
                refreshing={refreshing}
                onRefresh={onRefresh}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerContainer: {
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, overflow: 'hidden'
    },
    headerExpanded: { alignItems: 'center', justifyContent: 'center', width: '100%' },
    headerCollapsed: {
        position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20
    },
    heroTitle: {
        fontSize: 16, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1
    },
    heroNumberContainer: {
        marginVertical: 10, alignItems: 'center'
    },
    heroNumber: {
        fontSize: 56, fontWeight: '900', color: '#fff'
    },
    heroSubtitle: {
        fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: -5
    },
    heroGrid: {
        flexDirection: 'row', gap: 20, marginTop: 20
    },
    heroItem: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6
    },
    heroItemText: { color: '#fff', fontSize: 13, fontWeight: '600' },

    headerCollapsedTitle: { fontSize: 18, color: '#fff', fontWeight: '700' },
    headerCollapsedSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

    settingsButton: { position: 'absolute', right: 20, zIndex: 20 },
    iconBlur: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },

    statsWrapper: { marginTop: SPACING.m, marginBottom: 16 },
    glassContainer: { borderRadius: 24, padding: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    personalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    badgeChip: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeText: { fontSize: 12, fontWeight: '700' },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    statItem: { alignItems: 'center', flex: 1 },
    statDivider: { width: 1, height: 30, opacity: 0.2 },
    statValue: { fontSize: 22, fontWeight: '800' },
    statLabel: { fontSize: 11, fontWeight: '600', marginTop: 4, textTransform: 'uppercase', opacity: 0.7 },

    sectionCard: { borderRadius: 16, marginBottom: 16, padding: 4, overflow: 'hidden' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: { fontSize: 16, fontWeight: '700' },
    dialectList: { paddingHorizontal: 16, paddingBottom: 16 },
    dialectRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    dialectInfo: { flexDirection: 'row', alignItems: 'center', width: 100 },
    dialectRank: { width: 28, fontSize: 14 },
    dialectName: { fontSize: 13, fontWeight: '600' },
    dialectBarContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    dialectBarBg: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', marginRight: 8 },
    dialectBarFill: { height: '100%', borderRadius: 3 },
    dialectCount: { fontSize: 12, minWidth: 50, textAlign: 'right' },

    contributorCard: {
        flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12,
        borderRadius: 16, borderWidth: 1,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
    },
    contributorRank: { width: 40, alignItems: 'center', marginRight: 8 },
    rankEmoji: { fontSize: 20 },
    contributorName: { fontSize: 15, fontWeight: '700' },
    contributorValley: { fontSize: 13, marginTop: 2 },
    contributorPoints: { alignItems: 'flex-end' },
    pointsValue: { fontSize: 16, fontWeight: '800' }
});
