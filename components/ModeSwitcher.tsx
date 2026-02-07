// components/ModeSwitcher.tsx
// Premium animated switch for Estancias/Ventas mode - inspired by luxury design

import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

type PublishMode = 'estadia' | 'comprar';

interface ModeSwitcherProps {
    mode: PublishMode;
    onModeChange: (mode: PublishMode) => void;
    isDark: boolean;
    disabled?: boolean;
    estadiaLabel?: string;
    estadiaSubtitle?: string;
    comprarLabel?: string;
    comprarSubtitle?: string;
}

// Premium color palettes
const SwitchColors = {
    estancias: {
        gradient: ['#C9A65C', '#8B6914', '#5C4510'] as [string, string, string],
        text: '#FFFFFF',
        subtext: 'rgba(255,255,255,0.7)',
    },
    ventas: {
        gradient: ['#5A7A94', '#3D5A6F', '#1A3040'] as [string, string, string],
        text: '#FFFFFF',
        subtext: 'rgba(255,255,255,0.7)',
    },
    container: {
        background: '#1E3A5F',
        border: '#2A4A70',
    },
};

export function ModeSwitcher({
    mode,
    onModeChange,
    isDark,
    disabled = false,
    estadiaLabel = 'Estancias',
    estadiaSubtitle = '(corta y larga estancia)',
    comprarLabel = 'Ventas',
    comprarSubtitle = '(venta de inmuebles)',
}: ModeSwitcherProps) {
    const slideAnim = useRef(new Animated.Value(mode === 'estadia' ? 0 : 1)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const estanciaScale = useRef(new Animated.Value(mode === 'estadia' ? 1 : 0.95)).current;
    const ventaScale = useRef(new Animated.Value(mode === 'comprar' ? 1 : 0.95)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: mode === 'estadia' ? 0 : 1,
                useNativeDriver: true,
                tension: 60,
                friction: 10,
            }),
            Animated.spring(estanciaScale, {
                toValue: mode === 'estadia' ? 1 : 0.92,
                useNativeDriver: true,
                tension: 80,
                friction: 8,
            }),
            Animated.spring(ventaScale, {
                toValue: mode === 'comprar' ? 1 : 0.92,
                useNativeDriver: true,
                tension: 80,
                friction: 8,
            }),
        ]).start();
    }, [mode]);

    const handlePress = async (newMode: PublishMode) => {
        if (disabled || mode === newMode) return;

        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.98, duration: 80, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }),
        ]).start();

        if (Platform.OS !== 'web') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        onModeChange(newMode);
    };

    return (
        <Animated.View style={[styles.outerContainer, { transform: [{ scale: scaleAnim }] }]}>
            {/* Main container with gradient border effect */}
            <LinearGradient
                colors={['#3A5A7F', '#1E3A5F', '#0A1A2F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.containerGradient}
            >
                <View style={styles.innerContainer}>
                    {/* Estancias Button */}
                    <TouchableOpacity
                        style={styles.buttonWrapper}
                        onPress={() => handlePress('estadia')}
                        activeOpacity={0.9}
                        disabled={disabled}
                    >
                        <Animated.View style={[styles.button, { transform: [{ scale: estanciaScale }] }]}>
                            <LinearGradient
                                colors={mode === 'estadia' ? SwitchColors.estancias.gradient : ['#4A6080', '#3A5070', '#2A4060']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={[
                                    styles.buttonGradient,
                                    mode === 'estadia' && styles.activeButton,
                                ]}
                            >
                                <Text style={[
                                    styles.buttonTitle,
                                    { color: mode === 'estadia' ? SwitchColors.estancias.text : '#8A9AAA' }
                                ]}>
                                    {estadiaLabel}
                                </Text>
                                <Text style={[
                                    styles.buttonSubtitle,
                                    { color: mode === 'estadia' ? SwitchColors.estancias.subtext : '#5A6A7A' }
                                ]}>
                                    {estadiaSubtitle}
                                </Text>
                            </LinearGradient>
                        </Animated.View>
                    </TouchableOpacity>

                    {/* Ventas Button */}
                    <TouchableOpacity
                        style={styles.buttonWrapper}
                        onPress={() => handlePress('comprar')}
                        activeOpacity={0.9}
                        disabled={disabled}
                    >
                        <Animated.View style={[styles.button, { transform: [{ scale: ventaScale }] }]}>
                            <LinearGradient
                                colors={mode === 'comprar' ? SwitchColors.ventas.gradient : ['#4A6080', '#3A5070', '#2A4060']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={[
                                    styles.buttonGradient,
                                    mode === 'comprar' && styles.activeButton,
                                ]}
                            >
                                <Text style={[
                                    styles.buttonTitle,
                                    { color: mode === 'comprar' ? SwitchColors.ventas.text : '#8A9AAA' }
                                ]}>
                                    {comprarLabel}
                                </Text>
                                <Text style={[
                                    styles.buttonSubtitle,
                                    { color: mode === 'comprar' ? SwitchColors.ventas.subtext : '#5A6A7A' }
                                ]}>
                                    {comprarSubtitle}
                                </Text>
                            </LinearGradient>
                        </Animated.View>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        marginHorizontal: 16,
        marginVertical: 16,
    },
    containerGradient: {
        borderRadius: 28,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 12,
    },
    innerContainer: {
        flexDirection: 'row',
        borderRadius: 24,
        overflow: 'hidden',
        gap: 4,
    },
    buttonWrapper: {
        flex: 1,
    },
    button: {
        borderRadius: 22,
        overflow: 'hidden',
    },
    buttonGradient: {
        paddingVertical: 16,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 22,
    },
    activeButton: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    buttonTitle: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    buttonSubtitle: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 2,
        fontStyle: 'italic',
    },
});

export default ModeSwitcher;
