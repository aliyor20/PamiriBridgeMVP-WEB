import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import Button from '../components/Button';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen({ navigation }) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="snow-outline" size={80} color={COLORS.primary} />
                </View>

                <Text style={styles.title}>Pamiri Bridge</Text>
                <Text style={styles.subtitle}>Preserving our language, one word at a time.</Text>

                <View style={styles.infoContainer}>
                    <InfoItem
                        icon="mic-outline"
                        text="Record words in your dialect"
                    />
                    <InfoItem
                        icon="search-outline"
                        text="Find words with chat-script"
                    />
                    <InfoItem
                        icon="trophy-outline"
                        text="Earn badges and points"
                    />
                </View>
            </View>

            <View style={styles.footer}>
                <Button
                    title="Get Started"
                    onPress={() => navigation.navigate('ValleySelect')}
                    size="large"
                />
            </View>
        </SafeAreaView>
    );
}

const InfoItem = ({ icon, text }) => (
    <View style={styles.infoItem}>
        <Ionicons name={icon} size={24} color={COLORS.secondary} style={{ marginRight: SPACING.m }} />
        <Text style={styles.infoText}>{text}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: SPACING.xl,
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: SPACING.xl,
        backgroundColor: COLORS.surface,
        padding: SPACING.l,
        borderRadius: 50,
    },
    title: {
        ...TYPOGRAPHY.header,
        color: COLORS.primary,
        marginBottom: SPACING.s,
        textAlign: 'center',
    },
    subtitle: {
        ...TYPOGRAPHY.body,
        color: COLORS.textLight,
        textAlign: 'center',
        marginBottom: SPACING.xxl,
    },
    infoContainer: {
        width: '100%',
        paddingHorizontal: SPACING.m,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.l,
    },
    infoText: {
        ...TYPOGRAPHY.body,
        fontSize: 18,
    },
    footer: {
        padding: SPACING.xl,
    }
});
