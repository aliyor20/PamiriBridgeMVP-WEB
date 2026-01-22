import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, ActivityIndicator,
    TouchableOpacity, RefreshControl, Animated, Dimensions, Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING, LAYOUT } from '../constants/theme';
import { auth } from '../firebaseConfig';
import { getCachedLeaderboard, syncLeaderboard } from '../services/SyncService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePreferences } from '../context/PreferencesContext';

const { width } = Dimensions.get('window');
const VALLEYS = ['shughnan', 'rushan', 'wakhan', 'bartang', 'yazghulami', 'ishkashim', 'sarikol'];
// Leaderboard data comes from GitHub Pages via SyncService

// Animated number counter component
const AnimatedNumber = ({ value, duration = 1000, style }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime;
        const startValue = displayValue;
        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
            setDisplayValue(Math.floor(startValue + (value - startValue) * eased));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [value]);

    return <Text style={style}>{displayValue}</Text>;
};

// Top 3 Podium Component
const TopThreePodium = ({ leaders, colors }) => {
    const scaleAnims = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Staggered entrance animation
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.stagger(150, scaleAnims.map(anim =>
                Animated.spring(anim, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true })
            ))
        ]).start();
    }, [leaders]);

    const [first, second, third] = leaders;
    const podiumOrder = [second, first, third]; // Visual order: 2nd, 1st, 3rd
    const heights = [80, 110, 60];
    const positions = [1, 0, 2]; // Mapping for animations

    return (
        <Animated.View style={[styles.podiumContainer, { opacity: fadeAnim }]}>
            {podiumOrder.map((leader, idx) => {
                if (!leader) return <View key={idx} style={styles.podiumSlot} />;
                const animIndex = positions[idx];
                const isFirst = idx === 1;

                return (
                    <Animated.View
                        key={leader.id}
                        style={[
                            styles.podiumSlot,
                            { transform: [{ scale: scaleAnims[animIndex] }] }
                        ]}
                    >
                        {/* Avatar with gradient background */}
                        <View style={[
                            styles.avatarContainer,
                            isFirst && styles.firstPlaceAvatar,
                            { borderColor: isFirst ? colors.primary : colors.border }
                        ]}>
                            <LinearGradient
                                colors={isFirst ? [colors.primary, colors.secondary] : [colors.surface, colors.inputBg]}
                                style={styles.avatarGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text style={styles.avatarText}>
                                    {(leader.displayName || 'A')[0].toUpperCase()}
                                </Text>
                            </LinearGradient>
                            {isFirst && (
                                <View style={styles.crownContainer}>
                                    <Text style={styles.crown}>👑</Text>
                                </View>
                            )}
                        </View>

                        <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>
                            {leader.displayName || 'Anonymous'}
                        </Text>

                        <View style={[
                            styles.podiumBar,
                            { height: heights[idx], backgroundColor: colors.primary + (isFirst ? 'FF' : '80') }
                        ]}>
                            <Text style={styles.podiumRank}>
                                {idx === 0 ? '2' : idx === 1 ? '1' : '3'}
                            </Text>
                        </View>

                        <View style={[styles.pointsBadge, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.podiumPoints, { color: colors.success }]}>
                                {leader.points || 0}
                            </Text>
                            <Text style={[styles.ptsLabel, { color: colors.textLight }]}>pts</Text>
                        </View>
                    </Animated.View>
                );
            })}
        </Animated.View>
    );
};

