/**
 * MapSlide - Third onboarding screen
 * Interactive map of the Pamir "Seven Valleys" with Rich Detail Mode
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    withSpring,
    Easing,
    useAnimatedGestureHandler,
    runOnJS,
    interpolate,
    Extrapolate
} from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { usePreferences } from '../../context/PreferencesContext';
import PamirMap from '../../../assets/onboarding/PamirRegionMap.svg';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Enriched Valley Data
const VALLEYS = [
    {
        name: 'Ishkashim',
        x: 15, y: 85,
        language: 'Ishkashimi',
        speakers: '~2,500',
        center: 'Ryn Village',
        hook: 'The Hunters\' Taboo',
        history: 'Ishkashimi was once the dominant language of the Wakhan corridor but has receded. It retains unique hunting vocabulary.',
        today: 'Spoken primarily in Ryn and close villages. Endangered due to the dominance of Tajik and Wakhi.',
        preserve: 'Recording the unique hunting taboo lexicon is critical before the last generation of hunters passes.',
        description: 'Speakers developed a "taboo vocabulary" to avoid alerting spirits during the hunt.'
    },
    {
        name: 'Wakhan',
        x: 50, y: 90,
        language: 'Wakhi',
        speakers: '50,000+',
        center: 'Langar / Vrang',
        hook: 'Sounds of the High Road',
        history: 'The language of the ancient Silk Road travelers. Key to cross-border trade between empires.',
        today: 'Healthy population across four countries, but splintered by borders.',
        preserve: 'To maintain the unity of the Wakhi identity across modern political borders.',
        description: 'Preserves ancient "retroflex" sounds from the Hindu Kush.'
    },
    {
        name: 'Shughnan',
        x: 20, y: 65,
        language: 'Shughni',
        speakers: '~95,000',
        center: 'Khorog',
        hook: 'The Center of Gravity',
        history: 'The historical administrative center language. Influenced heavily by Russian and Persian.',
        today: 'The most widely spoken Pamiri language, acting as a lingua franca in Khorog.',
        preserve: 'Documentation of its rich oral poetry tradition is ongoing.',
        description: 'The lingua franca of the Pamirs.'
    },
    {
        name: 'Rushan',
        x: 20, y: 50,
        language: 'Rushani',
        speakers: '~30,000',
        center: 'Vamar',
        hook: 'Grammar of the Ancients',
        history: 'Known for its distinct grammatical complexity that predates modern Persian.',
        today: 'Strong literary tradition and local music scene.',
        preserve: 'To keep intricate grammatical structures alive that simplify in other dialects.',
        description: 'Famous for its "Double-Oblique" grammar.'
    },
    {
        name: 'Yazghulam',
        x: 25, y: 35,
        language: 'Yazghulami',
        speakers: '~4-10k',
        center: 'Motravn',
        hook: 'The Secret Code',
        history: 'Developed almost in isolation, creating a language unintelligible to neighbors.',
        today: 'Highly endangered, with many young people shifting to Tajik.',
        preserve: 'It is a linguistic isolate within the Pamir group; losing it means losing a unique branch.',
        description: 'Historically developed a secret argot to communicate privately.'
    },
    {
        name: 'Bartang',
        x: 45, y: 45,
        language: 'Bartangi',
        speakers: '< 5,000',
        center: 'Basid / Roshorv',
        hook: 'The Narrow Passage',
        history: 'Protected by the treacherous Bartang river gorge, keeping it pure.',
        today: 'Facing rapid depopulation due to migration to cities.',
        preserve: 'Capturing the specific vocabulary related to high-mountain survival.',
        description: 'Isolated by landslides, keeping ancient pronunciations.'
    },
    {
        name: 'Sarikol',
        x: 60, y: 40,
        language: 'Sarikoli',
        speakers: '~35,000',
        center: 'Tashkurgan (China)',
        hook: 'Indo-European in China',
        history: 'The easternmost Iranic language, cut off from the rest by mountains.',
        today: 'Heavily influenced by Uyghur and Mandarin vocabulary.',
        preserve: 'Unique study case of language contact between Indo-European and Turkic/Sinitic groups.',
        description: 'The only Indo-European language indigenous to China.'
    },
];

const MAP_WIDTH = width - 40;
const MAP_HEIGHT = MAP_WIDTH * 0.75;
const SHEET_HEIGHT = height * 0.65; // Slightly taller to be safe

// Marker Component
function ValleyMarker({ valley, index, isActive, colors, onPress, isSelected, isDetailMode }) {
    const scale = useSharedValue(0);

    useEffect(() => {
        if (isActive) {
            const delay = 800 + (index * 100);
            scale.value = withDelay(delay, withSpring(1));
        }
    }, [isActive]);

    const animatedStyle = useAnimatedStyle(() => {
        // Fade out markers in Detail Mode
        const targetOpacity = isDetailMode
            ? (isSelected ? 0 : 0) // Hide ALL markers when hidden behind sheet
            : 1;

        return {
            transform: [{ scale: withSpring(isSelected ? 1.5 : scale.value) }],
            opacity: withTiming(targetOpacity, { duration: 300 }),
        };
    });

    const labelStyle = useAnimatedStyle(() => {
        return {
            opacity: withTiming(isDetailMode ? 0 : 1, { duration: 300 })
        };
    });

    const x = (valley.x / 100) * MAP_WIDTH;
    const y = (valley.y / 100) * MAP_HEIGHT;

    return (
        <TouchableOpacity
            style={[styles.markerContainer, { left: x - 20, top: y - 20 }]}
            onPress={() => onPress(valley)}
            activeOpacity={0.8}
            disabled={isDetailMode} // Disable interaction when detail is open
        >
            <Animated.View style={[
                styles.marker,
                { backgroundColor: isSelected ? colors.primary : colors.text },
                animatedStyle
            ]}>
                <View style={[styles.markerInner, { backgroundColor: colors.background }]} />
            </Animated.View>

            <Animated.Text style={[
                styles.markerLabel,
                { color: colors.text },
                labelStyle
            ]}>
                {valley.name}
            </Animated.Text>
        </TouchableOpacity>
    );
}

export default function MapSlide({ isActive, setNavigationVisibility }) {
    const { colors, isDark } = usePreferences();
    const [selectedValley, setSelectedValley] = useState(null);
    const [isDetailMode, setIsDetailMode] = useState(false);

    // Header Animation Values
    const headerOpacity = useSharedValue(0);
    const headerTranslateY = useSharedValue(20);

    // Map Animation Values
    const mapTranslateY = useSharedValue(0);
    const mapScale = useSharedValue(1);
    const mapOpacity = useSharedValue(1);

    // Detail Sheet Animation
    const sheetTranslateY = useSharedValue(height);
    const context = useSharedValue({ y: 0 });

    useEffect(() => {
        if (isActive && !isDetailMode) {
            headerOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
            headerTranslateY.value = withDelay(200, withTiming(0, { duration: 600 }));
        } else if (!isActive) {
            headerOpacity.value = 0;
            headerTranslateY.value = 20;
        }
    }, [isActive, isDetailMode]);

    // Handle Navbar Visibility
    useEffect(() => {
        if (setNavigationVisibility) {
            setNavigationVisibility(!isDetailMode);
        }
    }, [isDetailMode]);

    const handleValleyPress = (valley) => {
        if (selectedValley?.name === valley.name && isDetailMode) return;

        setSelectedValley(valley);
        setIsDetailMode(true);

        // 1. Hide Header
        headerOpacity.value = withTiming(0, { duration: 300 });
        headerTranslateY.value = withTiming(-20, { duration: 300 });

        // 2. Hide Map (Fade out and move down behind sheet)
        mapTranslateY.value = withTiming(100, { duration: 400 });
        mapOpacity.value = withTiming(0, { duration: 400 });
        mapScale.value = withTiming(0.9, { duration: 400 });

        // 3. Show Sheet
        // Use withTiming + Easing.out(Easing.cubic) for snapping without excessive bounce
        sheetTranslateY.value = withTiming(0, {
            duration: 500,
            easing: Easing.out(Easing.exp) // Smooth exponential deceleration, no bounce
        });
    };

    const closeDetailMode = () => {
        setIsDetailMode(false);

        // 1. Show Header
        headerOpacity.value = withDelay(300, withTiming(1));
        headerTranslateY.value = withDelay(300, withTiming(0));

        // 2. Show Map
        mapTranslateY.value = withTiming(0, { duration: 500 });
        mapOpacity.value = withTiming(1, { duration: 500 });
        mapScale.value = withTiming(1, { duration: 500 });

        // 3. Hide Sheet
        sheetTranslateY.value = withTiming(height, { duration: 400 });

        setTimeout(() => setSelectedValley(null), 400);
    };

    // Gesture Handler for Sheet
    const gesture = Gesture.Pan()
        .onStart(() => {
            context.value = { y: sheetTranslateY.value };
        })
        .onUpdate((event) => {
            // Only allow dragging down (positive Y)
            sheetTranslateY.value = Math.max(0, context.value.y + event.translationY);
        })
        .onEnd((event) => {
            if (event.translationY > 100 || event.velocityY > 500) {
                runOnJS(closeDetailMode)();
            } else {
                sheetTranslateY.value = withSpring(0, { damping: 20, stiffness: 90 });
            }
        });

    const headerAnimatedStyle = useAnimatedStyle(() => ({
        opacity: headerOpacity.value,
        transform: [{ translateY: headerTranslateY.value }],
    }));

    const mapContainerStyle = useAnimatedStyle(() => ({
        opacity: mapOpacity.value,
        transform: [
            { translateY: mapTranslateY.value },
            { scale: mapScale.value }
        ]
    }));

    const sheetAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: sheetTranslateY.value }]
    }));

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>

                {/* Header Area */}
                <View style={styles.headerSpacer} />
                <Animated.View style={[styles.header, headerAnimatedStyle]}>
                    <Text style={[styles.mainTitle, { color: colors.text }]}>Explore the Voices</Text>
                    <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: 8 }]}>SEVEN VALLEYS</Text>
                </Animated.View>

                {/* Map Area */}
                <Animated.View style={[styles.mapWrapper, mapContainerStyle]}>
                    <TouchableOpacity activeOpacity={1}>
                        <PamirMap
                            width={MAP_WIDTH}
                            height={MAP_HEIGHT}
                            style={{ color: colors.primary }}
                            fill={colors.primary}
                            opacity={0.60}
                        />

                        {VALLEYS.map((valley, index) => (
                            <ValleyMarker
                                key={valley.name}
                                valley={valley}
                                index={index}
                                isActive={isActive}
                                colors={colors}
                                onPress={handleValleyPress}
                                isSelected={selectedValley?.name === valley.name}
                                isDetailMode={isDetailMode}
                            />
                        ))}
                    </TouchableOpacity>
                </Animated.View>

                {/* Bottom Sheet - Rich Content */}
                <GestureDetector gesture={gesture}>
                    <Animated.View style={[
                        styles.sheetContainer,
                        { backgroundColor: colors.surface, height: SHEET_HEIGHT },
                        sheetAnimatedStyle
                    ]}>
                        {selectedValley && (
                            <View style={styles.sheetContent}>
                                {/* Drag Indicator */}
                                <View style={styles.dragIndicator} />

                                {/* Close Button - Adjusted Position */}
                                <TouchableOpacity style={styles.closeButton} onPress={closeDetailMode}>
                                    <Ionicons name="close" size={26} color={colors.text} />
                                </TouchableOpacity>

                                {/* Sheet Header */}
                                <View style={styles.sheetHeader}>
                                    <View>
                                        <Text style={[styles.sheetTitle, { color: colors.primary }]}>{selectedValley.language}</Text>
                                        <Text style={[styles.sheetSubtitle, { color: colors.textLight }]}>{selectedValley.center}</Text>
                                    </View>
                                    <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
                                        <Ionicons name="people-outline" size={14} color={colors.primary} />
                                        <Text style={[styles.badgeText, { color: colors.primary }]}>{selectedValley.speakers}</Text>
                                    </View>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

                                    {/* Section: History */}
                                    <Text style={[styles.descriptionHeader, { color: colors.textLight }]}>HISTORY</Text>
                                    <Text style={[styles.descriptionText, { color: colors.text }]}>
                                        {selectedValley.history}
                                    </Text>

                                    {/* Section: Today */}
                                    <Text style={[styles.descriptionHeader, { color: colors.textLight }]}>TODAY</Text>
                                    <Text style={[styles.descriptionText, { color: colors.text }]}>
                                        {selectedValley.today}
                                    </Text>

                                    {/* Section: Why Preserve */}
                                    <Text style={[styles.descriptionHeader, { color: colors.textLight }]}>WHY PRESERVE?</Text>
                                    <Text style={[styles.descriptionText, { color: colors.text }]}>
                                        {selectedValley.preserve}
                                    </Text>

                                    {/* Placeholder Action */}
                                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]}>
                                        <Ionicons name="play-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                                        <Text style={styles.actionButtonText}>Hear Greeting</Text>
                                    </TouchableOpacity>
                                </ScrollView>
                            </View>
                        )}
                    </Animated.View>
                </GestureDetector>
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: width,
        alignItems: 'center',
    },
    headerSpacer: {
        height: height * 0.14,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 20,
        zIndex: 10,
        position: 'absolute',
        top: height * 0.14,
        width: '100%',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.5,
        opacity: 0.9,
    },
    mainTitle: {
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
    },
    mapWrapper: {
        marginTop: height * 0.14 + 80,
        alignItems: 'center',
        justifyContent: 'center',
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        zIndex: 1,
    },
    markerContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        zIndex: 20,
    },
    marker: {
        width: 14,
        height: 14,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    markerInner: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    markerLabel: {
        position: 'absolute',
        top: 28,
        fontSize: 11,
        fontWeight: '700',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
        width: 90,
        textAlign: 'center',
    },
    // Bottom Sheet
    sheetContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 20,
        zIndex: 100,
        paddingBottom: 40, // Extra padding to prevent cutoff
    },
    sheetContent: {
        flex: 1,
        padding: 24,
    },
    dragIndicator: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(150,150,150,0.3)',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
        marginTop: 10, // Make space for close button
    },
    sheetTitle: {
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 4,
    },
    sheetSubtitle: {
        fontSize: 14,
        fontWeight: '600',
        opacity: 0.7,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 6,
    },
    badgeText: {
        marginLeft: 6,
        fontSize: 12,
        fontWeight: '700',
    },
    descriptionHeader: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 8,
        opacity: 0.6,
        marginTop: 8,
    },
    descriptionText: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 16,
        opacity: 0.9,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        marginTop: 16,
        marginBottom: 40, // Bottom padding
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    closeButton: {
        position: 'absolute',
        top: 0, // Higher up relative to sheet content
        right: 0,
        padding: 8,
        zIndex: 10,
    }
});
