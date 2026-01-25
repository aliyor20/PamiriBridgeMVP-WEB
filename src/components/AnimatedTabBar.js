import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Platform, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Custom Animated Tab Bar with sliding indicator and smooth transitions
 * Adapted for BottomTabNavigator (no native position prop)
 */
export default function AnimatedTabBar({ state, descriptors, navigation, colors }) {
    const insets = useSafeAreaInsets();
    const TAB_COUNT = state.routes.length;
    const TAB_WIDTH = SCREEN_WIDTH / TAB_COUNT;
    const INDICATOR_WIDTH = 40;
    const INDICATOR_OFFSET = (TAB_WIDTH - INDICATOR_WIDTH) / 2;

    // Internal animated value for the indicator
    const indicatorPosition = useRef(new Animated.Value(state.index * TAB_WIDTH + INDICATOR_OFFSET)).current;

    useEffect(() => {
        // Animate indicator to new position when index changes
        Animated.spring(indicatorPosition, {
            toValue: state.index * TAB_WIDTH + INDICATOR_OFFSET,
            useNativeDriver: true, // transform is supported
            friction: 12,
            tension: 60
        }).start();
    }, [state.index, TAB_WIDTH]);

    const getIcon = (routeName, focused) => {
        const icons = {
            'Dictionary': focused ? 'book' : 'book-outline',
            'Contribute': focused ? 'add-circle' : 'add-circle-outline',
            'Statistics': focused ? 'stats-chart' : 'stats-chart-outline',
            'Review': focused ? 'shield-checkmark' : 'shield-checkmark-outline',
            'Profile': focused ? 'person' : 'person-outline',
        };
        return icons[routeName] || 'help-circle-outline';
    };

    const handlePress = (route, index, isFocused) => {
        const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
            // Haptic feedback
            if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            navigation.navigate(route.name);
        }
    };

    const handleLongPress = (route) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        navigation.emit({
            type: 'tabLongPress',
            target: route.key,
        });
    };

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: colors.surface,
                paddingBottom: insets.bottom || 8,
                borderTopColor: colors.border,
            }
        ]}>
            {/* Sliding indicator */}
            <Animated.View
                style={[
                    styles.indicator,
                    {
                        backgroundColor: colors.primary,
                        width: INDICATOR_WIDTH,
                        transform: [{ translateX: indicatorPosition }],
                    }
                ]}
            />

            {/* Tab buttons */}
            <View style={styles.tabsRow}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const label = options.tabBarLabel || options.title || route.name;
                    const isFocused = state.index === index;

                    return (
                        <TouchableOpacity
                            key={route.key}
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={options.tabBarAccessibilityLabel}
                            testID={options.tabBarTestID}
                            onPress={() => handlePress(route, index, isFocused)}
                            onLongPress={() => handleLongPress(route)}
                            style={styles.tab}
                            activeOpacity={0.7}
                        >
                            <View
                                style={[
                                    styles.tabContent,
                                    // Scale animation logic simplified for bottom tabs
                                    { transform: [{ scale: isFocused ? 1.1 : 1.0 }] }
                                ]}
                            >
                                <Ionicons
                                    name={getIcon(route.name, isFocused)}
                                    size={24}
                                    color={isFocused ? colors.primary : colors.textLight}
                                />
                                <Text
                                    style={[
                                        styles.label,
                                        {
                                            color: isFocused ? colors.primary : colors.textLight,
                                            fontWeight: isFocused ? '600' : '400',
                                        }
                                    ]}
                                    numberOfLines={1}
                                >
                                    {label}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        borderTopWidth: StyleSheet.hairlineWidth,
        position: 'relative',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    indicator: {
        position: 'absolute',
        top: 0,
        height: 3,
        borderBottomLeftRadius: 3,
        borderBottomRightRadius: 3,
        zIndex: 10,
    },
    tabsRow: {
        flexDirection: 'row',
        paddingTop: 8,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    tabContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 11,
        marginTop: 4,
    },
});
