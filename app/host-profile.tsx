// app/host-profile.tsx

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { mainHost } from '@/constants/mockData';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Linking, Platform, ScrollView, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native';

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
    border: '#E0E0E0',
    divider: '#EBEBEB',
    inputBackground: '#F5F5F5',
    whatsapp: '#25D366',
  },
  dark: {
    background: '#050505',
    cardBackground: '#121212',
    text: '#F0F0F0',
    textSecondary: '#999999',
    accent: '#D4AF37',
    accentDark: '#F2D06B',
    border: '#333333',
    divider: '#222222',
    inputBackground: '#1E1E1E',
    whatsapp: '#25D366',
  },
};

// ================================
// ANIMATED STAT BOX
// ================================
function AnimatedStatBox({ value, label, icon, index, colors }: {
  value: string | number;
  label: string;
  icon?: string;
  index: number;
  colors: typeof Colors.light;
}) {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: index * 100,
        useNativeDriver: true,
        friction: 6,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.statBox,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {icon ? (
        <View style={styles.ratingRow}>
          <Ionicons name={icon as any} size={22} color={colors.accent} />
          <ThemedText style={[styles.statNumber, { color: colors.accent }]}>
            {value}
          </ThemedText>
        </View>
      ) : (
        <ThemedText style={[styles.statNumber, { color: colors.accent }]}>
          {value}
        </ThemedText>
      )}
      <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</ThemedText>
    </Animated.View>
  );
}

