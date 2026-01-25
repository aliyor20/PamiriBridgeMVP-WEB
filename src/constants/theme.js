export const COLORS = {
    primary: '#4338ca', // Indigo 700
    primaryLight: '#818cf8', // Indigo 400
    secondary: '#06b6d4', // Cyan 500
    background: '#f8fafc', // Slate 50
    surface: '#ffffff',
    text: '#1e293b', // Slate 800
    textLight: '#64748b', // Slate 500
    success: '#10b981', // Emerald 500
    error: '#ef4444', // Red 500
    border: '#e2e8f0', // Slate 200
    inputBg: '#f1f5f9', // Slate 100
};

export const SPACING = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
};

export const TYPOGRAPHY = {
    header: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.text,
    },
    subheader: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.text,
    },
    body: {
        fontSize: 16,
        color: COLORS.text,
        lineHeight: 24,
    },
    caption: {
        fontSize: 12,
        color: COLORS.textLight,
    },
};

export const SHADOWS = {
    small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    large: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
};

export const LAYOUT = {
    borderRadius: {
        s: 8,
        m: 12,
        l: 16,
        xl: 24,
    }
};

export const THEMES = {
    paperLight: {
        id: 'paperLight',
        name: 'Light',
        colors: COLORS,
        dark: false,
        preview: ['#f8fafc', '#4338ca', '#06b6d4', '#1e293b'] // Custom preview colors
    },
    paperDark: {
        id: 'paperDark',
        name: 'Dark',
        colors: {
            ...COLORS,
            background: '#0f172a', // Slate 900
            surface: '#1e293b', // Slate 800
            text: '#f8fafc', // Slate 50
            textLight: '#94a3b8', // Slate 400
            border: '#334155', // Slate 700
            inputBg: '#1e293b', // Slate 800
        },
        dark: true,
        preview: ['#0f172a', '#4338ca', '#06b6d4', '#f8fafc']
    },
    pamiriRuby: {
        id: 'pamiriRuby',
        name: 'Ruby',
        colors: {
            ...COLORS,
            primary: '#e11d48', // Rose 600
            primaryLight: '#fb7185', // Rose 400
            secondary: '#be123c', // Rose 700
            background: '#fff1f2', // Rose 50
            surface: '#ffffff',
            text: '#881337', // Rose 900
            textLight: '#be123c', // Rose 700
            border: '#fecdd3', // Rose 200
            inputBg: '#ffe4e6', // Rose 100
        },
        dark: false,
        preview: ['#fff1f2', '#e11d48', '#be123c', '#881337']
    },
    pamiriEmerald: {
        id: 'pamiriEmerald',
        name: 'Emerald',
        colors: {
            ...COLORS,
            primary: '#059669', // Emerald 600
            primaryLight: '#34d399', // Emerald 400
            secondary: '#047857', // Emerald 700
            background: '#022c22', // Emerald 950
            surface: '#064e3b', // Emerald 900
            text: '#ecfdf5', // Emerald 50
            textLight: '#6ee7b7', // Emerald 300
            border: '#065f46', // Emerald 800
            inputBg: '#065f46', // Emerald 800
        },
        dark: true,
        preview: ['#022c22', '#059669', '#047857', '#ecfdf5']
    },
    midnightBlue: {
        id: 'midnightBlue',
        name: 'Midnight',
        colors: {
            ...COLORS,
            primary: '#6366f1', // Indigo 500
            primaryLight: '#818cf8', // Indigo 400
            secondary: '#4338ca', // Indigo 700
            background: '#0b0f19', // Deep Dark Blue
            surface: '#111827', // Gray 900
            text: '#e0e7ff', // Indigo 50
            textLight: '#a5b4fc', // Indigo 200
            border: '#1f2937', // Gray 800
            inputBg: '#1f2937', // Gray 800
        },
        dark: true,
        preview: ['#0b0f19', '#6366f1', '#4338ca', '#e0e7ff']
    },
    pamiriGold: {
        id: 'pamiriGold',
        name: 'Gold',
        colors: {
            ...COLORS,
            primary: '#d97706', // Amber 600
            primaryLight: '#fbbf24', // Amber 400
            secondary: '#b45309', // Amber 700
            background: '#fffbeb', // Amber 50
            surface: '#ffffff',
            text: '#78350f', // Amber 900
            textLight: '#b45309', // Amber 700
            border: '#fde68a', // Amber 200
            inputBg: '#fef3c7', // Amber 100
        },
        dark: false,
        preview: ['#fffbeb', '#d97706', '#b45309', '#78350f']
    },
    oledBlack: {
        id: 'oledBlack',
        name: 'OLED',
        colors: {
            ...COLORS,
            primary: '#f472b6', // Pink 400 (High Contrast)
            primaryLight: '#fbcfe8', // Pink 200
            secondary: '#22d3ee', // Cyan 400
            background: '#000000', // True Black
            surface: '#121212', // Material Dark Surface (to separate cards)
            text: '#ffffff', // White
            textLight: '#a3a3a3', // Neutral 400
            success: '#4ade80', // Green 400
            error: '#f87171', // Red 400
            border: '#262626', // Neutral 800
            inputBg: '#171717', // Neutral 900
        },
        dark: true,
        preview: ['#000000', '#f472b6', '#22d3ee', '#ffffff']
    }
};

export const DEFAULT_THEME_ID = 'paperLight';

export const getThemeById = (id) => THEMES[id] || THEMES[DEFAULT_THEME_ID];

export const getAvailableThemes = () => Object.values(THEMES);
