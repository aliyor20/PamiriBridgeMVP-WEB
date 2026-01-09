import React, { useState, useEffect } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Text,
    TouchableOpacity,
    SafeAreaView
} from 'react-native';
import { db } from '../firebaseConfig';
import { collection, query, where, orderBy, startAt, endAt, getDocs, limit } from 'firebase/firestore';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

import Input from '../components/Input';
import Card from '../components/Card';
import DialectChip from '../components/DialectChip';

const DIALECTS = ["All", "Shughni", "Rushani", "Wakhi", "Yazghulami", "Sarikoli", "Bartangi", "Ishkashimi"];

export default function HomeScreen() {
    const [searchText, setSearchText] = useState('');
    const [selectedDialect, setSelectedDialect] = useState('All');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sound, setSound] = useState(null);

    useEffect(() => {
        searchWords();
        return () => {
            if (sound) sound.unloadAsync();
        };
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            searchWords();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchText, selectedDialect]);

    async function playSound(audioURL) {
        if (!audioURL) {
            Alert.alert("No Audio", "This entry does not have an audio recording.");
            return;
        }
        try {
            if (sound) await sound.unloadAsync();
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: audioURL },
                { shouldPlay: true }
            );
            setSound(newSound);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Could not play audio.");
        }
    }

    const searchWords = async () => {
        setLoading(true);
        try {
            const entriesRef = collection(db, 'entries');
            let q;
            const term = searchText.trim().toLowerCase();

            if (term.length > 0) {
                if (selectedDialect !== 'All') {
                    q = query(
                        entriesRef,
                        where('dialect', '==', selectedDialect),
                        where('status', '==', 'verified'),
                        orderBy('word'),
                        startAt(term),
                        endAt(term + '\uf8ff'),
                        limit(20)
                    );
                } else {
                    q = query(
                        entriesRef,
                        where('status', '==', 'verified'),
                        orderBy('word'),
                        startAt(term),
                        endAt(term + '\uf8ff'),
                        limit(20)
                    );
                }
            } else {
                if (selectedDialect !== 'All') {
                    q = query(
                        entriesRef,
                        where('dialect', '==', selectedDialect),
                        where('status', '==', 'verified'),
                        limit(20)
                    );
                } else {
                    q = query(
                        entriesRef,
                        where('status', '==', 'verified'),
                        limit(20)
                    );
                }
            }

            const querySnapshot = await getDocs(q);
            const foundDocs = [];
            querySnapshot.forEach((doc) => {
                foundDocs.push({ id: doc.id, ...doc.data() });
            });
            setResults(foundDocs);

        } catch (error) {
            console.log("Search error", error);
            // Silent fail or toast in actual prod app
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }) => (
        <Card style={styles.cardItem}>
            <View style={styles.cardContent}>
                <Text style={styles.wordText}>{item.word}</Text>
                {item.meaning ? <Text style={styles.meaningText}>{item.meaning}</Text> : null}
                <View style={styles.dialectBadge}>
                    <Text style={styles.dialectText}>{item.dialect}</Text>
                </View>
            </View>
            <TouchableOpacity
                style={styles.playButton}
                onPress={() => playSound(item.audioURL)}
            >
                <Ionicons name="volume-high" size={20} color={COLORS.primary} />
            </TouchableOpacity>
        </Card>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Input
                    placeholder="Search words..."
                    value={searchText}
                    onChangeText={setSearchText}
                    style={{ marginBottom: 0 }}
                    rightIcon={
                        <Ionicons name="search" size={20} color={COLORS.textLight} />
                    }
                />
            </View>

            <View style={styles.filterContainer}>
                <FlatList
                    horizontal
                    data={DIALECTS}
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                        <DialectChip
                            label={item}
                            selected={selectedDialect === item}
                            onPress={() => setSelectedDialect(item)}
                        />
                    )}
                    contentContainerStyle={styles.filterList}
                />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.resultsList}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="book-outline" size={48} color={COLORS.border} />
                            <Text style={styles.emptyText}>
                                {searchText ? "No words found." : "Start searching or select a dialect."}
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        padding: SPACING.m,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    filterContainer: {
        paddingVertical: SPACING.m,
        backgroundColor: COLORS.background,
    },
    filterList: {
        paddingHorizontal: SPACING.m,
    },
    resultsList: {
        padding: SPACING.m,
    },
    cardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.m,
    },
    cardContent: {
        flex: 1,
    },
    wordText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    meaningText: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 8,
    },
    dialectBadge: {
        backgroundColor: COLORS.inputBg,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    dialectText: {
        fontSize: 12,
        color: COLORS.text,
        fontWeight: '500',
    },
    playButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.inputBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: SPACING.xxl,
    },
    emptyText: {
        marginTop: SPACING.m,
        color: COLORS.textLight,
        fontSize: 16,
    }
});
