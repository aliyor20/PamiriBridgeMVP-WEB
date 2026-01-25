import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, Modal, Text, Dimensions, TouchableWithoutFeedback, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import Button from './Button';
import NumberTicker from './NumberTicker';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';

const { height } = Dimensions.get('window');

/**
 * ActionModal - A generic, themed modal for success, error, info, and conformation dialogs.
 * Supports swipe-to-dismiss and back button handle.
 */
export default function ActionModal({
    visible,
    type = 'info',
    title,
    message,
    primaryActionLabel,
    onPrimaryAction,
    secondaryActionLabel = "Cancel",
    onSecondaryAction,
    points,
    word,
    dialect,
    dailyCount,
    onDismiss // Handler specifically for dismissal (swipe or back)
}) {
    // Shared values for animations
    const translateY = useSharedValue(height);
    const opacity = useSharedValue(0);
    // Track context for gesture
    const context = useSharedValue({ y: 0 });

    const config = {
        success: {
            icon: 'checkmark-circle',
            color: COLORS.success,
            defaultLabel: 'Continue',
            bg: 'rgba(34, 197, 94, 0.1)'
        },
        error: {
            icon: 'alert-circle',
            color: COLORS.error,
            defaultLabel: 'Close',
            bg: 'rgba(239, 68, 68, 0.1)'
        },
        info: {
            icon: 'information-circle',
            color: COLORS.primary,
            defaultLabel: 'OK',
            bg: 'rgba(57, 106, 252, 0.1)'
        },
        confirm: {
            icon: 'help-circle',
            color: COLORS.primary,
            defaultLabel: 'Confirm',
            bg: COLORS.inputBg
        }
    };

    const currentType = config[type] || config.info;
    const dismissHandler = onDismiss || ((type === 'confirm' && onSecondaryAction) ? onSecondaryAction : null) || onPrimaryAction;

    useEffect(() => {
        if (visible) {
            opacity.value = withTiming(1, { duration: 250 });
            translateY.value = withSpring(0, { damping: 15, stiffness: 90 });
        } else {
            // Reset when invisible
            opacity.value = 0;
            translateY.value = height;
        }
    }, [visible]);

    // Handle Hardware Back Button (Android)
    useEffect(() => {
        const backAction = () => {
            if (visible) {
                // Determine which action to take on back press
                // If it's a confirming modal, back usually means cancel.
                // If simple info/success, it means dismiss/primary.
                const action = onDismiss || onSecondaryAction || onPrimaryAction;
                handleAction(action);
                return true;
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            backAction
        );

        return () => backHandler.remove();
    }, [visible, onDismiss, onSecondaryAction, onPrimaryAction]);

    // Unified handler that animates out then calls the callback
    const handleAction = useCallback((callback) => {
        if (!visible) return; // Prevent double firing

        translateY.value = withTiming(height, { duration: 200 }, (finished) => {
            if (finished && callback) {
                runOnJS(callback)();
            }
        });
        opacity.value = withTiming(0, { duration: 150 });
    }, [visible]);

    // Modern Gesture API
    const pan = Gesture.Pan()
        .onStart(() => {
            context.value = { y: translateY.value };
        })
        .onUpdate((event) => {
            // Resistance logic: Move less than the finger moves
            // Multiply by 0.4 to give a "heavy" feel attached to the middle
            // Only allow dragging downwards (positive Y)
            const dragY = Math.max(0, event.translationY);
            translateY.value = dragY * 0.4; // 40% movement ratio
        })
        .onEnd((event) => {
            // Throw logic
            // If thrown fast (> 600) OR dragged far enough (> 120)
            if (event.velocityY > 600 || event.translationY > 120) {
                // Dismiss away
                translateY.value = withTiming(height, { duration: 200 }, (finished) => {
                    if (finished && dismissHandler) {
                        runOnJS(dismissHandler)();
                    }
                });
                opacity.value = withTiming(0, { duration: 200 });
            } else {
                // Spring back to center
                translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
            }
        });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
        };
    });

    const backdropStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
        };
    });

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none" // We handle animation
            statusBarTranslucent={true}
            onRequestClose={() => handleAction(dismissHandler)} // Android back button prop
        >
            <View style={styles.overlayWrapper}>
                <TouchableWithoutFeedback onPress={() => handleAction(dismissHandler)}>
                    <Animated.View style={[styles.backdrop, backdropStyle]} />
                </TouchableWithoutFeedback>

                <GestureHandlerRootView style={styles.gestureRoot}>
                    <GestureDetector gesture={pan}>
                        <Animated.View style={[
                            styles.container,
                            { backgroundColor: COLORS.background },
                            animatedStyle
                        ]}>
                            {/* Drag Handle */}
                            <View style={styles.dragHandle} />

                            <View style={[styles.iconContainer, { backgroundColor: currentType.bg }]}>
                                <Ionicons name={currentType.icon} size={48} color={currentType.color} />
                            </View>

                            {/* Word Context Section */}
                            {word && (
                                <View style={styles.entryContext}>
                                    <Text style={styles.contextDialect}>{dialect}</Text>
                                    <Text style={styles.contextWord}>{word}</Text>
                                </View>
                            )}

                            <Text style={[styles.title, { color: COLORS.text }]}>{title}</Text>
                            <Text style={[styles.message, { color: COLORS.textLight }]}>{message}</Text>

                            {/* Stats Row */}
                            {(points > 0 || dailyCount !== undefined) && (
                                <View style={styles.statsRow}>
                                    {points > 0 && (
                                        <View style={styles.pointsBadge}>
                                            <Ionicons name="star" size={16} color={COLORS.success} />
                                            <Text style={styles.pointsText}>+{points} Points</Text>
                                        </View>
                                    )}

                                    {dailyCount !== undefined && (
                                        <View style={styles.dailyCountBadge}>
                                            <Text style={styles.dailyLabel}>Today's Total:</Text>
                                            <NumberTicker
                                                number={dailyCount}
                                                style={styles.dailyTicker}
                                                duration={1500}
                                            />
                                        </View>
                                    )}
                                </View>
                            )}

                            <View style={styles.buttonRow}>
                                {type === 'confirm' && (
                                    <Button
                                        title={secondaryActionLabel}
                                        onPress={() => handleAction(onSecondaryAction)}
                                        variant="ghost"
                                        style={styles.button}
                                    />
                                )}
                                <Button
                                    title={primaryActionLabel || currentType.defaultLabel}
                                    onPress={() => handleAction(onPrimaryAction)}
                                    variant={type === 'error' ? 'danger' : 'primary'}
                                    style={styles.button}
                                />
                            </View>
                        </Animated.View>
                    </GestureDetector>
                </GestureHandlerRootView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlayWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gestureRoot: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.l,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    container: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        padding: SPACING.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 20,
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 3,
        marginBottom: SPACING.l,
    },
    iconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.l,
    },
    // ... Context, Title, Message styles same as before
    entryContext: {
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    contextDialect: {
        fontSize: 13,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '600',
        color: COLORS.primary,
        marginBottom: 4,
        opacity: 0.8
    },
    contextWord: {
        fontSize: 32,
        fontWeight: '800',
        color: COLORS.text,
        textAlign: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: SPACING.s,
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: SPACING.l,
        lineHeight: 22,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: SPACING.l,
        width: '100%'
    },
    pointsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    pointsText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.success,
        marginLeft: 4,
    },
    dailyCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.inputBg,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    dailyLabel: {
        fontSize: 12,
        color: COLORS.textLight,
        marginRight: 6,
    },
    dailyTicker: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    buttonRow: {
        width: '100%',
        flexDirection: 'row',
        gap: SPACING.m,
        justifyContent: 'center',
    },
    button: {
        flex: 1,
    }
});
