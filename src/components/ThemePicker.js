import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getAvailableThemes, SPACING, LAYOUT } from '../constants/theme';
import { usePreferences } from '../context/PreferencesContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 100;
const CARD_HEIGHT = 140;
const CARD_MARGIN = 8;

export default function ThemePicker() {
    const { selectedTheme, updateTheme, colors } = usePreferences();
    const themes = getAvailableThemes();
    const scaleAnims = useRef(themes.map(() => new Animated.Value(1))).current;
    const checkAnims = useRef(themes.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        // Animate checkmark for selected theme
        themes.forEach((theme, index) => {
            Animated.spring(checkAnims[index], {
                toValue: theme.id === selectedTheme ? 1 : 0,
                friction: 5,
                tension: 100,
                useNativeDriver: true,
            }).start();
        });
    }, [selectedTheme]);

    const handlePress = (themeId, index) => {
        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Scale animation
        Animated.sequence([
            Animated.timing(scaleAnims[index], {
                toValue: 0.92,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnims[index], {
                toValue: 1,
                friction: 4,
                tension: 150,
                useNativeDriver: true,
            }),
        ]).start();

        updateTheme(themeId);
    };

    const renderThemeCard = (theme, index) => {
        const isSelected = theme.id === selectedTheme;
        const previewColors = theme.preview || Object.values(theme.colors).slice(0, 4);

        return (
            <Animated.View
                key={theme.id}
                style={[
                    styles.cardWrapper,
                    { transform: [{ scale: scaleAnims[index] }] },
                ]}
            >
                <TouchableOpacity
                    style={[
                        styles.card,
                        {
                            backgroundColor: theme.colors.surface,
                            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                            borderWidth: isSelected ? 2 : 1,
                        },
                    ]}
                    onPress={() => handlePress(theme.id, index)}
                    activeOpacity={0.8}
                >
                    {/* Color Preview Grid */}
                    <View style={styles.previewGrid}>
                        {previewColors.map((color, colorIndex) => (
                            <View
                                key={colorIndex}
                                style={[
                                    styles.previewSwatch,
                                    { backgroundColor: color },
                                ]}
                            />
                        ))}
                    </View>

                    {/* Theme Name */}
                    <Text
                        style={[
                            styles.themeName,
                            { color: theme.colors.text },
                        ]}
                        numberOfLines={1}
                    >
                        {theme.name}
                    </Text>

                    {/* Selected Checkmark */}
                    <Animated.View
                        style={[
                            styles.checkmark,
                            {
                                backgroundColor: theme.colors.primary,
                                opacity: checkAnims[index],
                                transform: [{
                                    scale: checkAnims[index].interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.5, 1],
                                    }),
                                }],
                            },
                        ]}
                    >
                        <Ionicons name="checkmark" size={14} color="#fff" />
                    </Animated.View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: colors.textLight }]}>
                Choose a theme
            </Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                decelerationRate="fast"
                snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
            >
                {themes.map((theme, index) => renderThemeCard(theme, index))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: SPACING.m,
    },
    label: {
        fontSize: 12,
        marginBottom: SPACING.s,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '600',
    },
    scrollContent: {
        paddingHorizontal: SPACING.xs,
        paddingVertical: SPACING.s,
    },
    cardWrapper: {
        marginHorizontal: CARD_MARGIN,
    },
    card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: LAYOUT.borderRadius.m,
        padding: SPACING.s,
        alignItems: 'center',
        justifyContent: 'space-between',
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    previewGrid: {
        width: '100%',
        height: 60,
        flexDirection: 'row',
        flexWrap: 'wrap',
        borderRadius: LAYOUT.borderRadius.s,
        overflow: 'hidden',
    },
    previewSwatch: {
        width: '50%',
        height: '50%',
    },
    themeName: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: SPACING.xs,
    },
    checkmark: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
