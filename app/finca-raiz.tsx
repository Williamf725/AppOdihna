import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native';

// ================================
// NOCTURNE LUXURY PALETTE
// ================================
const Colors = {
  light: {
    background: '#F5F5F0',
    cardBackground: '#FFFFFF',
    text: '#121212',
    textSecondary: '#666666',
    accent: '#D4AF37',
    accentDark: '#AA8C2C',
  },
  dark: {
    background: '#050505',
    cardBackground: '#121212',
    text: '#F0F0F0',
    textSecondary: '#999999',
    accent: '#D4AF37',
    accentDark: '#F2D06B',
  },
};

export default function FincaRaizScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <ThemedText style={styles.headerTitle}>Finca Raíz</ThemedText>
          <ThemedText style={styles.headerSubtitle}>Propiedades en venta</ThemedText>
        </View>
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: isDark ? colors.cardBackground : '#fff' }]}>
          <LinearGradient
            colors={[colors.accent, colors.accentDark]}
            style={styles.iconGradient}
          >
            <Ionicons name="business-outline" size={50} color="#FFF" />
          </LinearGradient>
        </View>

        <ThemedText style={[styles.title, { color: colors.text }]}>
          Finca Raíz y Remodelaciones
        </ThemedText>

        <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
          Próximamente podrás explorar propiedades en venta y servicios de remodelación
        </ThemedText>

        <View style={[styles.comingSoonBadge, { backgroundColor: `${colors.accent}20` }]}>
          <Ionicons name="time-outline" size={16} color={colors.accent} />
          <ThemedText style={[styles.comingSoonText, { color: colors.accent }]}>
            Próximamente
          </ThemedText>
        </View>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#050505',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 22,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginLeft: -44,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#D4AF37',
    marginTop: 3,
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  comingSoonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