export default function HostProfile() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { id } = useLocalSearchParams();
  const [host, setHost] = useState(mainHost);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    const loadHostProfile = async () => {
      if (!id || typeof id !== 'string') {
        setHost(mainHost);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        // Contar propiedades activas
        const { count, error: countError } = await supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', id);

        if (data) {
          setHost({
            name: data.full_name || 'Anfitrión',
            joinedDate: data.created_at
              ? new Date(data.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
              : 'Fecha desconocida',
            avatar: data.avatar_url ? { uri: data.avatar_url } : require('@/assets/images/icon.png'),
            bio: data.bio || 'Sin biografía.',
            location: data.city || 'Desconocido',
            verified: data.id_verified || false,
            properties: count || 0,
            reviewsReceived: data.total_reviews || 0,
            rating: data.average_rating || 5.0,
            responseTime: data.response_time || 'Variable',
            responseRate: `${data.response_rate || 100}%`,
            languages: data.languages || ['Español'],
            interests: [], // Falta implementar
            whatsappNumber: data.phone,
          });
        }
      } catch (error) {
        console.error('Error loading host profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHostProfile();
  }, [id]);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  const handleWhatsAppPress = () => {
    if (!host.whatsappNumber) {
      Alert.alert('No disponible', 'Este anfitrión no tiene número de contacto visible.');
      return;
    }
    const phoneNumber = host.whatsappNumber;
    const message = 'Hola, estoy interesado en uno de tus alojamientos de Odihna.';
    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;

    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert('Error', 'No se pudo abrir WhatsApp. Asegúrate de tenerlo instalado.');
    });
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header simple con botón de regreso */}
      <View style={[styles.headerBar, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: colors.text }]}>Perfil del Anfitrión</ThemedText>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header del Perfil */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Avatar con efecto de glow/aro de luz */}
          <View style={styles.avatarWrapper}>
            {/* Glow externo */}
            <View style={[styles.avatarGlow, { shadowColor: colors.accent, backgroundColor: `${colors.accent}15` }]} />
            <View style={[styles.avatarContainer, { shadowColor: colors.accent }]}>
              <Image
                source={
                  typeof host.avatar === 'string'
                    ? { uri: host.avatar }
                    : host.avatar
                }
                style={styles.avatar}
                contentFit="cover"
              />
              <View style={[styles.avatarBorder, { borderColor: colors.accent }]} />
            </View>
          </View>

          <ThemedText style={[styles.name, { color: colors.text }]}>
            {host.name}
          </ThemedText>

          {host.verified && (
            <View style={[styles.verifiedBadge, { backgroundColor: `${colors.accent}15` }]}>
              <Ionicons name="shield-checkmark" size={16} color={colors.accent} />
              <ThemedText style={[styles.verifiedText, { color: colors.accent }]}>Anfitrión Verificado</ThemedText>
            </View>
          )}

          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={colors.accent} />
            <ThemedText style={[styles.location, { color: colors.textSecondary }]}>{host.location}</ThemedText>
          </View>
        </Animated.View>

        {/* Estadísticas */}
        <View style={[styles.statsContainer, { backgroundColor: colors.cardBackground, shadowColor: colors.accent }]}>
          <AnimatedStatBox
            value={host.properties}
            label="Alojamientos"
            index={0}
            colors={colors}
          />
          <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
          <AnimatedStatBox
            value={host.rating}
            label="Calificación"
            icon="star"
            index={1}
            colors={colors}
          />
          <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
          <AnimatedStatBox
            value={host.reviewsReceived}
            label="Reseñas"
            index={2}
            colors={colors}
          />
        </View>

        {/* Biografía */}
        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Acerca de {host.name.split(' ')[0]}
          </ThemedText>
          <ThemedText style={[styles.bio, { color: colors.textSecondary }]}>{host.bio}</ThemedText>
        </View>

        {/* Información Detallada */}
        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Información del Anfitrión
          </ThemedText>

          <View style={[styles.infoRow, { backgroundColor: colors.inputBackground }]}>
            <View style={[styles.infoIconContainer, { backgroundColor: `${colors.accent}15` }]}>
              <Ionicons name="time-outline" size={20} color={colors.accent} />
            </View>
            <View style={styles.infoContent}>
              <ThemedText style={[styles.infoLabel, { color: colors.textSecondary }]}>Tiempo de respuesta</ThemedText>
              <ThemedText style={[styles.infoValue, { color: colors.text }]}>{host.responseTime}</ThemedText>
            </View>
          </View>

          <View style={[styles.infoRow, { backgroundColor: colors.inputBackground }]}>
            <View style={[styles.infoIconContainer, { backgroundColor: `${colors.accent}15` }]}>
              <Ionicons name="chatbubbles-outline" size={20} color={colors.accent} />
            </View>
            <View style={styles.infoContent}>
              <ThemedText style={[styles.infoLabel, { color: colors.textSecondary }]}>Tasa de respuesta</ThemedText>
              <ThemedText style={[styles.infoValue, { color: colors.text }]}>{host.responseRate}</ThemedText>
            </View>
          </View>

          <View style={[styles.infoRow, { backgroundColor: colors.inputBackground }]}>
            <View style={[styles.infoIconContainer, { backgroundColor: `${colors.accent}15` }]}>
              <Ionicons name="calendar-outline" size={20} color={colors.accent} />
            </View>
            <View style={styles.infoContent}>
              <ThemedText style={[styles.infoLabel, { color: colors.textSecondary }]}>Se unió en</ThemedText>
              <ThemedText style={[styles.infoValue, { color: colors.text }]}>{host.joinedDate}</ThemedText>
            </View>
          </View>

          <View style={[styles.infoRow, { backgroundColor: colors.inputBackground }]}>
            <View style={[styles.infoIconContainer, { backgroundColor: `${colors.accent}15` }]}>
              <Ionicons name="language-outline" size={20} color={colors.accent} />
            </View>
            <View style={styles.infoContent}>
              <ThemedText style={[styles.infoLabel, { color: colors.textSecondary }]}>Idiomas</ThemedText>
              <ThemedText style={[styles.infoValue, { color: colors.text }]}>{host.languages?.join(', ')}</ThemedText>
            </View>
          </View>
        </View>

        {/* Intereses (Opcional si existen) */}
        {host.interests && host.interests.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
              Intereses
            </ThemedText>
            <View style={styles.interestsContainer}>
              {host.interests.map((interest, index) => (
                <View key={index} style={[styles.interestTag, { backgroundColor: `${colors.accent}15` }]}>
                  <Ionicons name="heart" size={14} color={colors.accent} />
                  <ThemedText style={[styles.interestText, { color: colors.accent }]}>{interest}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Botón de Contacto */}
        <TouchableOpacity
          style={styles.contactButton}
          onPress={handleWhatsAppPress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.whatsapp, '#1DA851']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.contactButtonGradient}
          >
            <Ionicons name="logo-whatsapp" size={22} color="#fff" />
            <ThemedText style={styles.contactButtonText}>Contactar por WhatsApp</ThemedText>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingTop: 10,
  },
  header: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 25,
    paddingHorizontal: 20,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 15,
  },
  avatarContainer: {
    position: 'relative',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  avatarBorder: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: 80,
    borderWidth: 3,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 10,
    gap: 6,
  },
  verifiedText: {
    fontSize: 13,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  location: {
    fontSize: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 22,
    marginHorizontal: 15,
    borderRadius: 18,
    marginBottom: 15,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  section: {
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  bio: {
    fontSize: 15,
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    marginLeft: 14,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  interestText: {
    fontSize: 14,
    fontWeight: '500',
  },
  contactButton: {
    marginHorizontal: 15,
    marginTop: 5,
    borderRadius: 16,
    overflow: 'hidden',
  },
  contactButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 40,
  },
});