// Valley Stats Card (expandable)
const ValleyStatsCard = ({ stats, selectedValley, onSelect, colors }) => {
    const [expanded, setExpanded] = useState(false);
    const heightAnim = useRef(new Animated.Value(0)).current;

    const toggleExpand = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExpanded(!expanded);
        Animated.spring(heightAnim, {
            toValue: expanded ? 0 : 1,
            friction: 8,
            useNativeDriver: false
        }).start();
    };

    // Sort valleys by points
    const sortedValleys = VALLEYS
        .map(v => ({ name: v, ...(stats[v] || { count: 0, points: 0 }) }))
        .sort((a, b) => b.points - a.points);

    const maxPoints = Math.max(...sortedValleys.map(v => v.points), 1);

    return (
        <View style={[styles.valleyCard, { backgroundColor: colors.surface }]}>
            <TouchableOpacity onPress={toggleExpand} style={styles.valleyCardHeader}>
                <View style={styles.valleyCardTitleRow}>
                    <Ionicons name="map" size={20} color={colors.primary} />
                    <Text style={[styles.valleyCardTitle, { color: colors.text }]}>Valley Rankings</Text>
                </View>
                <Animated.View style={{
                    transform: [{
                        rotate: heightAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '180deg']
                        })
                    }]
                }}>
                    <Ionicons name="chevron-down" size={20} color={colors.textLight} />
                </Animated.View>
            </TouchableOpacity>

            <Animated.View style={{
                maxHeight: heightAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 300]
                }),
                overflow: 'hidden',
                opacity: heightAnim
            }}>
                {sortedValleys.map((valley, idx) => {
                    const isSelected = selectedValley === valley.name;
                    const barWidth = (valley.points / maxPoints) * 100;

                    return (
                        <TouchableOpacity
                            key={valley.name}
                            style={[
                                styles.valleyRow,
                                isSelected && { backgroundColor: colors.primary + '20' }
                            ]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onSelect(isSelected ? null : valley.name);
                            }}
                        >
                            <Text style={styles.valleyRankNum}>{idx === 0 ? '🏆' : `#${idx + 1}`}</Text>
                            <View style={styles.valleyBarContainer}>
                                <Text style={[styles.valleyName, { color: colors.text }]}>
                                    {valley.name.charAt(0).toUpperCase() + valley.name.slice(1)}
                                </Text>
                                <View style={[styles.valleyBarBg, { backgroundColor: colors.border }]}>
                                    <View style={[
                                        styles.valleyBarFill,
                                        { width: `${barWidth}%`, backgroundColor: colors.primary }
                                    ]} />
                                </View>
                            </View>
                            <Text style={[styles.valleyPoints, { color: colors.success }]}>
                                {valley.points}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </Animated.View>
        </View>
    );
};

// Animated leaderboard row
const LeaderRow = ({ item, index, colors, isCurrentUser }) => {
    const slideAnim = useRef(new Animated.Value(-50)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                delay: index * 50,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                delay: index * 50,
                useNativeDriver: true
            })
        ]).start();
    }, []);

    return (
        <Animated.View style={[
            styles.leaderRow,
            {
                backgroundColor: isCurrentUser ? colors.primary + '20' : colors.surface,
                borderLeftWidth: isCurrentUser ? 3 : 0,
                borderLeftColor: colors.primary,
                transform: [{ translateX: slideAnim }],
                opacity: fadeAnim
            }
        ]}>
            <View style={styles.rankBadge}>
                <Text style={[styles.rankText, { color: colors.textLight }]}>#{index + 4}</Text>
            </View>
            <View style={styles.leaderInfo}>
                <Text style={[styles.leaderName, { color: colors.text }]} numberOfLines={1}>
                    {item.displayName || 'Anonymous'}
                    {isCurrentUser && <Text style={{ color: colors.primary }}> (You)</Text>}
                </Text>
                <Text style={[styles.leaderValley, { color: colors.textLight }]}>
                    📍 {item.valley_affiliation || 'Unknown'}
                </Text>
            </View>
            <View style={styles.leaderScore}>
                <Text style={[styles.leaderPoints, { color: colors.success }]}>{item.points || 0}</Text>
                <Text style={[styles.ptsSmall, { color: colors.textLight }]}>pts</Text>
            </View>
        </Animated.View>
    );
};

