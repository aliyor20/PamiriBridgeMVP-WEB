import { LayoutAnimation } from 'react-native';

export const DURATION_SHORT = 150;
export const DURATION_MEDIUM = 200;
export const DURATION_LONG = 300;

export const LAYOUT_ANIMATION_CONFIG = {
    duration: DURATION_MEDIUM,
    create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
    },
    update: {
        type: LayoutAnimation.Types.easeInEaseOut,
    },
    delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
    },
};
