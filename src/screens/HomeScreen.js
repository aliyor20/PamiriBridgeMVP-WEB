import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Text,
    TouchableOpacity,
    TextInput,
    StatusBar,
    Keyboard,
    Pressable
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    FadeIn,
    Layout,
    interpolate,
} from 'react-native-reanimated';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, TYPOGRAPHY, LAYOUT } from '../constants/theme';
import { searchLocalEntries } from '../services/Database';
import { syncDictionary } from '../services/SyncService';
import { usePreferences } from '../context/PreferencesContext';

// Components
import ExpandableWordCard from '../components/ExpandableWordCard';

import { DIALECTS } from '../constants/dataConfig';

import ActionModal from '../components/ActionModal';

export default function HomeScreen() {
    const { colors, isDark } = usePreferences();
    const insets = useSafeAreaInsets();

    // UI Constants
    const HEADER_PASSIVE_HEIGHT = 60 + insets.top;
    const HEADER_ACTIVE_HEIGHT = 70 + insets.top; // Slightly taller for search bar padding

    // Data States
    const [searchText, setSearchText] = useState('');
    const [selectedDialect, setSelectedDialect] = useState('All');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sound, setSound] = useState(null);

    // UI States
    const [searchMode, setSearchMode] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const inputRef = useRef(null);

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

    // Animation Values
    const headerHeight = useSharedValue(HEADER_PASSIVE_HEIGHT);
    const modeTransition = useSharedValue(0); // 0 = Passive, 1 = Active
    const menuProgress = useSharedValue(0);   // 0 = Closed, 1 = Open

    useEffect(() => {
        initData();
        return () => {
            if (sound) sound.unloadAsync();
        };
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            loadWords();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchText, selectedDialect]);

    // Handle Mode Transition
    useEffect(() => {
        if (searchMode) {
            headerHeight.value = withTiming(HEADER_ACTIVE_HEIGHT, { duration: 200 });
            modeTransition.value = withTiming(1, { duration: 200 });
            if (menuOpen) setMenuOpen(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            headerHeight.value = withTiming(HEADER_PASSIVE_HEIGHT, { duration: 200 });
            modeTransition.value = withTiming(0, { duration: 200 });
            if (menuOpen) setMenuOpen(false);
            Keyboard.dismiss();
            setSearchText('');
        }
    }, [searchMode]);

    // Handle Menu Animation - Faster, no bounce
    useEffect(() => {
        menuProgress.value = withTiming(menuOpen ? 1 : 0, { duration: 150 });
    }, [menuOpen]);

    const initData = async () => {
        setLoading(true);
        await loadWords();
        const result = await syncDictionary();
        if (result && result.success && result.count > 0) {
            await loadWords();
        }
        setLoading(false);
    };

    const loadWords = async () => {
        try {
            const data = await searchLocalEntries(searchText, selectedDialect);
            setResults(data);
        } catch (error) {
            console.log("Search error", error);
        }
    };

    async function playSound(audioURL) {
        if (!audioURL) {
            showModal({
                type: 'info',
                title: 'No Audio',
                message: 'This entry does not have an audio recording.',
                onPrimaryAction: hideModal
            });
            return;
        }
        try {
            if (sound) await sound.unloadAsync();
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: audioURL },
                { shouldPlay: true }
            );
            setSound(newSound);
        } catch (error) {
            console.error(error);
        }
    }

    const toggleSearchMode = () => setSearchMode(!searchMode);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
        if (!menuOpen) Keyboard.dismiss();
    };

    const selectDialect = (d) => {
        setSelectedDialect(d);
        setMenuOpen(false);
    };

    // --- Animated Styles ---

    const containerStyle = useAnimatedStyle(() => ({
        height: headerHeight.value,
        backgroundColor: colors.surface,
        borderBottomColor: colors.border,
        // Shadow only when menu is closed, otherwise menu has shadow
        shadowOpacity: interpolate(menuProgress.value, [0, 1], [0.1, 0]),
        elevation: interpolate(menuProgress.value, [0, 1], [4, 0]),
    }));

    // Passive elements fade out moving up
    const passiveStyle = useAnimatedStyle(() => ({
        opacity: interpolate(modeTransition.value, [0, 0.3], [1, 0]), // Fades out very quickly
        transform: [{ translateY: interpolate(modeTransition.value, [0, 1], [0, -20]) }],
        zIndex: searchMode ? 0 : 10,
        pointerEvents: searchMode ? 'none' : 'auto',
    }));

    // Active elements fade in moving down
    const activeStyle = useAnimatedStyle(() => ({
        opacity: interpolate(modeTransition.value, [0.7, 1], [0, 1]), // Fades in very late
        transform: [{ translateY: interpolate(modeTransition.value, [0, 1], [20, 0]) }],
        zIndex: searchMode ? 10 : 0,
        pointerEvents: searchMode ? 'auto' : 'none',
    }));

    // Menu Overlay Style
    const menuStyle = useAnimatedStyle(() => ({
        opacity: menuProgress.value,
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        transform: [
            { translateY: interpolate(menuProgress.value, [0, 1], [-20, 0]) },
            { scale: interpolate(menuProgress.value, [0, 1], [0.95, 1]) }
        ],
        pointerEvents: menuOpen ? 'auto' : 'none',
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: interpolate(menuProgress.value, [0, 1], [0, 0.5]),
        pointerEvents: menuOpen ? 'auto' : 'none',
    }));

    // Chevron Rotation
    const chevronStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${interpolate(menuProgress.value, [0, 1], [0, 180])}deg` }]
    }));

    const renderItem = ({ item, index }) => (
        <Animated.View
            entering={FadeIn.delay(index * 50)}
            layout={Layout.springify().damping(50).mass(1)}
        >
            <ExpandableWordCard
                item={item}
                searchTerm={searchText}
                onPlayAudio={playSound}
                onRelatedPress={(word) => {
                    if (!searchMode) setSearchMode(true);
                    setSearchText(word);
                }}
            />
        </Animated.View>
    );

    return (
        <View style={[styles.screen, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

            {/* HEADER AREA */}
            <Animated.View style={[styles.headerContainer, containerStyle, { paddingTop: insets.top, borderBottomColor: colors.border }]}>

                {/* 1. PASSIVE MODE TITLE */}
                <Animated.View style={[styles.headerContent, passiveStyle]}>
                    <TouchableOpacity style={styles.titleContainer} onPress={toggleMenu} activeOpacity={0.7}>
                        <Text style={[styles.superTitle, { color: colors.textLight }]}>EXPLORE LEXICON</Text>
                        <View style={styles.titleRow}>
                            <Text style={[styles.headerTitle, { color: colors.text }]}>
                                {selectedDialect === 'All' ? 'All Dialects' : selectedDialect}
                            </Text>
                            <Animated.View style={[{ marginLeft: 4, marginTop: 4 }, chevronStyle]}>
                                <Ionicons name="chevron-down" size={20} color={colors.primary} />
                            </Animated.View>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.iconBtn} onPress={toggleSearchMode}>
                        <Ionicons name="search-circle" size={42} color={colors.primary} />
                    </TouchableOpacity>
                </Animated.View>

                {/* 2. ACTIVE SEACH MODE */}
                <Animated.View style={[styles.headerContent, activeStyle]}>
                    <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Ionicons name="search" size={20} color={colors.textLight} />
                        <TextInput
                            ref={inputRef}
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder="Search..."
                            placeholderTextColor={colors.textLight}
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                        {searchText.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchText('')}>
                                <Ionicons name="close-circle" size={18} color={colors.textLight} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Filter Button (Opens Overlay) */}
                    <TouchableOpacity style={[
                        styles.filterBtn,
                        { backgroundColor: colors.background, borderColor: colors.border }
                    ]} onPress={toggleMenu}>
                        <Ionicons name="options" size={20} color={colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={toggleSearchMode} style={styles.cancelBtn}>
                        <Text style={[styles.cancelText, { color: colors.primary }]}>Cancel</Text>
                    </TouchableOpacity>
                </Animated.View>

            </Animated.View>

            {/* OVERLAY MENU (Absolutely Positioned) */}
            <View style={[StyleSheet.absoluteFill, { zIndex: 90, pointerEvents: 'box-none' }]}>
                {/* Backdrop - Only intercept touches when menu is open */}
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={() => setMenuOpen(false)}
                    pointerEvents={menuOpen ? 'auto' : 'none'}
                >
                    <Animated.View style={[styles.backdrop, backdropStyle]} />
                </Pressable>

                {/* The Menu Card */}
                <Animated.View style={[styles.menuOverlay, menuStyle, { top: headerHeight.value, borderTopColor: colors.border }]}>
                    <Text style={[styles.menuLabel, { color: colors.textLight }]}>Select Dialect</Text>
                    <View style={styles.menuGrid}>
                        {DIALECTS.map((d) => (
                            <TouchableOpacity
                                key={d}
                                style={[
                                    styles.menuChip,
                                    { backgroundColor: colors.background, borderColor: colors.border },
                                    selectedDialect === d && { backgroundColor: colors.primary, borderColor: colors.primary }
                                ]}
                                onPress={() => selectDialect(d)}
                            >
                                <Text style={[
                                    styles.menuChipText,
                                    { color: colors.text },
                                    selectedDialect === d && { color: colors.surface, fontWeight: '700' }
                                ]}>{d}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>
            </View>

            {/* CONTENT LIST */}
            <View style={styles.listContainer}>
                {loading && results.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={results}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            !loading && (
                                <View style={styles.emptyState}>
                                    <Ionicons name="library-outline" size={64} color={colors.border} />
                                    <Text style={[styles.emptyText, { color: colors.textLight }]}>No results found.</Text>
                                </View>
                            )
                        }
                    />
                )}
            </View>

            <ActionModal
                visible={modal.visible}
                type={modal.type}
                title={modal.title}
                message={modal.message}
                primaryActionLabel={modal.primaryActionLabel}
                onPrimaryAction={modal.onAction || modal.onPrimaryAction || hideModal}
                onDismiss={hideModal}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    // Header
    headerContainer: {
        borderBottomWidth: 1,
        zIndex: 100, // Above list
        justifyContent: 'center', // Align content vertically
    },
    headerContent: {
        ...StyleSheet.absoluteFillObject, // Fill the container
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.m,
        top: undefined, // Let padding handle top
        bottom: 0,
        height: 60, // Fixed content height area
    },

    // Passive
    titleContainer: {
        justifyContent: 'center',
    },
    superTitle: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: -0.5,
    },
    iconBtn: {
        padding: 4,
    },

    // Active Search
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.m,
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: SPACING.s,
        fontSize: 16,
    },
    filterBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: SPACING.s,
        borderWidth: 1,
    },
    cancelBtn: {
        marginLeft: SPACING.s,
    },
    cancelText: {
        fontWeight: '600',
    },

    // Overlay Menu
    backdrop: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        ...StyleSheet.absoluteFillObject,
    },
    menuOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        padding: SPACING.m,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
        borderTopWidth: 1,
    },
    menuLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: SPACING.m,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    menuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    menuChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    menuChipText: {
        fontSize: 14,
        fontWeight: '500',
    },

    // List
    listContainer: {
        flex: 1,
        zIndex: 0,
    },
    listContent: {
        padding: SPACING.m,
        paddingBottom: 100,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: SPACING.xl * 2,
        opacity: 0.6,
    },
    emptyText: {
        marginTop: SPACING.m,
        fontSize: 16,
    }
});
