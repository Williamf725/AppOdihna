// hooks/useAppMode.ts
import { AppMode, ModeColors, TransitionConfig, useAppModeContext } from '../contexts/AppModeContext';

/**
 * Hook to access app mode state and utilities.
 * Provides current mode, toggle function, mode-specific colors, and transition states.
 */
export function useAppMode() {
    const {
        mode,
        setMode,
        toggleMode,
        isAnimating,
        transitionProgress,
        transitionPhase,
        animationDuration,
    } = useAppModeContext();

    // Get colors for current mode
    const modeColors = ModeColors[mode];
    const oppositeColors = ModeColors[mode === 'estadia' ? 'comprar' : 'estadia'];

    return {
        mode,
        setMode,
        toggleMode,
        isAnimating,
        modeColors,
        oppositeColors,
        isEstadia: mode === 'estadia',
        isComprar: mode === 'comprar',
        // Transition state
        transitionProgress,
        transitionPhase,
        animationDuration,
        // Animation config
        transitionConfig: TransitionConfig,
    };
}

export { ModeColors, TransitionConfig };
export type { AppMode };

