import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SPACING, LAYOUT } from '../constants/theme';
import Button from '../components/Button';
import { auth, db } from '../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { usePreferences } from '../context/PreferencesContext';

const VALLEYS = [
    { id: 'shughnan', name: 'Shughnan (Shughni)', description: 'Spoken in Khorog and surrounding districts.' },
    { id: 'rushan', name: 'Rushan (Rushani)', description: 'Spoken in Rushan district.' },
    { id: 'wakhan', name: 'Wakhan (Wakhi)', description: 'Spoken in Wakhan corridor and Gojal.' },
    { id: 'bartang', name: 'Bartang (Bartangi)', description: 'Spoken in the Bartang valley.' },
    { id: 'yazghulami', name: 'Yazghulam (Yazghulami)', description: 'Spoken in Yazghulami valley.' },
    { id: 'ishkashim', name: 'Ishkashim (Ishkashimi)', description: 'Spoken in Ishkashim.' },
    { id: 'sarikol', name: 'Sarikol (Sarikoli)', description: 'Spoken in Tashkurgan.' },
    { id: 'vanj', name: 'Vanj (Vanji - Revitalizing)', description: 'Historically Vanji speakers.' },
];

export default function ValleySelectScreen({ navigation }) {
    const [selectedValley, setSelectedValley] = useState(null);
    const [loading, setLoading] = useState(false);
    const { setOnboardingComplete, colors } = usePreferences();

    const handleContinue = async () => {
        if (!selectedValley) return;

        try {
            setLoading(true);
            const user = auth.currentUser;

            // Save valley affiliation to Firebase (needed for Valley Wars leaderboard)
            if (user) {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                    valley_affiliation: selectedValley,
                    // NOTE: onboarding_complete is now stored LOCALLY, not in Firebase
                });
            }

            // Save onboarding complete to LOCAL storage (not Firebase)
            await setOnboardingComplete(true);

            // Navigate to Main App
            navigation.replace('Main');

        } catch (error) {
            console.error(error);
            // Even on error, mark onboarding complete locally to avoid blocking user
            await setOnboardingComplete(true);
            navigation.replace('Main');
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
                selectedValley === item.id && { borderColor: colors.primary, backgroundColor: `${colors.primary}15` }
            ]}
            onPress={() => setSelectedValley(item.id)}
            activeOpacity={0.8}
        >
            <View>
                <Text style={[
                    styles.valleyName,
                    { color: colors.text },
                    selectedValley === item.id && { color: colors.primary }
                ]}>
                    {item.name}
                </Text>
                <Text style={[
                    styles.valleyDesc,
                    { color: colors.textLight },
                    selectedValley === item.id && { color: colors.text }
                ]}>
                    {item.description}
                </Text>
            </View>
            {selectedValley === item.id && (
                <View style={[styles.checkCircle, { backgroundColor: colors.primary }]} />
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.primary }]}>Choose Your Valley</Text>
                <Text style={[styles.subtitle, { color: colors.textLight }]}>
                    This helps us customize the dictionary and leaderboard for you.
                </Text>
            </View>

            <FlatList
                data={VALLEYS}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
            />

            <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                <Button
                    title="Continue"
                    onPress={handleContinue}
                    disabled={!selectedValley}
                    loading={loading}
                    size="large"
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: SPACING.l,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: SPACING.s,
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 24,
    },
    list: {
        paddingHorizontal: SPACING.m,
    },
    card: {
        padding: SPACING.l,
        borderRadius: LAYOUT.borderRadius.m,
        marginBottom: SPACING.m,
        borderWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    valleyName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    valleyDesc: {
        fontSize: 14,
    },
    checkCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
    },
    footer: {
        padding: SPACING.l,
        borderTopWidth: 1,
    }
});
