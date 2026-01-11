// app/host-profile.tsx

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { mainHost } from '@/constants/mockData';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function HostProfile() {
  const handleWhatsAppPress = () => {
    const phoneNumber = mainHost.whatsappNumber || '573001234567'; // Número por defecto si no está definido
    const message = 'Hola Mariana, estoy interesado en uno de tus alojamientos de Odihna Living.';
    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    
    Linking.openURL(whatsappUrl).catch(() => {
      alert('No se pudo abrir WhatsApp. Asegúrate de tenerlo instalado.');
    });
  };

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
              typeof mainHost.avatar === 'string'
                ? { uri: mainHost.avatar }
                : mainHost.avatar
            }
            style={styles.avatar}
            contentFit="cover"
          />
          <ThemedText type="title" style={styles.name}>
            {mainHost.name}
          </ThemedText>
          {mainHost.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={18} color="#2C5F7C" />
              <ThemedText style={styles.verifiedText}>Anfitrión Verificado</ThemedText>
            </View>
          )}
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color="#666" />
            <ThemedText style={styles.location}>{mainHost.location}</ThemedText>
          </View>
        </View>

        {/* Estadísticas */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <ThemedText type="subtitle" style={styles.statNumber}>
              {mainHost.properties}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Alojamientos</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={24} color="#FFB800" />
              <ThemedText type="subtitle" style={styles.statNumber}>
                {mainHost.rating}
              </ThemedText>
            </View>
            <ThemedText style={styles.statLabel}>Calificación</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <ThemedText type="subtitle" style={styles.statNumber}>
              {mainHost.reviewsReceived}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Reseñas</ThemedText>
          </View>
        </View>

        {/* Biografía */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Acerca de {mainHost.name.split(' ')[0]}
          </ThemedText>
          <ThemedText style={styles.bio}>{mainHost.bio}</ThemedText>
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
              <ThemedText style={styles.infoValue}>{mainHost.responseTime}</ThemedText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="chatbubbles-outline" size={22} color="#2C5F7C" />
            <View style={styles.infoContent}>
              <ThemedText style={styles.infoLabel}>Tasa de respuesta</ThemedText>
              <ThemedText style={styles.infoValue}>{mainHost.responseRate}</ThemedText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={22} color="#2C5F7C" />
            <View style={styles.infoContent}>
              <ThemedText style={styles.infoLabel}>Se unió en</ThemedText>
              <ThemedText style={styles.infoValue}>{mainHost.joinedDate}</ThemedText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="language-outline" size={22} color="#2C5F7C" />
            <View style={styles.infoContent}>
              <ThemedText style={styles.infoLabel}>Idiomas</ThemedText>
              <ThemedText style={styles.infoValue}>{mainHost.languages.join(', ')}</ThemedText>
            </View>
          </View>
        </View>

        {/* Intereses */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Intereses
          </ThemedText>
          <View style={styles.interestsContainer}>
            {mainHost.interests.map((interest, index) => (
              <View key={index} style={styles.interestTag}>
                <Ionicons name="heart" size={14} color="#2C5F7C" />
                <ThemedText style={styles.interestText}>{interest}</ThemedText>
              </View>
            ))}
          </View>
        </View>

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
