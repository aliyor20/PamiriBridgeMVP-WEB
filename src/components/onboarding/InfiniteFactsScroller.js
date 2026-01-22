import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePreferences } from '../../context/PreferencesContext';

const ITEM_HEIGHT = 80;
const SCROLL_SPEED = 0.5; // Pixels per frame (approx)

export default function InfiniteFactsScroller({ facts, onFactPress, isPaused }) {
    const { colors } = usePreferences();
    const listRef = useRef(null);
    const scrollOffset = useRef(0);
    const isUserScrolling = useRef(false);
    const timerRef = useRef(null);
    const resumeTimeoutRef = useRef(null);

    // Duplicate facts to create an infinite-like list (50x repeats)
    // This is a common performance trick for "infinite" lists in RN
    const displayFacts = React.useMemo(() => {
        let repeated = [];
        for (let i = 0; i < 50; i++) {
            repeated = [...repeated, ...facts];
        }
        return repeated;
    }, [facts]);

    const startAutoScroll = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (isPaused) return; // Don't start if paused externally

        timerRef.current = setInterval(() => {
            if (!isUserScrolling.current && listRef.current) {
                scrollOffset.current += SCROLL_SPEED;
                listRef.current.scrollToOffset({
                    offset: scrollOffset.current,
                    animated: false,
                });
            }
        }, 16); // ~60fps
    }, [isPaused]);

    const stopAutoScroll = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    }, []);

    useEffect(() => {
        if (!isPaused) {
            startAutoScroll();
        } else {
            stopAutoScroll();
        }
        return () => stopAutoScroll();
    }, [isPaused, startAutoScroll, stopAutoScroll]);

    const handleScrollBeginDrag = () => {
        isUserScrolling.current = true;
        stopAutoScroll();
    };

    const handleScrollEnd = (event) => {
        isUserScrolling.current = false;
        // Sync our offset tracker with where the user left it
        scrollOffset.current = event.nativeEvent.contentOffset.y;

        // Wait 2 seconds before resuming auto-scroll
        if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = setTimeout(() => {
            startAutoScroll();
        }, 2000);
    };

    const renderItem = ({ item, index }) => (
        <TouchableOpacity
            style={[
                styles.card,
                {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                }
            ]}
            onPress={() => onFactPress(item)}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name={item.icon} size={20} color={colors.primary} />
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.hookText, { color: colors.text }]}>
                    {item.hook}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Top Gradient Fade */}
            <LinearGradient
                colors={[colors.background, 'transparent']}
                style={[styles.gradient, styles.topGradient]}
                pointerEvents="none"
            />

            <FlatList
                ref={listRef}
                data={displayFacts}
                renderItem={renderItem}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                showsVerticalScrollIndicator={false}
                onScrollBeginDrag={handleScrollBeginDrag}
                onScrollEndDrag={handleScrollEnd}
                onMomentumScrollEnd={handleScrollEnd}
                contentContainerStyle={styles.listContent}
                getItemLayout={(data, index) => ({
                    length: ITEM_HEIGHT, // Optimization
                    offset: ITEM_HEIGHT * index,
                    index,
                })}
                initialNumToRender={10}
            />

            {/* Bottom Gradient Fade */}
            <LinearGradient
                colors={['transparent', colors.background]}
                style={[styles.gradient, styles.bottomGradient]}
                pointerEvents="none"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        position: 'relative',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 40,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        height: 60, // Fixed height for smoother layout
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    hookText: {
        fontWeight: '600',
        fontSize: 15,
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 60,
        zIndex: 10,
    },
    topGradient: {
        top: 0,
    },
    bottomGradient: {
        bottom: 0,
    }
});
