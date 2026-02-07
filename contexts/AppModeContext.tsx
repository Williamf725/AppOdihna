// contexts/AppModeContext.tsx
import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { Animated, Easing } from 'react-native';

// ================================
// TYPES
// ================================
export type AppMode = 'estadia' | 'comprar';

interface AppModeContextType {
    mode: AppMode;
    setMode: (mode: AppMode) => void;
    toggleMode: () => void;
    isAnimating: boolean;
    setIsAnimating: (value: boolean) => void;
    transitionProgress: Animated.Value;
    transitionPhase: 'idle' | 'transforming' | 'revealing';
    animationDuration: number;
}

// ================================
// LUXURY COLOR PALETTES
// ================================
export const ModeColors = {
    estadia: {
        accent: '#D4AF37',
        accentDark: '#AA8C2C',
        accentLight: '#F2D06B',
        gradient: ['#FFD700', '#D4AF37'] as [string, string],
        gradientDeep: ['#D4AF37', '#8B7355', '#2C2416'] as [string, string, string],
        cardShadow: 'rgba(212, 175, 55, 0.25)',
        headerTint: '#D4AF37',
        backgroundTint: 'rgba(212, 175, 55, 0.03)',
        glowColor: 'rgba(255, 215, 0, 0.4)',
    },
    comprar: {
        accent: '#6B7B8A',
        accentDark: '#3D4852',
        accentLight: '#9AABB8',
        secondary: '#4A5568',
        tertiary: '#2D3748',
        gradient: ['#9AABB8', '#4A5568'] as [string, string],
        gradientDeep: ['#A0AEC0', '#4A5568', '#1A202C'] as [string, string, string],
        cardShadow: 'rgba(74, 85, 104, 0.35)',
        headerTint: '#6B7B8A',
        backgroundTint: 'rgba(45, 55, 72, 0.08)',
        glowColor: 'rgba(154, 171, 184, 0.5)',
    },
} as const;

// ================================
// REFINED ANIMATION CONFIG
// ================================
export const TransitionConfig = {
    duration: 500,            // Smooth and quick
    filterStagger: 120,       // Noticeable but refined
    cardRevealDelay: 300,
    cardStagger: 100,
    easing: Easing.bezier(0.4, 0, 0.2, 1), // Material Design ease
    elegantEase: Easing.bezier(0.25, 0.46, 0.45, 0.94), // Premium ease
} as const;

// ================================
// CONTEXT
// ================================
const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

interface AppModeProviderProps {
    children: ReactNode;
}

export function AppModeProvider({ children }: AppModeProviderProps) {
    const [mode, setModeState] = useState<AppMode>('estadia');
    const [isAnimating, setIsAnimating] = useState(false);
    const [transitionPhase, setTransitionPhase] = useState<'idle' | 'transforming' | 'revealing'>('idle');
    const transitionProgress = React.useRef(new Animated.Value(0)).current;

    const setMode = useCallback((newMode: AppMode) => {
        if (newMode !== mode && !isAnimating) {
            setModeState(newMode);
            setIsAnimating(true);
            setTransitionPhase('revealing');

            Animated.timing(transitionProgress, {
                toValue: 1,
                duration: TransitionConfig.duration,
                easing: TransitionConfig.easing,
                useNativeDriver: false,
            }).start(() => {
                transitionProgress.setValue(0);
                setTransitionPhase('idle');
                setIsAnimating(false);
            });
        }
    }, [mode, isAnimating, transitionProgress]);

    const toggleMode = useCallback(() => {
        setMode(mode === 'estadia' ? 'comprar' : 'estadia');
    }, [mode, setMode]);

    return (
        <AppModeContext.Provider
            value={{
                mode,
                setMode,
                toggleMode,
                isAnimating,
                setIsAnimating,
                transitionProgress,
                transitionPhase,
                animationDuration: TransitionConfig.duration,
            }}
        >
            {children}
        </AppModeContext.Provider>
    );
}

export function useAppModeContext() {
    const context = useContext(AppModeContext);
    if (context === undefined) {
        throw new Error('useAppModeContext must be used within an AppModeProvider');
    }
    return context;
}

export default AppModeContext;
