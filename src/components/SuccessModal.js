import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Modal, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT } from '../constants/theme';
import Button from './Button';

export default function SuccessModal({ visible, onClose, pointsEarned, newBadges = [] }) {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Reset animations
            scaleAnim.setValue(0);
            fadeAnim.setValue(0);

            // Play entrance animation
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 4,
                    tension: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
        >
            <View style={styles.overlay}>
                <Animated.View style={[
                    styles.container,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }]
                    }
                ]}>
                    {/* Celebration Icon */}
                    <View style={styles.iconContainer}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="checkmark" size={48} color={COLORS.surface} />
                        </View>
                    </View>

                    <Text style={styles.title}>Great Job!</Text>
                    <Text style={styles.message}>
                        You contributed a new word to the bridge.
                    </Text>

                    {pointsEarned > 0 && (
                        <View style={styles.pointsContainer}>
                            <Ionicons name="star" size={20} color={COLORS.success} />
                            <Text style={styles.points}>+{pointsEarned} Point{pointsEarned > 1 ? 's' : ''}</Text>
                        </View>
                    )}

                    {/* New Badges Section */}
                    {newBadges.length > 0 && (
                        <View style={styles.badgesSection}>
                            <Text style={styles.badgesTitle}>🎖️ New Badge{newBadges.length > 1 ? 's' : ''} Earned!</Text>
                            {newBadges.map((badge, index) => (
                                <View key={badge.id || index} style={[styles.badgeItem, { borderLeftColor: badge.color }]}>
                                    <Ionicons name={badge.icon || 'ribbon'} size={24} color={badge.color} />
                                    <View style={styles.badgeInfo}>
                                        <Text style={styles.badgeName}>{badge.name}</Text>
                                        <Text style={styles.badgeDesc}>{badge.description}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    <View style={styles.buttonContainer}>
                        <Button title="Keep Going" onPress={onClose} />
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '85%',
        maxWidth: 360,
        backgroundColor: COLORS.surface,
        borderRadius: LAYOUT.borderRadius.xl,
        padding: SPACING.xl,
        alignItems: 'center',
        elevation: 10,
    },
    iconContainer: {
        marginBottom: SPACING.l,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.success,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        ...TYPOGRAPHY.header,
        color: COLORS.text,
        marginBottom: SPACING.s,
    },
    message: {
        ...TYPOGRAPHY.body,
        color: COLORS.textLight,
        textAlign: 'center',
        marginBottom: SPACING.m,
    },
    pointsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(1, 144, 1, 0.15)',
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
        borderRadius: LAYOUT.borderRadius.m,
        marginBottom: SPACING.m,
    },
    points: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.success,
        marginLeft: SPACING.s,
    },
    badgesSection: {
        width: '100%',
        backgroundColor: COLORS.inputBg,
        borderRadius: LAYOUT.borderRadius.m,
        padding: SPACING.m,
        marginBottom: SPACING.l,
    },
    badgesTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: SPACING.m,
    },
    badgeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        padding: SPACING.s,
        borderRadius: LAYOUT.borderRadius.s,
        marginBottom: SPACING.s,
        borderLeftWidth: 3,
    },
    badgeInfo: {
        marginLeft: SPACING.m,
        flex: 1,
    },
    badgeName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    badgeDesc: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    buttonContainer: {
        width: '100%',
    }
});
