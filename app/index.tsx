// app/index.tsx
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useRootNavigationState } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../components/ThemedText';
import { useAuth } from '../hooks/useAuth';
import { normalize, normalizeFont, normalizeFontLogo } from '../lib/normalize';

const IMAGES = [
  // Luxury villa interior with pool view - vertical
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=1800&q=90&fit=crop',
  // Modern luxury bedroom suite - vertical
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&h=1800&q=90&fit=crop',
  // Stunning infinity pool at sunset - vertical
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&h=1800&q=90&fit=crop',
  // Elegant living room with panoramic view - vertical
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&h=1800&q=90&fit=crop',
];

// Color principal - Champagne elegante
const ACCENT_COLOR = '#C9B896';
const ACCENT_DARK = '#A69372';

export default function WelcomeScreen() {
  const { user, loading } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [firstImageLoaded, setFirstImageLoaded] = useState(false);

  // Animaciones principales - fadeAnim starts at 1 for immediate full opacity
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(1)).current;

  // Animaciones de partículas/brillo
  const shimmer1 = useRef(new Animated.Value(0)).current;
  const shimmer2 = useRef(new Animated.Value(0)).current;
  const shimmer3 = useRef(new Animated.Value(0)).current;

  // Animación del logo
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  // Animación del botón pulsante
  const buttonPulse = useRef(new Animated.Value(1)).current;

  // Animación de los botones
  const buttonSlide1 = useRef(new Animated.Value(100)).current;
  const buttonSlide2 = useRef(new Animated.Value(100)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  // Animación del divider
  const dividerWidth = useRef(new Animated.Value(0)).current;

  // ✅ Verificar si el navegador está listo
  const rootNavigationState = useRootNavigationState();
  const navigatorReady = rootNavigationState?.key != null;

  // ✅ Redirección automática si el usuario ya tiene sesión activa
  useEffect(() => {
    if (!loading && user && navigatorReady && !hasRedirected) {
      setHasRedirected(true);
      router.replace('/(tabs)');
    }
  }, [loading, user, navigatorReady, hasRedirected]);

  // ✅ Preload first background image
  useEffect(() => {
    Image.prefetch(IMAGES[0]).then(() => {
      setFirstImageLoaded(true);
    }).catch(() => {
      // Even if prefetch fails, allow the app to continue
      setFirstImageLoaded(true);
    });
  }, []);

  // Animaciones de entrada secuenciales - wait for first image
  useEffect(() => {
    if (!firstImageLoaded) return; // Wait for first image to load

    // Secuencia de animaciones de entrada
    Animated.sequence([
      // Logo aparece con escala y rotación (imagen ya visible)
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),
      // Divider se expande
      Animated.timing(dividerWidth, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      // Contenido principal aparece
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      // Botones aparecen uno a uno
      Animated.stagger(120, [
        Animated.parallel([
          Animated.timing(buttonSlide1, {
            toValue: 0,
            duration: 350,
            easing: Easing.out(Easing.back(1.2)),
            useNativeDriver: true,
          }),
          Animated.timing(buttonOpacity, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(buttonSlide2, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Animación continua del botón (pulso sutil)
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonPulse, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(buttonPulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animación de zoom suave en la imagen de fondo
    Animated.loop(
      Animated.sequence([
        Animated.timing(imageScale, {
          toValue: 1.1,
          duration: 8000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(imageScale, {
          toValue: 1,
          duration: 8000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animaciones de shimmer/partículas brillantes
    const createShimmerAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 3000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 3000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
    };

    createShimmerAnimation(shimmer1, 0).start();
    createShimmerAnimation(shimmer2, 1000).start();
    createShimmerAnimation(shimmer3, 2000).start();

    // Cambio de imagen con transición
    // Primera imagen transiciona rápido (500ms), luego intervalo normal (5s)
    const firstTimeout = setTimeout(() => {
      setCurrentImageIndex(1); // Cambiar a segunda imagen rápidamente
    }, 500);

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % IMAGES.length);
    }, 5000);

    return () => {
      clearTimeout(firstTimeout);
      clearInterval(interval);
    };
  }, [firstImageLoaded]);

  const handleGetStarted = () => {
    router.push('/auth/register');
  };

  const handleLogin = () => {
    router.push('/auth/login');
  };

  if (loading || !firstImageLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={[styles.loadingLogo, { opacity: 0.65 }]}>
          <Image
            source={{ uri: 'https://res.cloudinary.com/dvpnkr2i9/image/upload/v1770446460/LogoOdihna_thsha2.jpg' }}
            style={{ width: normalize(64), height: normalize(64), borderRadius: normalize(32) }}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </Animated.View>
        <ActivityIndicator size="large" color={ACCENT_COLOR} style={{ marginTop: normalize(20) }} />
      </View>
    );
  }

  const logoRotateInterpolate = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10deg', '0deg'],
  });

  return (
    <View style={styles.container}>
      {/* Imagen de fondo con animación de zoom - usa estilos con porcentajes */}
      <Animated.View
        style={[
          styles.imageContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: imageScale }],
          },
        ]}
      >
        <Image
          source={{ uri: IMAGES[currentImageIndex] }}
          style={styles.backgroundImage}
          contentFit="cover"
          transition={currentImageIndex === 0 ? 0 : 800}
          priority="high"
          cachePolicy="memory-disk"
          placeholder={null}
          placeholderContentFit="cover"
        />
      </Animated.View>

      {/* Partículas brillantes / shimmer effect - posicionamiento con porcentajes */}
      <Animated.View
        style={[
          styles.shimmerParticle,
          styles.shimmerParticle1,
          {
            opacity: shimmer1,
            transform: [{
              translateY: shimmer1.interpolate({
                inputRange: [0, 1],
                outputRange: [0, normalize(-30)],
              }),
            }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.shimmerParticle,
          styles.shimmerParticle2,
          {
            opacity: shimmer2,
            transform: [{
              translateY: shimmer2.interpolate({
                inputRange: [0, 1],
                outputRange: [0, normalize(-40)],
              }),
            }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.shimmerParticle,
          styles.shimmerParticle3,
          {
            opacity: shimmer3,
            transform: [{
              translateY: shimmer3.interpolate({
                inputRange: [0, 1],
                outputRange: [0, normalize(-25)],
              }),
            }],
          },
        ]}
      />

      {/* Gradiente muy sutil solo en la parte inferior para legibilidad del texto */}
      <LinearGradient
        colors={['transparent', 'transparent', 'rgba(0,0,0,0.5)']}
        locations={[0, 0.5, 1]}
        style={styles.overlay}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <Animated.View
            style={[
              styles.content,
              {
                opacity: slideAnim,
                transform: [{
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [normalize(30), 0],
                  }),
                }],
              },
            ]}
          >
            {/* Header con logo animado */}
            <View style={styles.header}>
              <Animated.View
                style={[
                  styles.logoContainer,
                  {
                    opacity: 0.9, // 90% opacidad como solicitado
                    transform: [
                      { scale: logoScale },
                      { rotate: logoRotateInterpolate },
                    ],
                  },
                ]}
              >
                <Image
                  source={{ uri: 'https://res.cloudinary.com/dvpnkr2i9/image/upload/v1770446460/LogoOdihna_thsha2.jpg' }}
                  style={{ width: normalize(88), height: normalize(88), borderRadius: normalize(44) }} // Redondo
                  contentFit="cover"
                />
              </Animated.View>

              <Animated.View style={{ opacity: logoScale }}>
                <ThemedText style={styles.logoText}>
                  ODIHNA
                </ThemedText>
              </Animated.View>

              <Animated.View style={{ opacity: logoScale }}>
                <ThemedText style={styles.subtitle}>
                  ESTANCIAS & VENTAS
                </ThemedText>
              </Animated.View>

              <Animated.View
                style={[
                  styles.divider,
                  {
                    width: dividerWidth.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, normalize(50)],
                    }),
                  },
                ]}
              />

              <Animated.View
                style={{
                  opacity: slideAnim,
                  transform: [{
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [normalize(20), 0],
                    }),
                  }],
                }}
              >
                <ThemedText style={styles.taglineMain}>
                  Experiencias
                </ThemedText>
              </Animated.View>

              <Animated.View
                style={{
                  opacity: slideAnim,
                  transform: [{
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [normalize(20), 0],
                    }),
                  }],
                }}
              >
                <ThemedText style={styles.taglineAccent}>
                  Sin Límites
                </ThemedText>
              </Animated.View>
            </View>

            {/* Indicadores de imagen */}
            <View style={styles.indicators}>
              {IMAGES.map((_, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.indicator,
                    currentImageIndex === index && styles.indicatorActive,
                  ]}
                />
              ))}
            </View>

            {/* Botones con animaciones */}
            <View style={styles.buttonsContainer}>
              <Animated.View
                style={{
                  opacity: buttonOpacity,
                  transform: [{ translateY: buttonSlide1 }, { scale: buttonPulse }],
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleGetStarted}
                  style={styles.marbleButtonContainer}
                >
                  <Animated.View style={styles.marbleButtonShadow}>
                    {/* Marco de oro macizo */}
                    <LinearGradient
                      colors={['#BF953F', '#FCF6BA', '#B38728', '#FBF5B7', '#AA771C']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.goldBorder}
                    >
                      {/* Cuerpo de mármol */}
                      <View style={styles.marbleInner}>
                        <Image
                          source={{ uri: 'https://images.unsplash.com/photo-1618218168350-6e7c8115209c?q=80&w=800&auto=format&fit=crop' }} // Mármol con vetas doradas
                          style={styles.marbleTexture}
                          contentFit="cover"
                        />

                        {/* Efecto de barrido de luz (Light Sweep) */}
                        <Animated.View
                          style={[
                            styles.lightSweep,
                            {
                              transform: [{
                                translateX: shimmer1.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [normalize(-300), normalize(300)],
                                }),
                              }],
                            },
                          ]}
                        >
                          <LinearGradient
                            colors={['transparent', 'rgba(255, 255, 255, 0.8)', 'transparent']}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            style={{ flex: 1 }}
                          />
                        </Animated.View>

                        {/* Texto Tipografía dorada elegante */}
                        <ThemedText style={styles.marbleButtonText}>Comenzar</ThemedText>
                      </View>
                    </LinearGradient>
                  </Animated.View>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View
                style={{
                  opacity: buttonOpacity,
                  transform: [{ translateY: buttonSlide2 }],
                }}
              >
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleLogin}
                  activeOpacity={0.85}
                >
                  <ThemedText style={styles.secondaryButtonText}>Iniciar sesión</ThemedText>
                </TouchableOpacity>
              </Animated.View>
            </View>

            <Animated.View style={{ opacity: slideAnim }}>
              <ThemedText style={styles.footerText}>
                © 2026 Odihna. Todos los derechos reservados.
              </ThemedText>
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050505',
  },
  loadingLogo: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'absolute',
    // Usamos 120% del tamaño con márgenes negativos para efecto parallax
    width: '120%',
    height: '120%',
    left: '-10%',
    top: '-10%',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  shimmerParticle: {
    position: 'absolute',
    width: normalize(6),
    height: normalize(6),
    borderRadius: normalize(3),
    backgroundColor: ACCENT_COLOR,
    shadowColor: ACCENT_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: normalize(10),
    elevation: 5,
  },
  // Posiciones con porcentajes para responsividad
  shimmerParticle1: {
    top: '20%',
    left: '15%',
  },
  shimmerParticle2: {
    top: '35%',
    right: '20%',
  },
  shimmerParticle3: {
    top: '25%',
    right: '35%',
  },
  overlay: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: normalize(28),
    paddingVertical: normalize(40),
  },
  header: {
    alignItems: 'center',
    marginTop: normalize(50),
  },
  logoContainer: {
    marginBottom: normalize(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: normalizeFontLogo(35),
    fontWeight: '300',
    color: '#fff',
    letterSpacing: normalize(8),
    marginBottom: normalize(6),
    fontFamily: 'serif',
    textShadowColor: '#ffffff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: normalize(10),
  },
  subtitle: {
    fontSize: normalizeFont(11),
    fontWeight: '400',
    color: '#FFD700',
    letterSpacing: normalize(2.5),
    marginBottom: normalize(13),
    textTransform: 'uppercase',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: normalize(8),
  },
  divider: {
    height: normalize(1.25),
    backgroundColor: ACCENT_COLOR,
    borderRadius: normalize(0.65),
    marginBottom: normalize(15),
    shadowColor: ACCENT_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: normalize(5.5),
  },
  taglineMain: {
    fontSize: normalizeFontLogo(45),
    color: '#fff',
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: normalize(0.65),
    lineHeight: normalizeFontLogo(45),
    fontFamily: 'serif',
    textShadowColor: '#ffffff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: normalize(15),
  },
  taglineAccent: {
    fontSize: normalizeFontLogo(37),
    color: '#FFD700',
    textAlign: 'center',
    fontWeight: '300',
    fontStyle: 'italic',
    letterSpacing: normalize(1.25),
    lineHeight: normalizeFontLogo(42),
    fontFamily: 'serif',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: normalize(15),
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: normalize(10),
    marginBottom: normalize(40),
  },
  indicator: {
    width: normalize(8),
    height: normalize(8),
    borderRadius: normalize(4),
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  indicatorActive: {
    backgroundColor: ACCENT_COLOR,
    width: normalize(28),
    shadowColor: ACCENT_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: normalize(8),
  },
  buttonsContainer: {
    gap: normalize(16),
    marginBottom: normalize(25),
  },
  marbleButtonContainer: {
    borderRadius: normalize(15), // Alargado
    shadowColor: '#000',
    shadowOffset: { width: 0, height: normalize(6) },
    shadowOpacity: 0.5,
    shadowRadius: normalize(9),
    elevation: 9,
  },
  marbleButtonShadow: {
    borderRadius: normalize(17),
  },
  goldBorder: {
    padding: normalize(1.7), // Grosor del marco dorado
    borderRadius: normalize(17),
  },
  marbleInner: {
    height: normalize(35),
    width: '100%',
    paddingHorizontal: normalize(18), // ✅ Padding para evitar que el texto se corte
    borderRadius: normalize(15.3), // 17 - 1.7
    overflow: 'hidden', // Para recortar la imagen de mármol
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff', // Fallback
  },
  marbleTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  marbleButtonText: {
    fontSize: normalizeFont(19),
    fontWeight: '700',
    color: '#AA771C', // Dorado oscuro para el texto
    letterSpacing: normalize(0.9),
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: normalize(0.6) },
    textShadowRadius: normalize(0.6),
    zIndex: 10,
    fontFamily: 'serif', // Tipografía más elegante si es posible
  },
  lightSweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: normalize(35),
    transform: [{ skewX: '-20deg' }],
    zIndex: 5,
  },
  buttonIconContainer: {
    width: normalize(28),
    height: normalize(28),
    borderRadius: normalize(14),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: normalize(1.15),
    borderColor: 'rgba(255,255,255,0.5)',
    paddingVertical: normalize(10),
    borderRadius: normalize(9),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: normalize(2.3) },
    shadowOpacity: 0.3,
    shadowRadius: normalize(6),
    elevation: 5,
  },
  secondaryButtonText: {
    fontSize: normalizeFont(17),
    fontWeight: '600',
    color: '#fff',
    letterSpacing: normalize(0.3),
  },
  footerText: {
    fontSize: normalizeFont(8),
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    fontWeight: '400',
  },
});
