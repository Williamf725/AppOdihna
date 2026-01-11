// app/[id].tsx

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { mainHost, Property } from '@/constants/mockData';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Cargar propiedad desde Supabase
  useEffect(() => {
    const loadProperty = async () => {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        // Transformar datos
        // Busca esta parte en app/[id].tsx (alrededor de la línea 42)
const formattedProperty: Property = {
  id: data.id,
  title: data.title,
  location: data.location,
  city: data.city,
  department: data.department,
  price: data.price,
  rating: data.rating,
  reviewCount: data.review_count,
  images: data.images,
  description: data.description,
  amenities: data.amenities,
  tags: data.tags,
  maxGuests: data.max_guests,
  bedrooms: data.bedrooms,
  blockedDates: Array.isArray(data.blocked_dates) ? data.blocked_dates : [], // AGREGAR ESTA LÍNEA
  host: mainHost,
  reviews: [],
};


        setProperty(formattedProperty);
      } catch (error) {
        console.error('Error loading property:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProperty();
  }, [id]);

  const handleWhatsApp = () => {
    if (property) {
      const message = `Hola! Estoy interesado en el alojamiento "${property.title}" en ${property.location}`;
      const url = `https://wa.me/${mainHost.whatsappNumber}?text=${encodeURIComponent(message)}`;
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C5F7C" />
        <ThemedText style={styles.loadingText}>Cargando alojamiento...</ThemedText>
      </ThemedView>
    );
  }

  if (!property) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2C5F7C" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
          <ThemedText style={styles.errorText}>Alojamiento no encontrado</ThemedText>
          <TouchableOpacity style={styles.backHomeButton} onPress={() => router.push('/')}>
            <ThemedText style={styles.backHomeText}>Volver al inicio</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Carrusel de imágenes */}
        <View style={styles.imageCarousel}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setCurrentImageIndex(index);
            }}
            scrollEventThrottle={16}
          >
            {property.images.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image }}
                style={styles.propertyImage}
                contentFit="cover"
              />
            ))}
          </ScrollView>

          {/* Botón de volver */}
          <TouchableOpacity 
            style={styles.backButtonOverlay} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Indicador de imagen */}
          <View style={styles.imageIndicator}>
            <ThemedText style={styles.imageIndicatorText}>
              {currentImageIndex + 1} / {property.images.length}
            </ThemedText>
          </View>
        </View>

        {/* Contenido */}
        <View style={styles.content}>
          {/* Título y ubicación */}
          <View style={styles.titleSection}>
            <ThemedText style={styles.title}>{property.title}</ThemedText>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color="#666" />
              <ThemedText style={styles.location}>{property.location}</ThemedText>
            </View>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color="#FFB800" />
              <ThemedText style={styles.rating}>
                {property.rating} · {property.reviewCount} reseñas
              </ThemedText>
            </View>
          </View>

          {/* Información rápida */}
          <View style={styles.quickInfo}>
            <View style={styles.quickInfoItem}>
              <Ionicons name="people-outline" size={24} color="#2C5F7C" />
              <ThemedText style={styles.quickInfoText}>
                {property.maxGuests} huéspedes
              </ThemedText>
            </View>
            <View style={styles.quickInfoItem}>
              <Ionicons name="bed-outline" size={24} color="#2C5F7C" />
              <ThemedText style={styles.quickInfoText}>
                {property.bedrooms} {property.bedrooms === 1 ? 'habitación' : 'habitaciones'}
              </ThemedText>
            </View>
          </View>

          {/* Descripción */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Descripción</ThemedText>
            <ThemedText style={styles.description}>{property.description}</ThemedText>
          </View>

          {/* Comodidades */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Comodidades</ThemedText>
            <View style={styles.amenitiesContainer}>
              {property.amenities.map((amenity, index) => (
                <View key={index} style={styles.amenityItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#2C5F7C" />
                  <ThemedText style={styles.amenityText}>{amenity}</ThemedText>
                </View>
              ))}
            </View>
          </View>

         {/* Información del anfitrión - HACER CLICKEABLE */}
<View style={styles.section}>
  <ThemedText style={styles.sectionTitle}>Anfitrión</ThemedText>
  <TouchableOpacity 
    style={styles.hostCard}
    onPress={() => router.push('/host-profile')}
    activeOpacity={0.7}
  >
    <Image
      source={property.host.avatar}
      style={styles.hostAvatar}
      contentFit="cover"
    />
    <View style={styles.hostInfo}>
      <ThemedText style={styles.hostName}>{property.host.name}</ThemedText>
      <ThemedText style={styles.hostJoined}>
        Se unió en {property.host.joinedDate}
      </ThemedText>
    </View>
    <Ionicons name="chevron-forward" size={24} color="#666" />
  </TouchableOpacity>
</View>


          {/* Precio y botón de reserva */}
          <View style={styles.priceSection}>
            <View>
              <ThemedText style={styles.priceLabel}>Precio por noche</ThemedText>
              <ThemedText style={styles.price}>
                ${property.price.toLocaleString()} COP
              </ThemedText>
            </View>
            <TouchableOpacity style={styles.reserveButton} onPress={handleWhatsApp}>
              <Ionicons name="logo-whatsapp" size={20} color="#fff" />
              <ThemedText style={styles.reserveButtonText}>Contactar</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    color: '#666',
    textAlign: 'center',
  },
  backHomeButton: {
    marginTop: 20,
    backgroundColor: '#2C5F7C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backHomeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  imageCarousel: {
    position: 'relative',
  },
  propertyImage: {
    width: width,
    height: 300,
  },
  backButtonOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIndicator: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  imageIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  titleSection: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  location: {
    fontSize: 16,
    color: '#666',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickInfo: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  quickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickInfoText: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 25,
    paddingBottom: 25,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  amenitiesContainer: {
    gap: 12,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  amenityText: {
    fontSize: 15,
    color: '#333',
  },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  hostAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  hostInfo: {
    flex: 1,
  },
  hostName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  hostJoined: {
    fontSize: 14,
    color: '#666',
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 12,
    marginTop: 10,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C5F7C',
  },
  reserveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  reserveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 30,
  },
});
