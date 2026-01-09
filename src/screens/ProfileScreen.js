import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    SafeAreaView,
    Platform
} from 'react-native';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

import { COLORS, SPACING, TYPOGRAPHY, LAYOUT } from '../constants/theme';
import Button from '../components/Button';
import Card from '../components/Card';

export default function ProfileScreen() {
    const user = auth.currentUser;
    const [userData, setUserData] = useState(null);
    const [myEntries, setMyEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sound, setSound] = useState(null);

    useEffect(() => {
        if (!user) return;

        const userRef = doc(db, 'users', user.uid);
        const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                setUserData(docSnap.data());
            }
        });

        fetchMyContributions();

        return () => {
            unsubscribeUser();
            if (sound) sound.unloadAsync();
        };
    }, [user]);

    const fetchMyContributions = async () => {
        try {
            const q = query(
                collection(db, 'entries'),
                where('contributorId', '==', user.uid)
            );
            const querySnapshot = await getDocs(q);
            const entries = [];
            querySnapshot.forEach((doc) => {
                entries.push({ id: doc.id, ...doc.data() });
            });
            // Manual sort as per MVP constraint (no composite index yet)
            entries.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            setMyEntries(entries);
        } catch (error) {
            console.error("Error fetching contributions:", error);
        } finally {
            setLoading(false);
        }
    };

    const signOut = () => {
        auth.signOut();
    };

    const playSound = async (audioURL) => {
        if (!audioURL) return;
        try {
            if (sound) await sound.unloadAsync();
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: audioURL },
                { shouldPlay: true }
            );
            setSound(newSound);
            newSound.playAsync();
        } catch (error) {
            console.log(error);
        }
    };

    const renderEntry = ({ item }) => (
        <Card style={styles.entryCard}>
            <View style={styles.entryContent}>
                <Text style={styles.entryWord}>{item.word}</Text>
                <Text style={styles.entryDialect}>{item.dialect}</Text>
                <View style={[
                    styles.statusBadge,
                    item.status === 'verified' ? styles.statusVerified : styles.statusPending
                ]}>
                    <Text style={[
                        styles.statusText,
                        item.status === 'verified' ? { color: COLORS.success } : { color: '#D97706' }
                    ]}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>
            </View>
            <TouchableOpacity onPress={() => playSound(item.audioURL)} style={styles.playBtn}>
                <Ionicons name="play-circle" size={32} color={COLORS.primaryLight} />
            </TouchableOpacity>
        </Card>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.profileInfo}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {user?.email?.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.email}>{user?.email}</Text>
                        <Text style={styles.joinDate}>Contributor</Text>
                    </View>
                </View>
                <Button
                    title="Sign Out"
                    onPress={signOut}
                    variant="ghost"
                    size="small"
                    style={{ paddingHorizontal: 0 }}
                />
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                    <Text style={styles.statValue}>{userData?.points || 0}</Text>
                    <Text style={styles.statLabel}>Points</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                    <Text style={styles.statValue}>{myEntries.length}</Text>
                    <Text style={styles.statLabel}>Words</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                    <Text style={styles.statValue}>{userData?.badges?.length || 0}</Text>
                    <Text style={styles.statLabel}>Badges</Text>
                </View>
            </View>

            <View style={styles.listSection}>
                <Text style={styles.sectionTitle}>My Contributions</Text>
                <FlatList
                    data={myEntries}
                    keyExtractor={(item) => item.id}
                    renderItem={renderEntry}
                    contentContainerStyle={styles.listContent}
                    refreshing={loading}
                    onRefresh={fetchMyContributions}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>You haven't contributed any words yet.</Text>
                    }
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    header: {
        padding: SPACING.l,
        backgroundColor: COLORS.surface,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.s,
    },
    profileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.m,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.surface,
    },
    email: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    joinDate: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        marginHorizontal: SPACING.m,
        borderRadius: LAYOUT.borderRadius.l,
        padding: SPACING.m,
        justifyContent: 'space-around',
        marginBottom: SPACING.m,
        ...(Platform.OS === 'ios' ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
        } : { elevation: 2 })
    },
    statBox: {
        alignItems: 'center',
        flex: 1,
    },
    statDivider: {
        width: 1,
        height: '80%',
        backgroundColor: COLORS.border,
        alignSelf: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 4,
    },
    listSection: {
        flex: 1,
        paddingHorizontal: SPACING.m,
    },
    sectionTitle: {
        ...TYPOGRAPHY.subheader,
        marginBottom: SPACING.m,
    },
    listContent: {
        paddingBottom: SPACING.l,
    },
    entryCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    entryContent: {
        flex: 1,
    },
    entryWord: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    entryDialect: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 2,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 6,
        backgroundColor: COLORS.inputBg,
    },
    statusVerified: {
        backgroundColor: '#ECFDF5', // Light green
    },
    statusPending: {
        backgroundColor: '#FFFBEB', // Light yellow
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    playBtn: {
        padding: SPACING.s,
    },
    emptyText: {
        textAlign: 'center',
        color: COLORS.textLight,
        marginTop: SPACING.xl,
        fontStyle: 'italic',
    }
});
