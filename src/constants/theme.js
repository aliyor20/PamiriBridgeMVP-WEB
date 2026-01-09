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
