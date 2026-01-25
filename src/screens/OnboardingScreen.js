/**
 * OnboardingScreen - Main onboarding container
 * Swipeable animated introduction to Pamiri Bridge
 */
import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    ScrollView,
    Alert,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedScrollHandler,
    withTiming,
    withSpring,
    interpolate,
    Extrapolate,
    runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { usePreferences } from '../context/PreferencesContext';
import { LinearGradient } from 'expo-linear-gradient';

// Slide components
import WelcomeSlide from '../components/onboarding/WelcomeSlide';
import OriginsSlide from '../components/onboarding/OriginsSlide';
import MapSlide from '../components/onboarding/MapSlide';
import DialectSelectSlide from '../components/onboarding/DialectSelectSlide';
import UsernameSlide from '../components/onboarding/UsernameSlide';
import FeaturesSlide from '../components/onboarding/FeaturesSlide';
import ActionModal from '../components/ActionModal';

const { width, height } = Dimensions.get('window');
const SLIDE_COUNT = 6;

export default function OnboardingScreen({ navigation }) {
    const { colors, updatePrimaryDialect } = usePreferences();
    const scrollViewRef = useRef(null);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedDialect, setSelectedDialect] = useState('');
    const [username, setUsername] = useState('');
    const [isCompleting, setIsCompleting] = useState(false);

    const [isFooterVisible, setIsFooterVisible] = useState(true);

    // Animation values
    const buttonScale = useSharedValue(1);
    const footerTranslateY = useSharedValue(0);

    // Effect to animate footer when visibility changes
    React.useEffect(() => {
        footerTranslateY.value = withTiming(isFooterVisible ? 0 : 150, { duration: 300 });
    }, [isFooterVisible]);

    const scrollX = useSharedValue(0);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
            runOnJS(setCurrentIndex)(Math.round(event.contentOffset.x / width));
        },
    });

    const footerAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: footerTranslateY.value }],
        opacity: interpolate(footerTranslateY.value, [0, 150], [1, 0])
    }));

    const goToSlide = (index) => {
        scrollViewRef.current?.scrollTo({ x: index * width, animated: true });
    };

    const handleNext = () => {
        if (currentIndex < SLIDE_COUNT - 1) {
            goToSlide(currentIndex + 1);
        } else {
            handleComplete();
        }
    };

    const handleSkip = () => {
        goToSlide(3);
    };

    const [modal, setModal] = useState({
        visible: false,
        type: 'info',
        title: '',
        message: '',
        onAction: () => { },
    });

    const showModal = (config) => {
        setModal({ ...config, visible: true });
    };

    const hideModal = () => {
        setModal(prev => ({ ...prev, visible: false }));
    };

    const handleComplete = async () => {
        // Validate required fields
        if (!selectedDialect) {
            showModal({
                type: 'info',
                title: 'Select a Dialect',
                message: 'Please choose your preferred dialect before continuing.',
                onPrimaryAction: () => {
                    hideModal();
                    goToSlide(3);
                }
            });
            return;
        }

        if (username.length < 3) {
            showModal({
                type: 'info',
                title: 'Choose a Username',
                message: 'Please enter a username (minimum 3 characters).',
                onPrimaryAction: () => {
                    hideModal();
                    goToSlide(4);
                }
            });
            return;
        }

        setIsCompleting(true);

        try {
            await updatePrimaryDialect(selectedDialect);
            const user = auth.currentUser;
            if (user) {
                const userRef = doc(db, 'users', user.uid);
                await setDoc(userRef, {
                    displayName: username.trim(),
                    status: 'Pioneer',  // Default rank (will auto-upgrade to Guide at 10 verified entries)
                    onboardingComplete: true,
                }, { merge: true });
            }


            navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
            });
        } catch (error) {
            console.error('Error completing onboarding:', error);
            showModal({
                type: 'error',
                title: 'Error',
                message: 'Something went wrong. Please try again.',
                onPrimaryAction: hideModal
            });
        } finally {
            setIsCompleting(false);
        }
    };

    const canProceed = () => {
        if (currentIndex === 3 && !selectedDialect) return false;
        if (currentIndex === 4 && username.length < 3) return false;
        return true;
    };

    const getButtonText = () => {
        if (currentIndex === SLIDE_COUNT - 1) return 'Get Started';
        if (currentIndex === 3 && !selectedDialect) return 'Select a Dialect';
        if (currentIndex === 4 && username.length < 3) return 'Enter Username';
        return 'Continue';
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Skip button - Hide if footer is hidden */}
            {currentIndex < 3 && isFooterVisible && (
                <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                    <Text style={[styles.skipText, { color: colors.textLight }]}>Skip</Text>
                </TouchableOpacity>
            )}

            {/* Slides */}
            <Animated.ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                bounces={false}
                scrollEnabled={isFooterVisible} // Disable scrolling when detail is open
            >
                <WelcomeSlide isActive={currentIndex === 0} />
                <OriginsSlide isActive={currentIndex === 1} />
                <MapSlide
                    isActive={currentIndex === 2}
                    setNavigationVisibility={setIsFooterVisible}
                />
                <DialectSelectSlide
                    isActive={currentIndex === 3}
                    selectedDialect={selectedDialect}
                    onSelectDialect={setSelectedDialect}
                />
                <UsernameSlide
                    isActive={currentIndex === 4}
                    username={username}
                    onChangeUsername={setUsername}
                />
                <FeaturesSlide isActive={currentIndex === 5} />
            </Animated.ScrollView>

            {/* Footer */}
            <Animated.View style={[styles.footer, { borderTopColor: colors.border }, footerAnimatedStyle]}>
                {/* Animated Dot indicators */}
                <View style={styles.dotsContainer}>
                    {Array.from({ length: SLIDE_COUNT }).map((_, index) => {
                        return (
                            <PaginationDot
                                key={index}
                                index={index}
                                scrollX={scrollX}
                                colors={colors}
                                onPress={() => isFooterVisible && goToSlide(index)}
                            />
                        );
                    })}
                </View>

                {/* Next/Complete button */}
                <TouchableOpacity
                    style={[
                        styles.nextButton,
                        {
                            backgroundColor: canProceed() ? colors.primary : colors.border,
                            opacity: isCompleting ? 0.7 : 1,
                        }
                    ]}
                    onPress={handleNext}
                    disabled={isCompleting || !isFooterVisible}
                    activeOpacity={0.8}
                >
                    <Text style={styles.nextButtonText}>{getButtonText()}</Text>
                    {currentIndex < SLIDE_COUNT - 1 && (
                        <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                    )}
                </TouchableOpacity>
            </Animated.View>

            <ActionModal
                visible={modal.visible}
                type={modal.type}
                title={modal.title}
                message={modal.message}
                primaryActionLabel={modal.primaryActionLabel}
                onPrimaryAction={modal.onAction || modal.onPrimaryAction || hideModal}
                onDismiss={hideModal}
            />
        </View>
    );
}

