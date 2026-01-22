/**
 * FeaturesSlide - Sixth onboarding screen
 * App features showcase with staggered card animations
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    withSpring,
    withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { usePreferences } from '../../context/PreferencesContext';

const { width } = Dimensions.get('window');

const FEATURES = [
    {
        icon: 'book',
        title: 'Search the Dictionary',
        description: 'Find words in any Pamiri dialect with audio pronunciations',
        color: '#00897b', // Teal
    },
    {
        icon: 'add-circle',
        title: 'Contribute Words',
        description: 'Add new words and record how they sound in your dialect',
        color: '#6366f1', // Indigo
    },
    {
        icon: 'trophy',
        title: 'Earn Badges',
        description: 'Level up by contributing and unlock special badges',
        color: '#f59e0b', // Amber
    },
];

function FeatureCard({ feature, index, isActive, colors }) {
    const translateX = useSharedValue(100);
    const opacity = useSharedValue(0);
    const iconScale = useSharedValue(0);

    useEffect(() => {
        if (isActive) {
            translateX.value = 100;
            opacity.value = 0;
            iconScale.value = 0;

            const delay = 300 + (index * 200);
            translateX.value = withDelay(delay, withSpring(0, { damping: 15 }));
            opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
            iconScale.value = withDelay(delay + 200, withSequence(
                withSpring(1.2, { damping: 8 }),
                withSpring(1, { damping: 12 })
            ));
        }
    }, [isActive]);

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
        opacity: opacity.value,
    }));

    const iconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: iconScale.value }],
    }));

    return (
        <Animated.View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardStyle]}>
            <Animated.View style={[styles.iconContainer, { backgroundColor: feature.color + '20' }, iconStyle]}>
                <Ionicons name={feature.icon} size={28} color={feature.color} />
            </Animated.View>

            <View style={styles.cardContent}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>{feature.title}</Text>
                <Text style={[styles.featureDesc, { color: colors.textLight }]}>{feature.description}</Text>
            </View>
        </Animated.View>
    );
}

export default function FeaturesSlide({ isActive }) {
    const { colors } = usePreferences();

    const headerOpacity = useSharedValue(0);
    const headerTranslateY = useSharedValue(20);
    const footerOpacity = useSharedValue(0);

    useEffect(() => {
        if (isActive) {
            headerOpacity.value = 0;
            headerTranslateY.value = 20;
            footerOpacity.value = 0;

            headerOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
            headerTranslateY.value = withDelay(100, withSpring(0));
            footerOpacity.value = withDelay(1200, withTiming(1, { duration: 500 }));
        }
    }, [isActive]);

    const headerStyle = useAnimatedStyle(() => ({
        opacity: headerOpacity.value,
        transform: [{ translateY: headerTranslateY.value }],
    }));

    const footerStyle = useAnimatedStyle(() => ({
        opacity: footerOpacity.value,
    }));

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Animated.View style={[styles.header, headerStyle]}>
                <Text style={[styles.title, { color: colors.text }]}>What You Can Do</Text>
                <Text style={[styles.subtitle, { color: colors.textLight }]}>
                    Help preserve Pamiri languages for future generations
                </Text>
            </Animated.View>

            <View style={styles.cardsContainer}>
                {FEATURES.map((feature, index) => (
                    <FeatureCard
                        key={feature.title}
                        feature={feature}
                        index={index}
                        isActive={isActive}
                        colors={colors}
                    />
                ))}
            </View>

            <Animated.View style={[styles.footer, footerStyle]}>
                <Ionicons name="sparkles" size={20} color={colors.primary} />
                <Text style={[styles.footerText, { color: colors.textLight }]}>
                    Ready to start your journey?
                </Text>
            </Animated.View>
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
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    cardsContainer: {
        flex: 1,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 4,
    },
    featureDesc: {
        fontSize: 14,
        lineHeight: 20,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 20,
        gap: 8,
    },
    footerText: {
        fontSize: 15,
    },
});
