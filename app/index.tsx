// app/index.tsx
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';

const IMAGES = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
  'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&q=80',
  'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&q=80',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&q=80',
];

export default function WelcomeScreen() {
  const { loading } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ✅ Solo animaciones, SIN redirección
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % IMAGES.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleGetStarted = () => {
    router.push('/auth/register');
  };

  const handleLogin = () => {
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.imageContainer, { opacity: fadeAnim }]}>
        <Image
          source={{ uri: IMAGES[currentImageIndex] }}
          style={styles.backgroundImage}
          contentFit="cover"
          transition={1000}
        />
      </Animated.View>

      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
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
                    outputRange: [50, 0],
                  }),
                }],
              },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.logoBadge}>
                <Ionicons name="home-outline" size={40} color="#fff" />
              </View>
              <Text style={styles.logoText}>ODIHNA</Text>
              <View style={styles.divider} />
              <Text style={styles.tagline}>Encuentra tu lugar en el mundo</Text>
            </View>

            <View style={styles.indicators}>
              {IMAGES.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    currentImageIndex === index && styles.indicatorActive,
                  ]}
                />
              ))}
            </View>

            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleGetStarted}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Comenzar</Text>
                <Ionicons name="arrow-forward" size={20} color="#000" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleLogin}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryButtonText}>Iniciar sesión</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footerText}>© 2025 Odihna. Todos los derechos reservados.</Text>
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
    backgroundColor: '#000',
  },
  imageContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
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
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoBadge: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 3,
    marginBottom: 16,
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: '#fff',
    borderRadius: 2,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 18,
    color: '#E5E7EB',
    textAlign: 'center',
    fontWeight: '300',
    letterSpacing: 0.5,
    lineHeight: 26,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 40,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  indicatorActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  buttonsContainer: {
    gap: 16,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    gap: 10,
    elevation: 8,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.5,
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontWeight: '400',
  },
});
