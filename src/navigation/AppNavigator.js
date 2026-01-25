import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Platform, Text, Animated } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { usePreferences } from '../context/PreferencesContext';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

// Screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import AddWordScreen from '../screens/AddWordScreen';
import ProfileScreen from '../screens/ProfileScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import SettingsScreen from '../screens/SettingsScreen';

import OnboardingScreen from '../screens/OnboardingScreen';

import { ContributeProvider, useContribute } from '../context/ContributeContext';

const Tab = createMaterialTopTabNavigator();
const Stack = createStackNavigator();

// Custom Icon for Contribute Tab
const ContributeTabIcon = ({ color, focused }) => {
    const { mode } = useContribute();
    const { colors } = usePreferences();

    // Animation Value: 0 = Contribute, 1 = Verify
    const anim = useRef(new Animated.Value(mode === 'contribute' ? 0 : 1)).current;

    useEffect(() => {
        Animated.spring(anim, {
            toValue: mode === 'contribute' ? 0 : 1,
            useNativeDriver: true,
            friction: 6,
            tension: 50
        }).start();
    }, [mode]);

    // Interpolations
    const scaleCont = anim.interpolate({ inputRange: [0, 1], outputRange: [1.3, 0.8] });
    const opacCont = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] });
    // When Active (0), X=0. When Inactive (1), X=-16 (shift left)
    const transCont = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });

    const scaleVer = anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.3] });
    const opacVer = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
    // When Inactive (0), X=16 (shift right). When Active (1), X=0
    const transVer = anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

    const zIndexCont = mode === 'contribute' ? 10 : 1;
    const zIndexVer = mode === 'verify' ? 10 : 1;

    return (
        <View style={{ width: 60, height: 30, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={{
                position: 'absolute',
                transform: [{ scale: scaleCont }, { translateX: transCont }],
                opacity: opacCont,
                zIndex: zIndexCont
            }}>
                <Ionicons
                    name="add-circle"
                    size={22}
                    color={mode === 'contribute' ? colors.primary : colors.textLight}
                />
            </Animated.View>
            <Animated.View style={{
                position: 'absolute',
                transform: [{ scale: scaleVer }, { translateX: transVer }],
                opacity: opacVer,
                zIndex: zIndexVer
            }}>
                <Ionicons
                    name="shield-checkmark"
                    size={22}
                    color={mode === 'verify' ? colors.primary : colors.textLight}
                />
            </Animated.View>
        </View>
    );
};

// Custom Label for Contribute Tab
const ContributeTabLabel = ({ color, focused }) => {
    const { mode } = useContribute();
    return (
        <Text style={{
            fontSize: 10,
            fontWeight: '600',
            textTransform: 'capitalize',
            color: color
        }}>
            {mode === 'contribute' ? 'Contribute' : 'Verify'}
        </Text>
    );
};

function AppTabs() {
    const { colors } = usePreferences();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <Tab.Navigator
                tabBarPosition="bottom"
                screenOptions={({ route }) => ({
                    tabBarActiveTintColor: colors.primary,
                    tabBarInactiveTintColor: colors.textLight,
                    tabBarIndicatorStyle: { backgroundColor: colors.primary },
                    tabBarStyle: { backgroundColor: colors.surface },
                    tabBarLabelStyle: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
                    tabBarIcon: ({ color, focused }) => {
                        let iconName;
                        if (route.name === 'Dictionary') iconName = 'book';
                        else if (route.name === 'Statistics') iconName = 'stats-chart';
                        else if (route.name === 'Profile') iconName = 'person';

                        if (route.name === 'Contribute') {
                            return <ContributeTabIcon color={color} focused={focused} />;
                        }
                        return <Ionicons name={iconName} size={24} color={color} />;
                    },
                    swipeEnabled: true,
                })}
            >
                <Tab.Screen name="Dictionary" component={HomeScreen} />
                <Tab.Screen
                    name="Contribute"
                    component={AddWordScreen}
                    options={{
                        tabBarLabel: ({ color, focused }) => <ContributeTabLabel color={color} focused={focused} />
                    }}
                />
                <Tab.Screen name="Statistics" component={StatisticsScreen} />
                <Tab.Screen name="Profile" component={ProfileScreen} />
            </Tab.Navigator>
        </SafeAreaView>
    );
}

export default function AppNavigator() {
    const { colors } = usePreferences();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [checkingOnboarding, setCheckingOnboarding] = useState(true);

    useEffect(() => {
        let userUnsubscribe;

        const authUnsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                // Subscribe to user document to check onboarding status
                setCheckingOnboarding(true);
                const userRef = doc(db, 'users', currentUser.uid);

                userUnsubscribe = onSnapshot(userRef, (docSnap) => {
                    if (docSnap.exists() && docSnap.data().onboardingComplete) {
                        setShowOnboarding(false);
                    } else {
                        setShowOnboarding(true);
                    }
                    setCheckingOnboarding(false);
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching user data:", error);
                    setShowOnboarding(false);
                    setCheckingOnboarding(false);
                    setLoading(false);
                });
            } else {
                if (userUnsubscribe) {
                    userUnsubscribe();
                    userUnsubscribe = null;
                }
                setShowOnboarding(false);
                setCheckingOnboarding(false);
                setLoading(false);
            }
        });

        return () => {
            authUnsubscribe();
            if (userUnsubscribe) userUnsubscribe();
        };
    }, []);

    if (loading || (user && checkingOnboarding)) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <ContributeProvider>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {user ? (
                    <>
                        {showOnboarding && (
                            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                        )}
                        <Stack.Screen name="Main" component={AppTabs} />
                        <Stack.Screen name="Settings" component={SettingsScreen} />
                    </>
                ) : (
                    <Stack.Screen name="Login" component={LoginScreen} />
                )}
            </Stack.Navigator>
        </ContributeProvider>
    );
}
