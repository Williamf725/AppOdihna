import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { categories, Property } from '../../constants/mockData';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

export default function ExploreScreen() {
  // Estados de búsqueda
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);

  // Estados de modales
  const [guestsModalVisible, setGuestsModalVisible] = useState(false);
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);

  // Estados para búsqueda y filtrado
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');

  // Estados para Supabase
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchActive, setSearchActive] = useState(false);

  // Cargar propiedades desde Supabase
  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, location, city, department, price, rating, review_count, images, tags, max_guests, bedrooms, blocked_dates')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedProperties: Property[] = data.map((prop: any) => ({
        id: prop.id,
        title: prop.title,
        location: prop.location,
        city: prop.city,
        department: prop.department,
        price: prop.price,
        rating: prop.rating,
        reviewCount: prop.reviewcount,
        images: prop.images,
        description: prop.description,
        amenities: prop.amenities || [],
        tags: prop.tags || [],
        maxGuests: prop.maxguests || 2,
        bedrooms: prop.bedrooms || 1,
        blockedDates: Array.isArray(prop.blockeddates) ? prop.blockeddates : [],
        host: {
          name: prop.hostname || 'Mariana Peña',
          joinedDate: 'Enero 2018',
          avatar: require('../../assets/images/anfitrion.jpg'),
        },
        reviews: [],
      }));

      setProperties(formattedProperties);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Recargar al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      console.log('Pantalla Explore enfocada, recargando propiedades...');
      loadProperties();
    }, [])
  );

  // Función para refrescar
  const onRefresh = () => {
    setRefreshing(true);
    loadProperties();
  };

  // Función para verificar si las fechas están disponibles
  const isPropertyAvailable = (
    property: Property,
    checkInDate: Date,
    checkOutDate: Date
  ): boolean => {
    if (
      !property.blockedDates ||
      !Array.isArray(property.blockedDates) ||
      property.blockedDates.length === 0
    ) {
      return true;
    }

    const searchDates: string[] = [];
    const current = new Date(checkInDate);

    while (current < checkOutDate) {
      const dateString = current.toISOString().split('T')[0];
      searchDates.push(dateString);
      current.setDate(current.getDate() + 1);
    }

    const hasBlockedDate = searchDates.some((date) =>
      property.blockedDates.includes(date)
    );

    return !hasBlockedDate;
  };

  // Filtrado de propiedades
  const filteredProperties = useMemo(() => {
    let filtered = properties;

    // Filtro por categoría
    if (selectedCategory !== 'todos') {
      filtered = filtered.filter((property) =>
        property.tags.some((tag) => tag.toLowerCase() === selectedCategory.toLowerCase())
      );
    }

    // Filtro por texto de búsqueda
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (property) =>
          property.title.toLowerCase().includes(query) ||
          property.location.toLowerCase().includes(query) ||
          property.city.toLowerCase().includes(query)
      );
    }

    // Filtro por disponibilidad de fechas
    if (searchActive && checkIn && checkOut) {
      filtered = filtered.filter((property) =>
        isPropertyAvailable(property, checkIn, checkOut)
      );
    }

    // Filtro por capacidad
    if (searchActive) {
      const totalGuests = adults + children;
      filtered = filtered.filter((property) => {
        const propertyMaxGuests = property.maxGuests || 10;
        const propertyBedrooms = property.bedrooms || 1;
        return propertyMaxGuests >= totalGuests && propertyBedrooms >= rooms;
      });
    }

    return filtered;
  }, [
    searchQuery,
    selectedCategory,
    properties,
    searchActive,
    checkIn,
    checkOut,
    adults,
    children,
    rooms,
  ]);

  // Manejar selección de fecha check-in
  const onCheckInChange = (event: any, selectedDate?: Date) => {
    setShowCheckInPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setCheckIn(selectedDate);
      if (checkOut && selectedDate >= checkOut) {
        setCheckOut(null);
      }
    }
  };

  // Manejar selección de fecha check-out
  const onCheckOutChange = (event: any, selectedDate?: Date) => {
    setShowCheckOutPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setCheckOut(selectedDate);
    }
  };

  // Formatear fecha para mostrar
  const formatDate = (date: Date | null): string => {
    if (!date) return 'Seleccionar';
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Función para buscar
  const handleSearch = () => {
    if (!checkIn || !checkOut) {
      alert('Por favor selecciona las fechas de entrada y salida');
      return;
    }

    if (checkIn >= checkOut) {
      alert('La fecha de salida debe ser posterior a la fecha de entrada');
      return;
    }

    setSearchActive(true);
    console.log('Buscando alojamientos disponibles...');
  };

  // Función para limpiar búsqueda
  const handleClearSearch = () => {
    setCheckIn(null);
    setCheckOut(null);
    setAdults(2);
    setChildren(0);
    setRooms(1);
    setSearchActive(false);
  };

  const selectedCategoryName =
    categories.find((cat) => cat.tag === selectedCategory)?.name || 'Todos';

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C5F7C" />
        <ThemedText style={styles.loadingText}>Cargando alojamientos...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header con fondo negro */}
        <View style={styles.headerBlack}>
          <View style={styles.logoContainer}>
            <ThemedText style={styles.logoOdihna}>ODIHNA</ThemedText>
          </View>
          <ThemedText style={styles.subtitle}>Explora alojamientos increíbles</ThemedText>
        </View>

        {/* Sección de búsqueda mejorada */}
        <View style={styles.searchSection}>
          {/* Barra de búsqueda por texto */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por ciudad o nombre..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Selectores de fechas */}
          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.dateInput} onPress={() => setShowCheckInPicker(true)}>
              <View style={styles.dateInputContent}>
                <Ionicons name="calendar-outline" size={20} color="#2C5F7C" />
                <View style={styles.dateTextContainer}>
                  <ThemedText style={styles.dateLabel}>Check-in</ThemedText>
                  <ThemedText style={styles.dateValue}>{formatDate(checkIn)}</ThemedText>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dateInput} onPress={() => setShowCheckOutPicker(true)}>
              <View style={styles.dateInputContent}>
                <Ionicons name="calendar-outline" size={20} color="#2C5F7C" />
                <View style={styles.dateTextContainer}>
                  <ThemedText style={styles.dateLabel}>Check-out</ThemedText>
                  <ThemedText style={styles.dateValue}>{formatDate(checkOut)}</ThemedText>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Selector de huéspedes y habitaciones */}
          <TouchableOpacity
            style={styles.guestsButton}
            onPress={() => setGuestsModalVisible(true)}
          >
            <Ionicons name="people-outline" size={20} color="#2C5F7C" />
            <View style={styles.guestsTextContainer}>
              <ThemedText style={styles.guestsLabel}>Huéspedes y habitaciones</ThemedText>
              <ThemedText style={styles.guestsValue}>
                {adults + children} huéspedes • {rooms} habitación{rooms > 1 ? 'es' : ''}
              </ThemedText>
            </View>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          {/* Botón de búsqueda */}
          <View style={styles.searchButtonRow}>
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              <Ionicons name="search" size={20} color="#fff" />
              <ThemedText style={styles.searchButtonText}>Buscar</ThemedText>
            </TouchableOpacity>
            {searchActive && (
              <TouchableOpacity style={styles.clearButton} onPress={handleClearSearch}>
                <Ionicons name="close" size={20} color="#2C5F7C" />
              </TouchableOpacity>
            )}
          </View>

          {/* Indicador de búsqueda activa */}
          {searchActive && (
            <View style={styles.activeSearchIndicator}>
              <Ionicons name="funnel" size={16} color="#D4AF37" />
              <ThemedText style={styles.activeSearchText}>
                Mostrando {filteredProperties.length} alojamientos disponibles
              </ThemedText>
            </View>
          )}
        </View>

        {/* Categorías */}
        <View style={styles.categoriesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  selectedCategory === category.tag && styles.categoryCardActive,
                ]}
                onPress={() => setSelectedCategory(category.tag)}
              >
                <Ionicons
                  name={category.icon as any}
                  size={24}
                  color={selectedCategory === category.tag ? '#fff' : '#2C5F7C'}
                />
                <ThemedText
                  style={[
                    styles.categoryText,
                    selectedCategory === category.tag && styles.categoryTextActive,
                  ]}
                >
                  {category.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Lista de propiedades */}
        <View style={styles.propertiesSection}>
          <ThemedText style={styles.sectionTitle}>{selectedCategoryName}</ThemedText>

          {filteredProperties.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color="#ccc" />
              <ThemedText style={styles.emptyStateText}>
                No se encontraron alojamientos
              </ThemedText>
              {searchActive && (
                <ThemedText style={styles.emptyStateSubtext}>
                  Intenta cambiar las fechas o ajustar los filtros
                </ThemedText>
              )}
            </View>
          ) : (
            filteredProperties.map((property) => (
              <TouchableOpacity
                key={property.id}
                style={styles.propertyCard}
                onPress={() => router.push(`/${property.id}`)}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: property.images[0] }}
                  style={styles.propertyImage}
                  contentFit="cover"
                />
                <View style={styles.propertyInfo}>
                  <ThemedText style={styles.propertyTitle} numberOfLines={2}>
                    {property.title}
                  </ThemedText>
                  <View style={styles.propertyLocation}>
                    <Ionicons name="location" size={14} color="#666" />
                    <ThemedText style={styles.locationText}>{property.location}</ThemedText>
                  </View>
                  <View style={styles.propertyFooter}>
                    <View style={styles.priceContainer}>
                      <ThemedText style={styles.price}>
                        ${property.price.toLocaleString()}
                      </ThemedText>
                      <ThemedText style={styles.priceLabel}> /noche</ThemedText>
                    </View>
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={14} color="#FFB800" />
                      <ThemedText style={styles.rating}>{property.rating}</ThemedText>
                      <ThemedText style={styles.reviewCount}>({property.reviewCount})</ThemedText>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* DateTimePicker para Check-in */}
      {showCheckInPicker && (
        <DateTimePicker
          value={checkIn || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onCheckInChange}
          minimumDate={new Date()}
        />
      )}

      {/* DateTimePicker para Check-out */}
      {showCheckOutPicker && (
        <DateTimePicker
          value={checkOut || (checkIn ? new Date(checkIn.getTime() + 86400000) : new Date())}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onCheckOutChange}
          minimumDate={checkIn || new Date()}
        />
      )}

      {/* Modal de huéspedes y habitaciones */}
      <Modal
        visible={guestsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGuestsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Huéspedes y habitaciones</ThemedText>
              <TouchableOpacity onPress={() => setGuestsModalVisible(false)}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.counterSection}>
              {/* Adultos */}
              <View style={styles.counterRow}>
                <View>
                  <ThemedText style={styles.counterLabel}>Adultos</ThemedText>
                  <ThemedText style={styles.counterSubLabel}>13 años o más</ThemedText>
                </View>
                <View style={styles.counterControls}>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => setAdults(Math.max(1, adults - 1))}
                  >
                    <Ionicons name="remove" size={20} color="#2C5F7C" />
                  </TouchableOpacity>
                  <ThemedText style={styles.counterValue}>{adults}</ThemedText>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => setAdults(adults + 1)}
                  >
                    <Ionicons name="add" size={20} color="#2C5F7C" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Niños */}
              <View style={styles.counterRow}>
                <View>
                  <ThemedText style={styles.counterLabel}>Niños</ThemedText>
                  <ThemedText style={styles.counterSubLabel}>0-12 años</ThemedText>
                </View>
                <View style={styles.counterControls}>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => setChildren(Math.max(0, children - 1))}
                  >
                    <Ionicons name="remove" size={20} color="#2C5F7C" />
                  </TouchableOpacity>
                  <ThemedText style={styles.counterValue}>{children}</ThemedText>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => setChildren(children + 1)}
                  >
                    <Ionicons name="add" size={20} color="#2C5F7C" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Habitaciones */}
              <View style={styles.counterRow}>
                <View>
                  <ThemedText style={styles.counterLabel}>Habitaciones</ThemedText>
                </View>
                <View style={styles.counterControls}>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => setRooms(Math.max(1, rooms - 1))}
                  >
                    <Ionicons name="remove" size={20} color="#2C5F7C" />
                  </TouchableOpacity>
                  <ThemedText style={styles.counterValue}>{rooms}</ThemedText>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => setRooms(rooms + 1)}
                  >
                    <Ionicons name="add" size={20} color="#2C5F7C" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalApplyButton}
              onPress={() => setGuestsModalVisible(false)}
            >
              <ThemedText style={styles.modalApplyButtonText}>Aplicar</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  subtitle: { fontSize: 16, color: '#CCCCCC' },
  logoLiving: { fontSize: 32, fontWeight: 'bold', color: '#D4AF37', textTransform: 'uppercase' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  headerBlack: {
    backgroundColor: '#02111aff',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
    alignItems: 'center',
  },
  logoOdihna: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', textTransform: 'uppercase' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchSection: {
    backgroundColor: '#02111aff',
    paddingHorizontal: 20,
    paddingBottom: 25,
    paddingTop: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 16, color: '#000' },
  dateRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  dateInput: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  dateInputContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateTextContainer: { flex: 1 },
  dateLabel: { fontSize: 12, color: '#666', marginBottom: 2 },
  dateValue: { fontSize: 14, fontWeight: '600', color: '#000' },
  guestsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    gap: 10,
  },
  guestsTextContainer: { flex: 1 },
  guestsLabel: { fontSize: 12, color: '#666', marginBottom: 2 },
  guestsValue: { fontSize: 14, fontWeight: '600', color: '#000' },
  searchButtonRow: { flexDirection: 'row', gap: 10 },
  searchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4AF37',
    borderRadius: 12,
    paddingVertical: 15,
    gap: 10,
  },
  searchButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  clearButton: {
    width: 50,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSearchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderRadius: 8,
    padding: 10,
    marginTop: 15,
    gap: 8,
  },
  activeSearchText: { fontSize: 13, color: '#D4AF37', fontWeight: '600' },
  categoriesSection: { paddingVertical: 20 },
  categoriesScroll: { paddingHorizontal: 20, gap: 12 },
  categoryCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    minWidth: 110,
  },
  categoryCardActive: { backgroundColor: '#2C5F7C', borderColor: '#2C5F7C' },
  categoryText: { marginTop: 6, fontSize: 12, fontWeight: '600', color: '#333', textAlign: 'center' },
  categoryTextActive: { color: '#fff' },
  propertiesSection: { paddingHorizontal: 20, paddingBottom: 20 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyStateText: { fontSize: 18, color: '#999', marginTop: 20, fontWeight: '600' },
  emptyStateSubtext: { fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center' },
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
  propertyImage: { width: '100%', height: 220 },
  propertyInfo: { padding: 15 },
  propertyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  propertyLocation: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  locationText: { fontSize: 14, color: '#666' },
  propertyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline' },
  price: { fontSize: 20, fontWeight: 'bold', color: '#2C5F7C' },
  priceLabel: { fontSize: 14, color: '#666' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: { fontSize: 14, fontWeight: 'bold' },
  reviewCount: { fontSize: 14, color: '#666' },
  bottomSpacing: { height: 30 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  counterSection: { padding: 20 },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  counterLabel: { fontSize: 16, fontWeight: '600' },
  counterSubLabel: { fontSize: 14, color: '#666', marginTop: 2 },
  counterControls: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2C5F7C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: { fontSize: 18, fontWeight: 'bold', minWidth: 30, textAlign: 'center' },
  modalApplyButton: {
    backgroundColor: '#2C5F7C',
    marginHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalApplyButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
