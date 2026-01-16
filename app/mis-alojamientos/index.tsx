// app/mis-alojamientos/index.tsx

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Property } from '@/constants/mockData';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function MisAlojamientosScreen() {
  return (
    <ProtectedRoute requireRole="host">
      <MisAlojamientosContent />
    </ProtectedRoute>
  );
}

function MisAlojamientosContent() {
  const { user } = useAuth();
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Cargar mis propiedades desde Supabase
  const loadMyProperties = async () => {
    if (!user) return; // Evitar actualizar estado si se está cerrando sesión

    try {
      setLoading(true);

      // Filtrar por owner_id
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedProperties: Property[] = data.map((prop: any) => ({
        id: prop.id,
        title: prop.title,
        location: prop.location,
        city: prop.city,
        department: prop.department,
        price: prop.price,
        rating: prop.rating,
        reviewCount: prop.review_count,
        images: prop.images,
        description: prop.description,
        amenities: prop.amenities || [],
        tags: prop.tags || [],
        maxGuests: prop.max_guests || 2,
        bedrooms: prop.bedrooms || 1,
        blockedDates: Array.isArray(prop.blocked_dates) ? prop.blocked_dates : [],
        host: {
          name: prop.host_name || "Mariana Peña",
          joinedDate: "Enero 2018",
          avatar: require('../../assets/images/anfitrion.jpg'),
        },
        reviews: [],
      }));

      setMyProperties(formattedProperties);
    } catch (error) {
      console.error('Error loading my properties:', error);
      Alert.alert('Error', 'No se pudieron cargar tus alojamientos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Recargar al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      if (user) {
        console.log('🔄 Recargando mis alojamientos...');
        loadMyProperties();
      }
    }, [user])
  );

  // Función para refrescar
  const onRefresh = () => {
    setRefreshing(true);
    loadMyProperties();
  };

  // Función para eliminar propiedad
  const handleDelete = (propertyId: number, propertyTitle: string) => {
    Alert.alert(
      'Eliminar alojamiento',
      `¿Estás seguro que deseas eliminar "${propertyTitle}"? Esta acción no se puede deshacer.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('properties')
                .delete()
                .eq('id', propertyId)
                .eq('owner_id', user?.id); // Verificación adicional de seguridad

              if (error) throw error;

              Alert.alert('Éxito', 'Alojamiento eliminado correctamente');
              loadMyProperties();
            } catch (error: any) {
              console.error('Error deleting property:', error);
              Alert.alert('Error', 'No se pudo eliminar el alojamiento');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C5F7C" />
        <ThemedText style={styles.loadingText}>Cargando tus alojamientos...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <ThemedText style={styles.headerTitle}>Mis Alojamientos</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            {myProperties.length} {myProperties.length === 1 ? 'publicación' : 'publicaciones'}
          </ThemedText>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {myProperties.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="home-outline" size={80} color="#ccc" />
            <ThemedText style={styles.emptyStateText}>
              Aún no tienes alojamientos publicados
            </ThemedText>
            <ThemedText style={styles.emptyStateSubtext}>
              Comparte tu espacio y comienza a recibir huéspedes
            </ThemedText>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/sube-alojamiento')}
            >
              <Ionicons name="add-circle" size={24} color="#fff" />
              <ThemedText style={styles.addButtonText}>Publicar alojamiento</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.propertiesList}>
            {myProperties.map((property) => (
              <View key={property.id} style={styles.propertyCard}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push(`/${property.id}`)}
                >
                  <Image
                    source={{ uri: property.images[0] }}
                    style={styles.propertyImage}
                    contentFit="cover"
                  />
                </TouchableOpacity>

                <View style={styles.propertyInfo}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.push(`/${property.id}`)}
                  >
                    <ThemedText style={styles.propertyTitle} numberOfLines={2}>
                      {property.title}
                    </ThemedText>

                    <View style={styles.propertyLocation}>
                      <Ionicons name="location" size={14} color="#666" />
                      <ThemedText style={styles.locationText}>{property.location}</ThemedText>
                    </View>

                    <View style={styles.propertyStats}>
                      <View style={styles.statItem}>
                        <Ionicons name="star" size={14} color="#FFB800" />
                        <ThemedText style={styles.statText}>{property.rating}</ThemedText>
                      </View>
                      <View style={styles.statItem}>
                        <Ionicons name="people-outline" size={14} color="#666" />
                        <ThemedText style={styles.statText}>
                          {property.maxGuests} huéspedes
                        </ThemedText>
                      </View>
                      <View style={styles.statItem}>
                        <Ionicons name="bed-outline" size={14} color="#666" />
                        <ThemedText style={styles.statText}>
                          {property.bedrooms} hab.
                        </ThemedText>
                      </View>
                    </View>

                    <ThemedText style={styles.price}>
                      ${property.price.toLocaleString()}{' '}
                      <ThemedText style={styles.priceLabel}>/ noche</ThemedText>
                    </ThemedText>
                  </TouchableOpacity>

                  {/* Botones de acción */}
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => router.push(`/calendario/${property.id}`)}
                    >
                      <Ionicons name="calendar-outline" size={20} color="#2C5F7C" />
                      <ThemedText style={styles.actionButtonText}>Calendario</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => router.push(`/editar-alojamiento/${property.id}`)}
                    >
                      <Ionicons name="create-outline" size={20} color="#2C5F7C" />
                      <ThemedText style={styles.actionButtonText}>Editar</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDelete(property.id, property.title)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#DC2626" />
                      <ThemedText style={styles.deleteButtonText}>Eliminar</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {/* Botón para agregar más */}
            <TouchableOpacity
              style={styles.addMoreButton}
              onPress={() => router.push('/sube-alojamiento')}
            >
              <Ionicons name="add-circle-outline" size={24} color="#2C5F7C" />
              <ThemedText style={styles.addMoreButtonText}>
                Publicar otro alojamiento
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

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
  header: {
    backgroundColor: '#02111aff',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#D4AF37',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C5F7C',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 30,
    gap: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  propertiesList: {
    padding: 20,
  },
  propertyCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  propertyImage: {
    width: '100%',
    height: 200,
  },
  propertyInfo: {
    padding: 15,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  propertyLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  propertyStats: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#666',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C5F7C',
    marginBottom: 15,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'normal',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C5F7C',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    gap: 10,
  },
  addMoreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C5F7C',
  },
  bottomSpacing: {
    height: 30,
  },
});