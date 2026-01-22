import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Platform,
    TextInput,
    Dimensions,
    StatusBar,
    ScrollView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    interpolate,
    Extrapolation,
    FadeInDown,
    Layout,
    withSpring,
    withTiming,
    FadeInRight,
    useDerivedValue
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { SPACING, LAYOUT } from '../constants/theme';
import { getBadgeById } from '../services/badgeService';
import { forceSyncDictionary } from '../services/SyncService';
import { clearLocalDatabase } from '../services/Database';
import { usePreferences } from '../context/PreferencesContext';
import { useNavigation } from '@react-navigation/native';
import NumberTicker from '../components/NumberTicker';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT_EXPANDED = 320; // Increased for better spacing
const HEADER_HEIGHT_COLLAPSED = 110;

export default function ProfileScreen() {
    const navigation = useNavigation();
    const { colors, isDark } = usePreferences();
    const insets = useSafeAreaInsets();
    const user = auth.currentUser;

    // State
    const [userData, setUserData] = useState(null);
    const [myEntries, setMyEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sound, setSound] = useState(null);

    // Edit State
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState('');
    const [savingName, setSavingName] = useState(false);
    const [syncing, setSyncing] = useState(false);

    // Animation Values
    const scrollY = useSharedValue(0);

    const scrollHandler = useAnimatedScrollHandler((event) => {
        scrollY.value = event.contentOffset.y;
    });

    useEffect(() => {
        if (!user) return;

        const userRef = doc(db, 'users', user.uid);
        const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData(data);
                setEditName(data.displayName || '');
            }
        });

        fetchMyContributions();

        return () => {
            unsubscribeUser();
            if (sound) sound.unloadAsync();
        };
    }, [user]);

    const fetchMyContributions = async () => {
        try {
            const q = query(
                collection(db, 'entries'),
                where('contributorId', '==', user.uid)
            );
            const querySnapshot = await getDocs(q);
            const entries = [];
            querySnapshot.forEach((doc) => {
                entries.push({ id: doc.id, ...doc.data() });
            });
            entries.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

            // TEMPORARY: Dummy data for scroll testing
            for (let i = 1; i <= 20; i++) {
                entries.push({
                    id: `dummy-${i}`,
                    word: `Test Word ${i}`,
                    dialect: ['Shughni', 'Wakhi', 'Bartangi'][i % 3],
                    status: i % 2 === 0 ? 'verified' : 'pending',
                    timestamp: { seconds: Date.now() / 1000 }
                });
            }

            setMyEntries(entries);
        } catch (error) {
            console.error("Error fetching contributions:", error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await fetchMyContributions();
        setRefreshing(false);
    }, [user]);

    const playSound = async (audioURL) => {
        if (!audioURL) return;
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (sound) await sound.unloadAsync();
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: audioURL },
                { shouldPlay: true }
            );
            setSound(newSound);
            newSound.playAsync();
        } catch (error) {
            console.log(error);
        }
    };

    const handleSaveName = async () => {
        if (!editName.trim()) return;
        setSavingName(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                displayName: editName.trim()
            });
            setIsEditingName(false);
        } catch (error) {
            console.error('Error saving name:', error);
        } finally {
            setSavingName(false);
        }
    };

    // --- Sub-Components ---

    const ProfileHeader = () => {
        // Height interpolation
        const headerStyle = useAnimatedStyle(() => {
            const height = interpolate(
                scrollY.value,
                [0, 150],
                [HEADER_HEIGHT_EXPANDED, HEADER_HEIGHT_COLLAPSED],
                Extrapolation.CLAMP
            );
            return { height };
        });

        // Expanded Content Animations - Fade Out
        const expandedContentStyle = useAnimatedStyle(() => {
            const opacity = interpolate(
                scrollY.value,
                [0, 80], // Start fading earlier
                [1, 0],
                Extrapolation.CLAMP
            );
            const scale = interpolate(
                scrollY.value,
                [0, 80],
                [1, 0.9],
                Extrapolation.CLAMP
            );
            return {
                opacity,
                transform: [{ scale }]
            };
        });

        // Collapsed Content Animations - Fade In (The "Pop In")
        const collapsedContentStyle = useAnimatedStyle(() => {
            const opacity = interpolate(
                scrollY.value,
                [100, 150],
                [0, 1],
                Extrapolation.CLAMP
            );
            const translateY = interpolate(
                scrollY.value,
                [100, 150],
                [20, 0],
                Extrapolation.CLAMP
            );
            return {
                opacity,
                transform: [{ translateY }]
            };
        });

        return (
            <Animated.View style={[styles.headerContainer, headerStyle]}>
                <LinearGradient
                    colors={[colors.primary, '#4f46e5', colors.background]} // Enhanced gradient
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0.8, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />

                {/* EXPANDED STATE (Centered Big Profile) */}
                <Animated.View style={[styles.headerContentExpanded, expandedContentStyle, { paddingTop: insets.top + 40 }]}>
                    <View style={styles.avatarContainer}>
                        <LinearGradient
                            colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']}
                            style={styles.avatarGradient}
                        >
                            <Text style={styles.avatarText}>
                                {(userData?.displayName || user?.email)?.charAt(0).toUpperCase()}
                            </Text>
                        </LinearGradient>
                    </View>

                    <View style={styles.nameContainer}>
                        {isEditingName ? (
                            <View style={styles.editRow}>
                                <TextInput
                                    style={[styles.nameInput, { color: '#fff', borderBottomColor: '#fff' }]}
                                    value={editName}
                                    onChangeText={setEditName}
                                    autoFocus
                                    placeholder="Name"
                                    placeholderTextColor="rgba(255,255,255,0.6)"
                                />
                                <TouchableOpacity onPress={handleSaveName}>
                                    <Ionicons name="checkmark-circle" size={28} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.editRow}>
                                <Text style={styles.displayName}>
                                    {userData?.displayName || 'Add Name'}
                                </Text>
                                <TouchableOpacity onPress={() => setIsEditingName(true)} style={styles.editIcon}>
                                    <Ionicons name="pencil" size={12} color="rgba(255,255,255,0.8)" />
                                </TouchableOpacity>
                            </View>
                        )}
                        <Text style={styles.emailText}>{user?.email}</Text>

                        {userData?.valley_affiliation && (
                            <View style={styles.valleyBadge}>
                                <Ionicons name="location" size={10} color="#fff" />
                                <Text style={styles.valleyText}>{userData.valley_affiliation}</Text>
                            </View>
                        )}
                    </View>
                </Animated.View>

                {/* COLLAPSED STATE (Sticky Header with Mini Stats) */}
                <Animated.View style={[styles.headerContentCollapsed, collapsedContentStyle, { paddingTop: insets.top }]}>
                    <View style={styles.collapsedLeft}>
                        {/* Mini Avatar */}
                        <View style={styles.miniAvatar}>
                            <Text style={styles.miniAvatarText}>
                                {(userData?.displayName || user?.email)?.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.collapsedName} numberOfLines={1}>
                                {userData?.displayName || 'Profile'}
                            </Text>
                            {/* Mini Stats Scroller in Header */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxWidth: 150 }}>
                                <Text style={styles.collapsedStats}>
                                    {userData?.points || 0} pts • {myEntries.length} words
                                </Text>
                            </ScrollView>
                        </View>
                    </View>
                </Animated.View>

                {/* Settings Button - Always Visible */}
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

    const StatsSection = () => (
        <View style={styles.statsWrapper}>
            {/* Cleaner, no grey box, just nice spaced numbers */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <NumberTicker number={userData?.points || 0} style={[styles.statValue, { color: colors.primary }]} />
                    <Text style={[styles.statLabel, { color: colors.textLight }]}>Points</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                    <NumberTicker number={myEntries.length} style={[styles.statValue, { color: colors.primary }]} />
                    <Text style={[styles.statLabel, { color: colors.textLight }]}>Words</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                    <NumberTicker number={userData?.dialect_count || 0} style={[styles.statValue, { color: colors.primary }]} />
                    <Text style={[styles.statLabel, { color: colors.textLight }]}>Dialects</Text>
                </View>
            </View>
        </View>
    );

    const renderEntry = ({ item, index }) => (
        <Animated.View
            entering={FadeInDown.delay(index * 50).springify()}
            layout={Layout.springify()}
            style={[styles.cardContainer, { backgroundColor: colors.surface }]}
        >
            <View style={styles.cardContent}>
                <View style={styles.wordRow}>
                    <Text style={[styles.wordText, { color: colors.text }]}>{item.word}</Text>
                    {item.status === 'verified' && (
                        <Ionicons name="checkmark-circle" size={16} color={colors.success} style={{ marginLeft: 6 }} />
                    )}
                </View>
                <Text style={[styles.dialectText, { color: colors.textLight }]}>{item.dialect}</Text>

                <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.status === 'verified' ? `${colors.success}15` : colors.inputBg }
                ]}>
                    <Text style={[
                        styles.statusText,
                        { color: item.status === 'verified' ? colors.success : '#D97706' }
                    ]}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>
            </View>

            <TouchableOpacity
                onPress={() => playSound(item.audioURL)}
                style={[styles.playButton, { backgroundColor: `${colors.primary}15` }]}
            >
                <Ionicons name="play" size={24} color={colors.primary} />
            </TouchableOpacity>
        </Animated.View>
    );

    const ListHeader = () => {
        const earnedBadges = (userData?.badges || []).map(id => getBadgeById(id)).filter(Boolean);

        return (
            <View style={styles.listHeaderContext}>
                <StatsSection />

                {earnedBadges.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Badges Earned</Text>
                        <View style={styles.badgesGrid}>
                            {earnedBadges.map((badge) => (
                                <View key={badge.id} style={[styles.badgeCard, { backgroundColor: colors.surface, borderColor: badge.color }]}>
                                    <Ionicons name={badge.icon} size={24} color={badge.color} />
                                    <Text style={[styles.badgeName, { color: colors.text }]}>{badge.name}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: SPACING.l }]}>
                    My Contributions ({myEntries.length})
                </Text>
            </View>
        );
    };

    const ListFooter = () => {
        if (!userData?.isAdmin) return <View style={{ height: 100 }} />;

        return (
            <View style={[styles.adminSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.adminTitle, { color: colors.text }]}>🔧 Admin Controls</Text>
                <View style={styles.adminButtons}>
                    <TouchableOpacity
                        style={[styles.adminBtn, { backgroundColor: colors.inputBg }]}
                        onPress={async () => {
                            setSyncing(true);
                            await forceSyncDictionary();
                            setSyncing(false);
                            alert(`Synced successfully`);
                        }}
                        disabled={syncing}
                    >
                        <Ionicons name="cloud-download" size={20} color={colors.primary} />
                        <Text style={[styles.adminBtnText, { color: colors.primary }]}>
                            {syncing ? 'Syncing...' : 'Force Sync'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.adminBtn, styles.adminBtnDanger]}
                        onPress={async () => {
                            await clearLocalDatabase();
                            alert('Local database cleared. Restart app.');
                        }}
                    >
                        <Ionicons name="trash" size={20} color="#EF4444" />
                        <Text style={[styles.adminBtnText, { color: '#EF4444' }]}>Clear DB</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="light-content" />

            {/* Background Header Parallax Spacer */}
            <ProfileHeader />

            <Animated.FlatList
                data={myEntries}
                renderItem={renderEntry}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{
                    paddingTop: HEADER_HEIGHT_EXPANDED, // No overlap - safe layout
                    paddingHorizontal: SPACING.m,
                    paddingBottom: 100
                }}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                ListHeaderComponent={ListHeader}
                ListFooterComponent={ListFooter}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="documents-outline" size={48} color={colors.textLight} style={{ opacity: 0.5 }} />
                        <Text style={[styles.emptyText, { color: colors.textLight }]}>
                            You haven't contributed yet.
                        </Text>
                    </View>
                }
                refreshing={refreshing}
                onRefresh={onRefresh}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        overflow: 'hidden',
    },
    headerContentExpanded: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    headerContentCollapsed: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        justifyContent: 'flex-start'
    },
    collapsedLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    miniAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    miniAvatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    collapsedName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    collapsedStats: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        marginTop: 2,
    },
    avatarContainer: {
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    avatarGradient: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    nameContainer: {
        alignItems: 'center',
    },
    displayName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    editRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    editIcon: {
        padding: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
    },
    nameInput: {
        fontSize: 24,
        fontWeight: 'bold',
        borderBottomWidth: 1,
        paddingVertical: 2,
        minWidth: 150,
        textAlign: 'center',
    },
    emailText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 8,
    },
    valleyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    valleyText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '600',
        marginLeft: 4,
    },
    settingsButton: {
        position: 'absolute',
        right: 20,
        zIndex: 20,
        padding: 4,
    },
    iconBlur: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.2)'
    },
    statsWrapper: {
        marginTop: SPACING.m,
        marginBottom: 24,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        opacity: 0.7,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#ccc',
        opacity: 0.3,
    },
    sectionContainer: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    badgesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    badgeCard: {
        padding: 12,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        minWidth: 90,
        flex: 1,
    },
    badgeName: {
        fontSize: 11,
        marginTop: 8,
        textAlign: 'center',
        fontWeight: '600',
    },
    cardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 12,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardContent: {
        flex: 1,
    },
    wordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    wordText: {
        fontSize: 17,
        fontWeight: '700',
    },
    dialectText: {
        fontSize: 13,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginTop: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    playButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        opacity: 0.7,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '500',
    },
    adminSection: {
        marginTop: 32,
        marginBottom: 60,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    adminTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 16,
        opacity: 0.8,
    },
    adminButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    adminBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        gap: 8,
    },
    adminBtnDanger: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    adminBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
});
