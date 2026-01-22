/**
 * OriginsSlide - Second onboarding screen
 * "Roof of the World" theme with interactive facts
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Modal, ScrollView } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    FadeIn,
    FadeOut,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { usePreferences } from '../../context/PreferencesContext';
import InfiniteFactsScroller from './InfiniteFactsScroller';
import { PAMIRI_FACTS } from '../../constants/onboardingFacts';

const { width, height } = Dimensions.get('window');

export default function OriginsSlide({ isActive }) {
    const { colors } = usePreferences();
    const [selectedFact, setSelectedFact] = useState(null);

    const headerOpacity = useSharedValue(0);
    const headerTranslateY = useSharedValue(20);

    useEffect(() => {
        if (isActive) {
            headerOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
            headerTranslateY.value = withDelay(200, withTiming(0, { duration: 600 }));
        } else {
            headerOpacity.value = 0;
            headerTranslateY.value = 20;
        }
    }, [isActive]);

    const headerAnimatedStyle = useAnimatedStyle(() => ({
        opacity: headerOpacity.value,
        transform: [{ translateY: headerTranslateY.value }],
    }));

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Top Spacer to push content down */}
            <View style={styles.topSpacer} />

            {/* Header with Title */}
            <Animated.View style={[styles.header, headerAnimatedStyle]}>
                <Text style={[styles.title, { color: colors.text }]}>
                    The Roof of the World
                </Text>

                <Text style={[styles.subtitle, { color: colors.textLight }]}>
                    Where mountains meet the sky and ancient languages survive
                </Text>
            </Animated.View>

            {/* Section Header */}
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                DID YOU KNOW?
            </Text>

            {/* Interactive Scroller */}
            <View style={styles.scrollerContainer}>
                <InfiniteFactsScroller
                    facts={PAMIRI_FACTS}
                    onFactPress={setSelectedFact}
                    isPaused={!!selectedFact}
                />
            </View>

            {/* Expanded Fact Modal */}
            {selectedFact && (
                <ExpandedFactView
                    fact={selectedFact}
                    colors={colors}
                    onClose={() => setSelectedFact(null)}
                />
            )}
        </View>
    );
}

function ExpandedFactView({ fact, colors, onClose }) {
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <BlurView intensity={25} style={StyleSheet.absoluteFill} tint="dark" />
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

                <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={[styles.modalContent, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
                    <View style={[styles.modalIconContainer, { backgroundColor: colors.primary + '20' }]}>
                        <Ionicons name={fact.icon} size={32} color={colors.primary} />
                    </View>

                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                        {fact.hook}
                    </Text>

                    <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                        <Text style={[styles.modalDescription, { color: colors.text }]}>
                            {fact.description}
                        </Text>
                    </ScrollView>

                    <TouchableOpacity
                        style={[styles.closeButton, { backgroundColor: colors.primary }]}
                        onPress={onClose}
                    >
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: width,
        alignItems: 'center',
        paddingBottom: 0, // Remove padding to let scroller hit bottom edge
    },
    topSpacer: {
        flex: 0.9, // Increased to push content lower
        minHeight: 20,
    },
    header: {
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 10,
        zIndex: 10,
        flexShrink: 0,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: '90%',
        opacity: 0.8,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginTop: 25, // Increased from 20 to add more space
        marginBottom: 10,
        opacity: 0.9,
    },
    scrollerContainer: {
        flex: 4, // Take up remaining space (more weight than spacer)
        width: '100%',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '85%',
        maxWidth: 340,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 10,
    },
    modalIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalScroll: {
        maxHeight: 250,
        width: '100%',
    },
    modalDescription: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    closeButton: {
        marginTop: 24,
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 30,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
