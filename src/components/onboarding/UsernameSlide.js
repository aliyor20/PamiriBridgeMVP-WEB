/**
 * UsernameSlide - Fifth onboarding screen
 * Username input with animated placeholder and keyboard handling
 */
import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { usePreferences } from '../../context/PreferencesContext';

const { width } = Dimensions.get('window');
const MAX_LENGTH = 20;
const MIN_LENGTH = 3;

export default function UsernameSlide({ isActive, username, onChangeUsername }) {
    const { colors } = usePreferences();
    const inputRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);

    const headerOpacity = useSharedValue(0);
    const headerTranslateY = useSharedValue(20);
    const inputOpacity = useSharedValue(0);
    const inputTranslateY = useSharedValue(30);
    const labelTranslateY = useSharedValue(0);
    const labelScale = useSharedValue(1);

    const isValidLength = username.length >= MIN_LENGTH && username.length <= MAX_LENGTH;
    const showError = username.length > 0 && username.length < MIN_LENGTH;

    useEffect(() => {
        if (isActive) {
            headerOpacity.value = 0;
            headerTranslateY.value = 20;
            inputOpacity.value = 0;
            inputTranslateY.value = 30;

            headerOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
            headerTranslateY.value = withDelay(200, withSpring(0));

            inputOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));
            inputTranslateY.value = withDelay(400, withSpring(0));
        }
    }, [isActive]);

    useEffect(() => {
        // Animate label when focused or has content
        const shouldFloat = isFocused || username.length > 0;
        labelTranslateY.value = withTiming(shouldFloat ? -28 : 0, { duration: 200 });
        labelScale.value = withTiming(shouldFloat ? 0.85 : 1, { duration: 200 });
    }, [isFocused, username]);

    const headerStyle = useAnimatedStyle(() => ({
        opacity: headerOpacity.value,
        transform: [{ translateY: headerTranslateY.value }],
    }));

    const inputContainerStyle = useAnimatedStyle(() => ({
        opacity: inputOpacity.value,
        transform: [{ translateY: inputTranslateY.value }],
    }));

    const labelStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: labelTranslateY.value },
            { scale: labelScale.value },
        ],
    }));

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={100}
        >
            <View style={styles.content}>
                <Animated.View style={[styles.header, headerStyle]}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                        <Ionicons name="person" size={32} color={colors.primary} />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>What should we call you?</Text>
                    <Text style={[styles.subtitle, { color: colors.textLight }]}>
                        Pick a display name for the community
                    </Text>
                </Animated.View>

                <Animated.View style={[styles.inputWrapper, inputContainerStyle]}>
                    <View
                        style={[
                            styles.inputContainer,
                            {
                                backgroundColor: colors.inputBg,
                                borderColor: showError ? colors.error : isFocused ? colors.primary : colors.border,
                            }
                        ]}
                    >
                        <Animated.Text
                            style={[
                                styles.floatingLabel,
                                { color: isFocused ? colors.primary : colors.textLight },
                                labelStyle
                            ]}
                        >
                            Username
                        </Animated.Text>

                        <TextInput
                            ref={inputRef}
                            style={[styles.input, { color: colors.text }]}
                            value={username}
                            onChangeText={onChangeUsername}
                            maxLength={MAX_LENGTH}
                            autoCapitalize="none"
                            autoCorrect={false}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholderTextColor={colors.textLight}
                        />

                        {username.length > 0 && (
                            <TouchableOpacity
                                style={styles.clearButton}
                                onPress={() => onChangeUsername('')}
                            >
                                <Ionicons name="close-circle" size={20} color={colors.textLight} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.inputFooter}>
                        <Text style={[
                            styles.charCount,
                            { color: showError ? colors.error : colors.textLight }
                        ]}>
                            {showError ? `Minimum ${MIN_LENGTH} characters` : `${username.length}/${MAX_LENGTH}`}
                        </Text>

                        {isValidLength && (
                            <View style={styles.validIndicator}>
                                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                                <Text style={[styles.validText, { color: colors.success }]}>Looks good!</Text>
                            </View>
                        )}
                    </View>
                </Animated.View>

                <View style={styles.suggestions}>
                    <Text style={[styles.suggestionsTitle, { color: colors.textLight }]}>Suggestions:</Text>
                    <View style={styles.suggestionChips}>
                        {['PamiriPride', 'MountainVoice', 'BartangSon'].map((suggestion) => (
                            <TouchableOpacity
                                key={suggestion}
                                style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                onPress={() => onChangeUsername(suggestion)}
                            >
                                <Text style={[styles.chipText, { color: colors.text }]}>{suggestion}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: width,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
    },
    inputWrapper: {
        marginBottom: 24,
    },
    inputContainer: {
        borderWidth: 2,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    floatingLabel: {
        position: 'absolute',
        left: 16,
        top: 18,
        fontSize: 16,
    },
    input: {
        flex: 1,
        fontSize: 18,
        fontWeight: '500',
        padding: 0,
    },
    clearButton: {
        padding: 4,
    },
    inputFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        paddingHorizontal: 4,
    },
    charCount: {
        fontSize: 12,
    },
    validIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    validText: {
        fontSize: 12,
        marginLeft: 4,
    },
    suggestions: {
        marginTop: 8,
    },
    suggestionsTitle: {
        fontSize: 13,
        marginBottom: 12,
    },
    suggestionChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 14,
    },
});
