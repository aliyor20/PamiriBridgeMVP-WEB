import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    ScrollView,
    RefreshControl
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
    FadeIn,
    useDerivedValue
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { SPACING, LAYOUT } from '../constants/theme';
import { getBadgeById } from '../services/badgeService';
import * as AudioService from '../services/AudioService';
import { forceSyncDictionary } from '../services/SyncService';
import { clearLocalDatabase } from '../services/Database';
import { usePreferences } from '../context/PreferencesContext';
import { useNavigation } from '@react-navigation/native';
import NumberTicker from '../components/NumberTicker';
import ShareableStatsModal from '../components/ShareableStatsModal';

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
    const [expandedId, setExpandedId] = useState(null);
    const [showStatsModal, setShowStatsModal] = useState(false);

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

    const playSound = async (audioURL, entryId) => {
        if (!audioURL) return;
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (sound) await sound.unloadAsync();

            // Use standardized AudioService (handles caching)
            const newSound = await AudioService.playAudio(audioURL, entryId);
            if (newSound) {
                setSound(newSound);
                // playAudio in service already starts playback if configured? 
                // Wait, AudioService.playAudio returns sound object. 
                // Let's check AudioService implementation. 
                // It does { shouldPlay: true }. So it plays automatically.
            }
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
                [0, 80],
                [1, 0],
                Extrapolation.CLAMP
            );
            const scale = interpolate(
                scrollY.value,
                [0, 80],
                [1, 0.9],
                Extrapolation.CLAMP
            );
            // Ensure expanded content is clickable when visible
            const zIndex = scrollY.value < 80 ? 10 : 0;

            return {
                opacity,
                transform: [{ scale }],
                zIndex
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
            // Ensure collapsed content is clickable when visible
            const zIndex = scrollY.value > 100 ? 10 : 0;

            return {
                opacity,
                transform: [{ translateY }],
                zIndex
            };
        });

        return (
            <Animated.View style={[styles.headerContainer, headerStyle]} pointerEvents="box-none">
                <LinearGradient
                    colors={[colors.primary, '#4f46e5', colors.background]} // Enhanced gradient
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0.8, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />

                {/* EXPANDED STATE (Centered Big Profile) */}
                <Animated.View
                    style={[styles.headerContentExpanded, expandedContentStyle, { paddingTop: insets.top + 40 }]}
                    pointerEvents="box-none"
                >
                    <TouchableOpacity onPress={() => setShowStatsModal(true)} activeOpacity={0.8} style={styles.avatarContainer}>
                        <LinearGradient
                            colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']}
                            style={styles.avatarGradient}
                        >
                            <Text style={styles.avatarText}>
                                {(userData?.displayName || user?.email)?.charAt(0).toUpperCase()}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

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
                                <TouchableOpacity
                                    onPress={() => setIsEditingName(true)}
                                    style={styles.editIcon}
                                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                                >
                                    <Ionicons name="pencil" size={14} color="rgba(255,255,255,0.8)" />
                                </TouchableOpacity>
                            </View>
                        )}
                        <Text style={styles.emailText}>{user?.email}</Text>

                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                            {/* Status Badge */}
                            <View style={[styles.valleyBadge, {
                                backgroundColor: userData?.isAdmin ? 'rgba(239, 68, 68, 0.2)' :
                                    userData?.status === 'Guide' ? 'rgba(234, 179, 8, 0.2)' :
                                        'rgba(74, 222, 128, 0.2)',
                                borderColor: userData?.isAdmin ? 'rgba(239, 68, 68, 0.4)' :
                                    userData?.status === 'Guide' ? 'rgba(234, 179, 8, 0.4)' :
                                        'rgba(74, 222, 128, 0.4)'
                            }]}>
                                <Ionicons
                                    name={userData?.isAdmin ? "shield" : userData?.status === 'Guide' ? "compass" : "leaf"}
                                    size={10}
                                    color={userData?.isAdmin ? '#f87171' : userData?.status === 'Guide' ? '#facc15' : '#4ade80'}
                                />
                                <Text style={[styles.valleyText, {
                                    color: userData?.isAdmin ? '#f87171' : userData?.status === 'Guide' ? '#facc15' : '#4ade80'
                                }]}>
                                    {userData?.isAdmin ? 'Admin' : (userData?.status || 'Pioneer')}
                                </Text>
                            </View>

                            {userData?.valley_affiliation && (
                                <View style={styles.valleyBadge}>
                                    <Ionicons name="location" size={10} color="#fff" />
                                    <Text style={styles.valleyText}>{userData.valley_affiliation}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </Animated.View>

                {/* COLLAPSED STATE (Sticky Header with Mini Stats) */}
                <Animated.View
                    style={[styles.headerContentCollapsed, collapsedContentStyle, { paddingTop: insets.top }]}
                    pointerEvents="box-none"
                >
                    <View style={styles.collapsedLeft}>
                        {/* Mini Avatar */}
                        <TouchableOpacity onPress={() => setShowStatsModal(true)} style={styles.miniAvatar}>
                            <Text style={styles.miniAvatarText}>
                                {(userData?.displayName || user?.email)?.charAt(0).toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.collapsedName} numberOfLines={1}>
                                {userData?.displayName || 'Profile'}
                            </Text>
                            <Text style={styles.collapsedStats}>
                                {userData?.points || 0} pts • {myEntries.length} words
                            </Text>
                            <Text style={{
                                fontSize: 10,
                                fontWeight: '800',
                                marginTop: 2,
                                color: userData?.isAdmin ? '#f87171' :
                                    userData?.status === 'Guide' ? '#facc15' :
                                        '#4ade80'
                            }}>
                                {userData?.isAdmin ? 'ADMIN' : (userData?.status || 'PIONEER').toUpperCase()}
                            </Text>
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



    const renderEntry = ({ item, index }) => {
        const hasAudio = item.audioURL && item.audioURL.trim() !== '';
        // Calculate progress
        const voteCount = item.vote_count || 0;
        const isVerified = item.status === 'verified';
        const isRejected = item.status === 'rejected';
        const isExpanded = expandedId === item.id;

        const statusColor = isVerified ? colors.success : isRejected ? colors.error : '#D97706';

        return (
            <Animated.View
                entering={FadeInDown.delay(index * 50).springify()}
                layout={Layout.springify()}
                style={[styles.cardContainer, { backgroundColor: colors.surface, overflow: 'hidden', padding: 0 }]}
            >
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setExpandedId(isExpanded ? null : item.id)}
                >
                    <View style={styles.cardMainRow}>
                        {/* Left Status Strip */}
                        <View style={[styles.leftStrip, { backgroundColor: statusColor }]}>
                            {/* Emphasized Vote Count if pending */}
                            {!isVerified && !isRejected && (
                                <View style={styles.stripVoteContainer}>
                                    <Text style={styles.stripVoteCount}>{voteCount}</Text>
                                    <Text style={styles.stripVoteTotal}>/7</Text>
                                </View>
                            )}
                            {(isVerified || isRejected) && (
                                <Ionicons
                                    name={isVerified ? "checkmark-circle" : "close-circle"}
                                    size={20}
                                    color="#fff"
                                    style={{ marginTop: 12 }}
                                />
                            )}
                        </View>

                        {/* Right Content */}
                        <View style={styles.rightContent}>
                            <View style={styles.cardHeaderRow}>
                                <Text style={[styles.wordText, { color: colors.text }]}>{item.word}</Text>
                                {hasAudio ? (
                                    <TouchableOpacity
                                        onPress={() => playSound(item.audioURL, item.id)}
                                        style={[styles.playButtonSmall, { backgroundColor: `${colors.primary}15` }]}
                                    >
                                        <Ionicons name="play" size={16} color={colors.primary} />
                                    </TouchableOpacity>
                                ) : (
                                    <View style={styles.noAudioBadge}>
                                        <Text style={[styles.noAudioText, { color: colors.textLight }]}>No Audio</Text>
                                    </View>
                                )}
                            </View>

                            <Text style={[styles.meaningText, { color: colors.text }]}>{item.meaning}</Text>

                            <View style={styles.metaRow}>
                                <Text style={[styles.dialectText, { color: colors.textLight }]}>
                                    {item.dialect} • <Text style={{ color: statusColor, fontWeight: '700' }}>{item.status.toUpperCase()}</Text>
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Expanded Details */}
                    {isExpanded && (
                        <View style={[styles.expandedContent, { borderTopWidth: 1, borderTopColor: colors.border }]}>
                            <View style={styles.expandedDetailRow}>
                                <Text style={[styles.expandedLabel, { color: colors.textLight }]}>Entry ID:</Text>
                                <Text style={[styles.expandedValue, { color: colors.text }]}>{item.id.slice(0, 8)}...</Text>
                            </View>
                            <View style={styles.expandedDetailRow}>
                                <Text style={[styles.expandedLabel, { color: colors.textLight }]}>Rejections:</Text>
                                <Text style={[styles.expandedValue, { color: colors.error }]}>{item.rejection_count || 0}</Text>
                            </View>
                            {item.timestamp?.seconds && (
                                <View style={styles.expandedDetailRow}>
                                    <Text style={[styles.expandedLabel, { color: colors.textLight }]}>Added:</Text>
                                    <Text style={[styles.expandedValue, { color: colors.text }]}>
                                        {new Date(item.timestamp.seconds * 1000).toLocaleDateString()}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [visibleCount, setVisibleCount] = useState(6);
    const [filterStatus, setFilterStatus] = useState('All');

    // Reset visible count when filter or search changes
    useEffect(() => {
        setVisibleCount(6);
    }, [filterStatus, searchQuery]);

    const filteredEntries = myEntries.filter(e => {
        // Status Filter
        if (filterStatus !== 'All') {
            if (filterStatus === 'Verified' && e.status !== 'verified') return false;
            if (filterStatus === 'Pending' && e.status !== 'pending') return false;
        }
        // Search Filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            return (
                e.word.toLowerCase().includes(query) ||
                e.meaning.toLowerCase().includes(query)
            );
        }
        return true;
    });

    const displayedEntries = filteredEntries.slice(0, visibleCount);

    // Fix: Define renderListHeader as a function returning an Element (stable across renders)
    // instead of a Component (which would remount on every parent render)
    const renderListHeader = useMemo(() => {
        const earnedBadges = (userData?.badges || []).map(id => getBadgeById(id)).filter(Boolean);

        return (
            <View style={styles.listHeaderContext}>
                <StatsSection userData={userData} myEntries={myEntries} colors={colors} />

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

                <View style={styles.filterSection}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.s }}>
                        {isSearching ? (
                            // LayoutAnimation is better for preventing remounts, but here we can just key it properly
                            <Animated.View
                                key="searchBar"
                                entering={FadeInRight.duration(200)}
                                style={[styles.searchContainer, { backgroundColor: colors.inputBg }]}
                            >
                                <Ionicons name="search" size={16} color={colors.textLight} style={{ marginLeft: 8 }} />
                                <TextInput
                                    ref={input => {
                                        // Auto-focus logic moved here to avoid useEffect dependency on remount
                                        if (input && isSearching) input.focus();
                                    }}
                                    style={[styles.searchInput, { color: colors.text, paddingVertical: 0 }]}
                                    placeholder="Search words..."
                                    placeholderTextColor={colors.textLight}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                                <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(''); }} style={{ padding: 4 }}>
                                    <Ionicons name="close" size={18} color={colors.textLight} />
                                </TouchableOpacity>
                            </Animated.View>
                        ) : (
                            <Animated.Text
                                key="title"
                                entering={FadeIn.duration(200)}
                                style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}
                            >
                                My Contributions
                            </Animated.Text>
                        )}

                        {!isSearching && (
                            <TouchableOpacity onPress={() => setIsSearching(true)} style={styles.searchIconBtn}>
                                <Ionicons name="search" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Filter Pills */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                        {['All', 'Verified', 'Pending'].map((status) => (
                            <TouchableOpacity
                                key={status}
                                onPress={() => setFilterStatus(status)}
                                style={[
                                    styles.filterPill,
                                    {
                                        backgroundColor: filterStatus === status ? colors.primary : colors.inputBg,
                                        borderWidth: 1,
                                        borderColor: filterStatus === status ? colors.primary : 'transparent'
                                    }
                                ]}
                            >
                                <Text style={[
                                    styles.filterText,
                                    { color: filterStatus === status ? '#fff' : colors.textLight }
                                ]}>
                                    {status}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        );
    }, [userData, myEntries, isSearching, searchQuery, filterStatus, colors, isDark]);

    const ListFooter = () => {
        return (
            <View style={{ paddingBottom: 100 }}>
                {/* Load More Button */}
                {visibleCount < filteredEntries.length && (
                    <TouchableOpacity
                        onPress={() => setVisibleCount(prev => prev + 6)}
                        style={[styles.loadMoreBtn, { backgroundColor: colors.inputBg }]}
                    >
                        <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load More</Text>
                        <Ionicons name="chevron-down" size={16} color={colors.primary} />
                    </TouchableOpacity>
                )}

                {/* Admin Section (Only if Admin) */}
                {userData?.isAdmin && (
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
                )}
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

            {/* Content List - Render FIRST so Header is structurally on top if zIndex fails, 
                but actually in RN, last element is on top. 
                Wait, if I put FlatList first, Header (absolute) will be on top.
                Currently Header is first. 
                Let's swap them. */}

            <Animated.FlatList
                data={displayedEntries}
                renderItem={renderEntry}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{
                    paddingTop: HEADER_HEIGHT_EXPANDED + 20, // Add a bit more space
                    paddingHorizontal: SPACING.m,
                    paddingBottom: 100
                }}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                ListHeaderComponent={renderListHeader}
                ListFooterComponent={ListFooter}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="documents-outline" size={48} color={colors.textLight} style={{ opacity: 0.5 }} />
                        <Text style={[styles.emptyText, { color: colors.textLight }]}>
                            You haven't contributed yet.
                        </Text>
                    </View>
                }
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        progressViewOffset={HEADER_HEIGHT_EXPANDED}
                        tintColor={colors.primary}
                    />
                }
            />

            {/* Background Header Parallax Spacer - Moved BELOW FlatList for Z-order safety */}
            <ProfileHeader />

            <ShareableStatsModal
                visible={showStatsModal}
                onClose={() => setShowStatsModal(false)}
                userData={userData}
                contributionCount={myEntries.length}
            />
        </View>
    );
}


const StatsSection = React.memo(({ userData, myEntries, colors }) => (
    <View style={styles.statsWrapper}>
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
));

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
        zIndex: 100, // Ensure it's clickable
        overflow: 'hidden',
        elevation: 10,
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
        marginBottom: 12,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        width: '100%',
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

    // NEW CARD STYLES
    cardMainRow: {
        flexDirection: 'row',
        minHeight: 90,
    },
    leftStrip: {
        width: 50,
        alignItems: 'center',
        paddingTop: 16,
    },
    stripVoteContainer: {
        alignItems: 'center',
    },
    stripVoteCount: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
        lineHeight: 22,
    },
    stripVoteTotal: {
        fontSize: 10,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.8)',
    },
    // SUMMARY & FILTER STYLES
    summaryCard: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        marginTop: 0, // was 8
        flexDirection: 'row',
        alignItems: 'center',
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    summaryIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    summaryLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 2,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: '800',
    },
    filterSection: {
        marginBottom: 16,
    },
    filterScroll: {
        marginTop: 8,
    },
    filterPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
    },
    filterText: {
        fontSize: 13,
        fontWeight: '600',
    },
    // SEARCH & PAGINATION
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 12,
        height: 40,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
    },
    searchIconBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    loadMoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 20,
        marginHorizontal: 40,
        marginBottom: 32,
        gap: 8,
    },
    loadMoreText: {
        fontSize: 14,
        fontWeight: '700',
    },
    rightContent: {
        flex: 1,
        padding: 12,
        justifyContent: 'center',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    playButtonSmall: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    noAudioBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    noAudioText: {
        fontSize: 10,
        fontWeight: '600',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    // EXPANDED STYLES
    expandedContent: {
        padding: 16,
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    expandedDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    expandedLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    expandedValue: {
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    }
});