// Separate Animation Component for performance
const PaginationDot = ({ index, scrollX, colors, onPress }) => {
    const animatedStyle = useAnimatedStyle(() => {
        const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
        ];

        const dotWidth = interpolate(
            scrollX.value,
            inputRange,
            [8, 24, 8],
            Extrapolate.CLAMP
        );

        const opacity = interpolate(
            scrollX.value,
            inputRange,
            [0.5, 1, 0.5],
            Extrapolate.CLAMP
        );

        return {
            width: dotWidth,
            opacity: opacity,
            backgroundColor: scrollX.value >= (index - 0.5) * width && scrollX.value < (index + 0.5) * width
                ? colors.primary
                : colors.border, // Fallback color logic
        };
    });

    // We use a simpler color interpolation in a real scenario, but reanimated color interpolation requires 
    // specific string formats. For simplicity/robustness, we'll rely on opacity and width primarily, 
    // or just let the active one be primary color via state if strict color morph is tricky without full setup.
    // However, to make it truly fluid, let's use the style override.

    // Better color interpolation approach:
    const colorStyle = useAnimatedStyle(() => {
        // Note: If colors are hex, this works out of box in newer Reanimated versions
        // If using variables, it might be tricky. Assuming colors.primary/border are hex strings.
        return {
            backgroundColor: index * width === 0 && scrollX.value === 0 ? colors.primary : colors.border // Basic init
            // Actual color interpolation is handled better by just opacity on the primary color OR 
            // having existing logic. For safety, let's stick to the width animation which is the main visual cue.
        }
    });


    return (
        <TouchableOpacity onPress={onPress} style={styles.dotTouchable}>
            <Animated.View
                style={[
                    styles.dot,
                    { backgroundColor: colors.primary }, // Base color, opacity handles the rest
                    animatedStyle,
                ]}
            />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    skipButton: {
        position: 'absolute',
        top: 60,
        right: 24,
        zIndex: 10,
        padding: 8,
    },
    skipText: {
        fontSize: 16,
        fontWeight: '500',
    },
    footer: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 40,
        borderTopWidth: 1,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    dotTouchable: {
        padding: 4,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
    },
    nextButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
});
