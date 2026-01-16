// app/host-profile.tsx

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { mainHost } from '@/constants/mockData';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function HostProfile() {
  const { id } = useLocalSearchParams();
  const [host, setHost] = useState(mainHost);
  const [loading, setLoading] = useState(true);

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
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2C5F7C" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Botón de regreso */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#2C5F7C" />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header del Perfil */}
        <View style={styles.header}>
          <Image
            source={
              typeof host.avatar === 'string'
                ? { uri: host.avatar }
                : host.avatar
            }
            style={styles.avatar}
            contentFit="cover"
          />
          <ThemedText type="title" style={styles.name}>
            {host.name}
          </ThemedText>
          {host.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={18} color="#2C5F7C" />
              <ThemedText style={styles.verifiedText}>Anfitrión Verificado</ThemedText>
            </View>
          )}
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color="#666" />
            <ThemedText style={styles.location}>{host.location}</ThemedText>
          </View>
        </View>

        {/* Estadísticas */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <ThemedText type="subtitle" style={styles.statNumber}>
              {host.properties}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Alojamientos</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={24} color="#FFB800" />
              <ThemedText type="subtitle" style={styles.statNumber}>
                {host.rating}
              </ThemedText>
            </View>
            <ThemedText style={styles.statLabel}>Calificación</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <ThemedText type="subtitle" style={styles.statNumber}>
              {host.reviewsReceived}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Reseñas</ThemedText>
          </View>
        </View>

        {/* Biografía */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Acerca de {host.name.split(' ')[0]}
          </ThemedText>
          <ThemedText style={styles.bio}>{host.bio}</ThemedText>
        </View>

        {/* Información Detallada */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Información del Anfitrión
          </ThemedText>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={22} color="#2C5F7C" />
            <View style={styles.infoContent}>
              <ThemedText style={styles.infoLabel}>Tiempo de respuesta</ThemedText>
              <ThemedText style={styles.infoValue}>{host.responseTime}</ThemedText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="chatbubbles-outline" size={22} color="#2C5F7C" />
            <View style={styles.infoContent}>
              <ThemedText style={styles.infoLabel}>Tasa de respuesta</ThemedText>
              <ThemedText style={styles.infoValue}>{host.responseRate}</ThemedText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={22} color="#2C5F7C" />
            <View style={styles.infoContent}>
              <ThemedText style={styles.infoLabel}>Se unió en</ThemedText>
              <ThemedText style={styles.infoValue}>{host.joinedDate}</ThemedText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="language-outline" size={22} color="#2C5F7C" />
            <View style={styles.infoContent}>
              <ThemedText style={styles.infoLabel}>Idiomas</ThemedText>
              <ThemedText style={styles.infoValue}>{host.languages?.join(', ')}</ThemedText>
            </View>
          </View>
        </View>

        {/* Intereses (Opcional si existen) */}
        {host.interests && host.interests.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Intereses
            </ThemedText>
            <View style={styles.interestsContainer}>
              {host.interests.map((interest, index) => (
                <View key={index} style={styles.interestTag}>
                  <Ionicons name="heart" size={14} color="#2C5F7C" />
                  <ThemedText style={styles.interestText}>{interest}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Botón de Contacto */}
        <TouchableOpacity
          style={styles.contactButton}
          onPress={handleWhatsAppPress}
        >
          <Ionicons name="logo-whatsapp" size={20} color="#fff" />
          <ThemedText style={styles.contactButtonText}>Contactar por WhatsApp</ThemedText>
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
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    borderWidth: 4,
    borderColor: '#2C5F7C',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4F8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  verifiedText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#2C5F7C',
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    marginLeft: 5,
    fontSize: 15,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    marginHorizontal: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 15,
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#ddd',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C5F7C',
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  bio: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
  },
  infoContent: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
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
    backgroundColor: '#E8F4F8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  interestText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#2C5F7C',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 30,
  },
});
