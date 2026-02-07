// components/ModeSwitch.tsx
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { ModeColors, useAppMode } from '../hooks/useAppMode';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWITCH_WIDTH = Math.min(200, SCREEN_WIDTH * 0.5);
const SWITCH_HEIGHT = 36;
const INDICATOR_PADDING = 3;
const INDICATOR_WIDTH = (SWITCH_WIDTH - INDICATOR_PADDING * 2) / 2;

interface ModeSwitchProps {
    isDark?: boolean;
}

export function ModeSwitch({ isDark = false }: ModeSwitchProps) {
    const { mode, toggleMode, isAnimating } = useAppMode();

    // Animation values
    const translateX = useRef(new Animated.Value(mode === 'estadia' ? 0 : INDICATOR_WIDTH)).current;
    const colorProgress = useRef(new Animated.Value(mode === 'estadia' ? 0 : 1)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Animate indicator position
        Animated.parallel([
            Animated.spring(translateX, {
                toValue: mode === 'estadia' ? 0 : INDICATOR_WIDTH,
                useNativeDriver: true,
                friction: 8,
                tension: 50,
            }),
            Animated.timing(colorProgress, {
                toValue: mode === 'estadia' ? 0 : 1,
                duration: 300,
                useNativeDriver: false,
            }),
        ]).start();
    }, [mode]);

    const handlePress = async () => {
        if (isAnimating) return;

        // Haptic feedback
        if (Platform.OS !== 'web') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        // Scale bounce animation
        Animated.sequence([
            Animated.spring(scaleAnim, {
                toValue: 0.95,
                useNativeDriver: true,
                friction: 8,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                friction: 5,
            }),
        ]).start();

        toggleMode();
    };

    // Interpolate colors based on mode
    const bgColor = colorProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [
            isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.12)',
            isDark ? 'rgba(142, 142, 147, 0.15)' : 'rgba(142, 142, 147, 0.12)',
        ],
    });

    const estadiaColor = colorProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [
            '#FFFFFF',
            isDark ? '#888' : '#666',
        ],
    });

    const comprarColor = colorProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [
            isDark ? '#888' : '#666',
            '#FFFFFF',
        ],
    });

    const currentColors = mode === 'estadia' ? ModeColors.estadia : ModeColors.comprar;

    return (
        <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={handlePress}
                disabled={isAnimating}
            >
                <Animated.View style={[styles.track, { backgroundColor: bgColor }]}>
                    {/* Animated indicator */}
                    <Animated.View
                        style={[
                            styles.indicatorWrapper,
                            { transform: [{ translateX }] },
                        ]}
                    >
                        <LinearGradient
                            colors={currentColors.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.indicator}
                        />
                    </Animated.View>

                    {/* Labels */}
                    <View style={styles.labelsContainer}>
                        <View style={styles.labelWrapper}>
                            <Animated.Text style={[styles.label, { color: estadiaColor }]}>
                                Estadía
                            </Animated.Text>
                        </View>
                        <View style={styles.labelWrapper}>
                            <Animated.Text style={[styles.label, { color: comprarColor }]}>
                                Comprar
                            </Animated.Text>
                        </View>
                    </View>
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    track: {
        width: SWITCH_WIDTH,
        height: SWITCH_HEIGHT,
        borderRadius: SWITCH_HEIGHT / 2,
        flexDirection: 'row',
        alignItems: 'center',
        padding: INDICATOR_PADDING,
        position: 'relative',
    },
    indicatorWrapper: {
        position: 'absolute',
        left: INDICATOR_PADDING,
        top: INDICATOR_PADDING,
        width: INDICATOR_WIDTH,
        height: SWITCH_HEIGHT - INDICATOR_PADDING * 2,
    },
    indicator: {
        width: '100%',
        height: '100%',
        borderRadius: (SWITCH_HEIGHT - INDICATOR_PADDING * 2) / 2,
    },
    labelsContainer: {
        flexDirection: 'row',
        flex: 1,
        zIndex: 1,
    },
    labelWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
});

export default ModeSwitch;