export default function LeaderboardScreen() {
    const { colors } = usePreferences();
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [valleyStats, setValleyStats] = useState({});
    const [selectedValley, setSelectedValley] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const currentUserId = auth.currentUser?.uid;

    // Header animations
    const titleAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Animate header
        Animated.spring(titleAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();

        // Pulse animation for trophy
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
            ])
        ).start();

        loadFromCacheOrFetch();
    }, []);

    const loadFromCacheOrFetch = async () => {
        try {
            // First, try to load from cache (instant)
            const cached = await getCachedLeaderboard();
            if (cached && cached.users) {
                processLeaderData(cached.users, cached.valley_stats, cached.updated_at);
                setLoading(false);
            }

            // Then sync from GitHub Pages in background
            await fetchLeaders();
        } catch (error) {
            console.error("Load error:", error);
            setLoading(false);
        }
    };

    const fetchLeaders = async () => {
        try {
            // Sync from GitHub Pages (zero Firestore reads!)
            const result = await syncLeaderboard();

            if (result.success && result.data) {
                processLeaderData(result.data.users, result.data.valley_stats, result.data.updated_at);
            } else if (!result.success) {
                // Try to use cached data as fallback
                const cached = await getCachedLeaderboard();
                if (cached && cached.users) {
                    processLeaderData(cached.users, cached.valley_stats, cached.updated_at);
                }
            }
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const processLeaderData = (users, precomputedStats = null, updatedAt = null) => {
        // Use pre-computed valley stats from GitHub Pages if available
        if (precomputedStats) {
            setValleyStats(precomputedStats);
        } else {
            // Fallback: compute stats locally
            const stats = {};
            users.forEach(user => {
                const valley = user.valley_affiliation || 'unknown';
                if (!stats[valley]) stats[valley] = { count: 0, points: 0 };
                stats[valley].count++;
                stats[valley].points += user.points || 0;
            });
            setValleyStats(stats);
        }
        setLeaders(users);
        if (updatedAt) {
            setLastUpdated(new Date(updatedAt));
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // Force refresh from GitHub Pages
        const result = await syncLeaderboard(true);
        if (result.success && result.data) {
            processLeaderData(result.data.users, result.data.valley_stats, result.data.updated_at);
        }
        setRefreshing(false);
    }, []);

    // Filter by selected valley
    const displayedLeaders = selectedValley
        ? leaders.filter(u => u.valley_affiliation === selectedValley)
        : leaders;

    const topThree = displayedLeaders.slice(0, 3);
    const restOfLeaders = displayedLeaders.slice(3, 10);

    // Find current user's rank
    const currentUserRank = leaders.findIndex(u => u.id === currentUserId) + 1;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <FlatList
                data={restOfLeaders}
                keyExtractor={item => item.id}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
                ListHeaderComponent={() => (
                    <View>
                        {/* Animated Header */}
                        <Animated.View style={[
                            styles.header,
                            { transform: [{ scale: titleAnim }], opacity: titleAnim }
                        ]}>
                            <View style={styles.headerRow}>
                                <Animated.Text style={[
                                    styles.trophy,
                                    { transform: [{ scale: pulseAnim }] }
                                ]}>🏆</Animated.Text>
                                <View>
                                    <Text style={[styles.title, { color: colors.text }]}>Leaderboard</Text>
                                    <Text style={[styles.subtitle, { color: colors.textLight }]}>
                                        Top contributors preserving Pamiri heritage
                                    </Text>
                                </View>
                            </View>

                            {/* Your Rank Badge */}
                            {currentUserRank > 0 && (
                                <View style={[styles.yourRankBadge, { backgroundColor: colors.primary + '20' }]}>
                                    <Text style={[styles.yourRankText, { color: colors.primary }]}>
                                        Your Rank: #{currentUserRank}
                                    </Text>
                                </View>
                            )}
                        </Animated.View>

                        {loading ? (
                            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 40 }} />
                        ) : (
                            <>
                                {/* Top 3 Podium */}
                                {topThree.length > 0 && (
                                    <TopThreePodium leaders={topThree} colors={colors} />
                                )}

                                {/* Valley Stats */}
                                <ValleyStatsCard
                                    stats={valleyStats}
                                    selectedValley={selectedValley}
                                    onSelect={setSelectedValley}
                                    colors={colors}
                                />

                                {/* Divider */}
                                <View style={styles.sectionHeader}>
                                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                        {selectedValley
                                            ? `${selectedValley.charAt(0).toUpperCase() + selectedValley.slice(1)} Contributors`
                                            : 'Top 10 Contributors'}
                                    </Text>
                                    {selectedValley && (
                                        <TouchableOpacity onPress={() => setSelectedValley(null)}>
                                            <Text style={[styles.clearFilter, { color: colors.primary }]}>Clear ✕</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </>
                        )}
                    </View>
                )}
                renderItem={({ item, index }) => (
                    <LeaderRow
                        item={item}
                        index={index}
                        colors={colors}
                        isCurrentUser={item.id === currentUserId}
                    />
                )}
                ListEmptyComponent={
                    !loading && (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="trophy-outline" size={48} color={colors.border} />
                            <Text style={[styles.emptyText, { color: colors.textLight }]}>
                                {selectedValley
                                    ? `No contributors from ${selectedValley} yet!\nBe the first to represent your valley.`
                                    : 'No leaders yet. Be the first!'}
                            </Text>
                        </View>
                    )
                }
                contentContainerStyle={styles.list}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    list: { paddingBottom: SPACING.xxl },

    // Header
    header: { padding: SPACING.l, paddingBottom: SPACING.m },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.s },
    trophy: { fontSize: 40, marginRight: SPACING.m },
    title: { fontSize: 28, fontWeight: '800' },
    subtitle: { fontSize: 14, marginTop: 2 },
    yourRankBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20
    },
    yourRankText: { fontWeight: '700', fontSize: 14 },

    // Podium
    podiumContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingHorizontal: SPACING.m,
        marginBottom: SPACING.l,
        height: 200,
    },
    podiumSlot: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    avatarContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        overflow: 'hidden',
        marginBottom: SPACING.xs,
    },
    firstPlaceAvatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 3,
    },
    avatarGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    avatarText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    crownContainer: { position: 'absolute', top: -16, alignSelf: 'center' },
    crown: { fontSize: 24 },
    podiumName: { fontSize: 12, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
    podiumBar: {
        width: '100%',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    podiumRank: { fontSize: 24, fontWeight: '800', color: '#fff' },
    pointsBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: -8,
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    podiumPoints: { fontSize: 14, fontWeight: 'bold' },
    ptsLabel: { fontSize: 10, marginLeft: 2 },

    // Valley Card
    valleyCard: {
        marginHorizontal: SPACING.m,
        borderRadius: LAYOUT.borderRadius.m,
        marginBottom: SPACING.m,
        overflow: 'hidden',
    },
    valleyCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.m,
    },
    valleyCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    valleyCardTitle: { fontSize: 16, fontWeight: '700' },
    valleyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
    },
    valleyRankNum: { width: 30, fontSize: 14 },
    valleyBarContainer: { flex: 1, marginRight: SPACING.m },
    valleyName: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
    valleyBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
    valleyBarFill: { height: '100%', borderRadius: 3 },
    valleyPoints: { fontSize: 14, fontWeight: '700', minWidth: 40, textAlign: 'right' },

    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.m,
        marginTop: SPACING.s,
        marginBottom: SPACING.m,
    },
    sectionTitle: { fontSize: 18, fontWeight: '700' },
    clearFilter: { fontSize: 14, fontWeight: '600' },

    // Leader Rows
    leaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: SPACING.m,
        marginBottom: SPACING.s,
        padding: SPACING.m,
        borderRadius: LAYOUT.borderRadius.m,
    },
    rankBadge: { width: 40 },
    rankText: { fontSize: 14, fontWeight: '600' },
    leaderInfo: { flex: 1 },
    leaderName: { fontSize: 15, fontWeight: '600' },
    leaderValley: { fontSize: 12, marginTop: 2 },
    leaderScore: { alignItems: 'center' },
    leaderPoints: { fontSize: 18, fontWeight: '800' },
    ptsSmall: { fontSize: 10 },

    // Empty
    emptyContainer: { alignItems: 'center', padding: SPACING.xl },
    emptyText: { textAlign: 'center', marginTop: SPACING.m, lineHeight: 22 },
});
