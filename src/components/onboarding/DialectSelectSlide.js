/**
 * DialectSelectSlide - Fourth onboarding screen
 * Interactive dialect selection with animated cards
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    withSpring,
    interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { usePreferences } from '../../context/PreferencesContext';

const { width } = Dimensions.get('window');

const DIALECTS = [
    { id: 'Shughni', name: 'Shughni', region: 'Shughnan Valley', icon: 'heart' },
    { id: 'Rushani', name: 'Rushani', region: 'Rushan Valley', icon: 'heart' },
    { id: 'Wakhi', name: 'Wakhi', region: 'Wakhan Corridor', icon: 'heart' },
    { id: 'Yazghulami', name: 'Yazghulami', region: 'Yazgulam Valley', icon: 'heart' },
    { id: 'Sarikoli', name: 'Sarikoli', region: 'Chinese Pamirs', icon: 'heart' },
    { id: 'Bartangi', name: 'Bartangi', region: 'Bartang Valley', icon: 'heart' },
    { id: 'Ishkashimi', name: 'Ishkashimi', region: 'Ishkashim Region', icon: 'heart' },
];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function DialectCard({ dialect, index, isActive, isSelected, onSelect, colors }) {
    const translateY = useSharedValue(50);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(1);
    const glowOpacity = useSharedValue(0);

    useEffect(() => {
        if (isActive) {
            translateY.value = 50;
            opacity.value = 0;

            const delay = 200 + (index * 80);
            translateY.value = withDelay(delay, withSpring(0, { damping: 15 }));
            opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
        }
    }, [isActive]);

    useEffect(() => {
        glowOpacity.value = withTiming(isSelected ? 1 : 0, { duration: 200 });
        scale.value = withSpring(isSelected ? 1.02 : 1);
    }, [isSelected]);

    const cardStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: translateY.value },
            { scale: scale.value }
        ],
        opacity: opacity.value,
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    return (
        <AnimatedTouchable
            style={[
                styles.card,
                {
                    backgroundColor: isSelected ? colors.primary + '15' : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                },
                cardStyle
            ]}
            onPress={() => onSelect(dialect.id)}
            activeOpacity={0.8}
        >
            {/* Glow effect */}
            <Animated.View style={[styles.glow, { backgroundColor: colors.primary }, glowStyle]} />

            <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                    <Text style={[styles.dialectName, { color: colors.text }]}>{dialect.name}</Text>
                    <Text style={[styles.dialectRegion, { color: colors.textLight }]}>{dialect.region}</Text>
                </View>

                {isSelected && (
                    <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                )}
            </View>
        </AnimatedTouchable>
    );
}

export default function DialectSelectSlide({ isActive, selectedDialect, onSelectDialect }) {
    const { colors } = usePreferences();

    const headerOpacity = useSharedValue(0);

    useEffect(() => {
        if (isActive) {
            headerOpacity.value = 0;
            headerOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
        }
    }, [isActive]);

    const headerStyle = useAnimatedStyle(() => ({
        opacity: headerOpacity.value,
    }));

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Animated.View style={[styles.header, headerStyle]}>
                <Ionicons name="language" size={36} color={colors.primary} />
                <Text style={[styles.title, { color: colors.text }]}>Choose Your Dialect</Text>
                <Text style={[styles.subtitle, { color: colors.textLight }]}>
                    Which language is closest to your heart?
                </Text>
            </Animated.View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {DIALECTS.map((dialect, index) => (
                    <DialectCard
                        key={dialect.id}
                        dialect={dialect}
                        index={index}
                        isActive={isActive}
                        isSelected={selectedDialect === dialect.id}
                        onSelect={onSelectDialect}
                        colors={colors}
                    />
                ))}
            </ScrollView>

            {!selectedDialect && (
                <Text style={[styles.hint, { color: colors.textLight }]}>
                    Tap to select • You can change this later in Settings
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: width,
        paddingHorizontal: 24,
        paddingTop: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        marginTop: 12,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    card: {
        borderRadius: 12,
        borderWidth: 1.5,
        marginBottom: 10,
        overflow: 'hidden',
    },
    glow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    cardLeft: {
        flex: 1,
    },
    dialectName: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 2,
    },
    dialectRegion: {
        fontSize: 13,
    },
    checkmark: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hint: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 16,
    },
});
