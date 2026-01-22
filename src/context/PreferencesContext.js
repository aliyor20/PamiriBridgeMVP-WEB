import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { THEMES, DEFAULT_THEME_ID, getThemeById } from '../constants/theme';

const PreferencesContext = createContext();

// AsyncStorage Keys (onboarding is now stored per-user in Firebase)
const STORAGE_KEYS = {
    PRIMARY_DIALECT: 'primaryDialect',
    SELECTED_THEME: 'selectedTheme',
};

export const PreferencesProvider = ({ children }) => {
    const systemScheme = useColorScheme();

    // Preferences State
    const [primaryDialect, setPrimaryDialect] = useState('All');
    const [selectedTheme, setSelectedTheme] = useState(DEFAULT_THEME_ID);
    const [loading, setLoading] = useState(true);

    // Load all preferences on mount
    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            const [
                storedDialect,
                storedTheme,
            ] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.PRIMARY_DIALECT),
                AsyncStorage.getItem(STORAGE_KEYS.SELECTED_THEME),
            ]);

            if (storedDialect) setPrimaryDialect(storedDialect);
            if (storedTheme && THEMES[storedTheme]) setSelectedTheme(storedTheme);
        } catch (e) {
            console.log("Failed to load preferences", e);
        } finally {
            setLoading(false);
        }
    };

    // Update functions with persistence
    const updatePrimaryDialect = async (dialect) => {
        setPrimaryDialect(dialect);
        await AsyncStorage.setItem(STORAGE_KEYS.PRIMARY_DIALECT, dialect);
    };

    const updateTheme = async (themeId) => {
        if (THEMES[themeId]) {
            setSelectedTheme(themeId);
            await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_THEME, themeId);
        }
    };

    // Get current theme object and its colors
    const currentTheme = useMemo(() => getThemeById(selectedTheme), [selectedTheme]);
    const colors = useMemo(() => currentTheme.colors, [currentTheme]);

    // Legacy support: activeTheme for light/dark mode
    const activeTheme = selectedTheme === 'paperLight' ? 'light' : 'dark';

    // Convenience: is dark mode?
    const isDarkMode = selectedTheme !== 'paperLight';

    return (
        <PreferencesContext.Provider value={{
            // Dialect
            primaryDialect,
            updatePrimaryDialect,

            // Theme
            selectedTheme,
            updateTheme,
            currentTheme,
            colors,
            activeTheme,
            isDarkMode,

            // Loading state
            loading,
        }}>
            {children}
        </PreferencesContext.Provider>
    );
};

export const usePreferences = () => {
    const context = useContext(PreferencesContext);
    if (!context) {
        throw new Error('usePreferences must be used within a PreferencesProvider');
    }
    return context;
};

