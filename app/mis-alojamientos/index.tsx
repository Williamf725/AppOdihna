// app/mis-alojamientos/index.tsx

import { ModeSwitcher } from '@/components/ModeSwitcher';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Property } from '@/constants/mockData';
import { formatCurrency, SaleProperty } from '@/constants/realEstateData';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { ModeColors } from '../../contexts/AppModeContext';

const { width } = Dimensions.get('window');

type PublishMode = 'estadia' | 'comprar';

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
    shadow: '#000',
    inputBackground: '#FFFFFF',
    primaryButton: '#121212',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
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
    shadow: '#000',
    inputBackground: '#1E1E1E',
    primaryButton: '#D4AF37',
    danger: '#EF4444',
    dangerLight: '#3D1A1A',
  },
};

// ================================
// ANIMATED PROPERTY CARD (Estadía)
// ================================
interface AnimatedPropertyCardProps {
  property: Property;
  index: number;
  isDark: boolean;
  accentColor: string;
  onDelete: () => void;
  onEdit: () => void;
  onCalendar: () => void;
  onPress: () => void;
}

function AnimatedPropertyCard({ property, index, isDark, accentColor, onDelete, onEdit, onCalendar, onPress }: AnimatedPropertyCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const colors = isDark ? Colors.dark : Colors.light;

  useEffect(() => {
    const delay = index * 100;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.propertyCard,
        { backgroundColor: colors.cardBackground, shadowColor: accentColor, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: property.images[0] }} style={styles.propertyImage} contentFit="cover" transition={300} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.imageGradient} />
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color={accentColor} />
            <ThemedText style={styles.ratingText}>{property.rating}</ThemedText>
          </View>
        </View>
      </TouchableOpacity>

      <View style={[styles.propertyInfo, { borderTopColor: colors.divider }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
          <ThemedText style={[styles.propertyTitle, { color: colors.text }]} numberOfLines={2}>{property.title}</ThemedText>
          <View style={styles.propertyLocation}>
            <Ionicons name="location" size={14} color={accentColor} />
            <ThemedText style={[styles.locationText, { color: colors.textSecondary }]}>{property.location}</ThemedText>
          </View>
          <View style={styles.propertyStats}>
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={14} color={accentColor} />
              <ThemedText style={[styles.statText, { color: colors.textSecondary }]}>{property.maxGuests} huéspedes</ThemedText>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="bed-outline" size={14} color={accentColor} />
              <ThemedText style={[styles.statText, { color: colors.textSecondary }]}>{property.bedrooms} hab.</ThemedText>
            </View>
          </View>
          <View style={styles.priceRow}>
            <ThemedText style={[styles.priceSymbol, { color: accentColor }]}>$</ThemedText>
            <ThemedText style={[styles.price, { color: colors.text }]}>{property.price.toLocaleString()}</ThemedText>
            <ThemedText style={[styles.priceLabel, { color: colors.textSecondary }]}> / noche</ThemedText>
          </View>
        </TouchableOpacity>

        <View style={[styles.actionsContainer, { borderTopColor: colors.divider }]}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: isDark ? colors.inputBackground : '#f5f5f5' }]} onPress={onCalendar}>
            <Ionicons name="calendar-outline" size={18} color={accentColor} />
            <ThemedText style={[styles.actionButtonText, { color: accentColor }]}>Calendario</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: isDark ? colors.inputBackground : '#f5f5f5' }]} onPress={onEdit}>
            <Ionicons name="create-outline" size={18} color={accentColor} />
            <ThemedText style={[styles.actionButtonText, { color: accentColor }]}>Editar</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.dangerLight }]} onPress={onDelete}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <ThemedText style={[styles.deleteButtonText, { color: colors.danger }]}>Eliminar</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

// ================================
// ANIMATED SALE PROPERTY CARD (Comprar)
// ================================
interface AnimatedSaleCardProps {
  property: SaleProperty;
  index: number;
  isDark: boolean;
  accentColor: string;
  onDelete: () => void;
  onEdit: () => void;
  onPress: () => void;
}

function AnimatedSaleCard({ property, index, isDark, accentColor, onDelete, onEdit, onPress }: AnimatedSaleCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const colors = isDark ? Colors.dark : Colors.light;

  useEffect(() => {
    const delay = index * 100;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const propertyTypeLabels: Record<string, string> = {
    casa: 'Casa',
    apartamento: 'Apartamento',
    lote: 'Lote',
    local: 'Local',
    oficina: 'Oficina',
    finca: 'Finca',
  };

  return (
    <Animated.View
      style={[
        styles.propertyCard,
        { backgroundColor: colors.cardBackground, shadowColor: accentColor, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: property.images[0] }} style={styles.propertyImage} contentFit="cover" transition={300} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.imageGradient} />
          {/* Property type badge */}
          <View style={[styles.typeBadge, { backgroundColor: accentColor }]}>
            <ThemedText style={styles.typeBadgeText}>{propertyTypeLabels[property.propertyType] || 'Inmueble'}</ThemedText>
          </View>
          {/* Estrato badge */}
          <View style={[styles.estratoBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <ThemedText style={styles.estratoBadgeText}>E{property.estrato}</ThemedText>
          </View>
        </View>
      </TouchableOpacity>

      <View style={[styles.propertyInfo, { borderTopColor: colors.divider }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
          <ThemedText style={[styles.propertyTitle, { color: colors.text }]} numberOfLines={2}>{property.title}</ThemedText>
          <View style={styles.propertyLocation}>
            <Ionicons name="location" size={14} color={accentColor} />
            <ThemedText style={[styles.locationText, { color: colors.textSecondary }]}>{property.location || `${property.barrio}, ${property.city}`}</ThemedText>
          </View>
          <View style={styles.propertyStats}>
            {property.bedrooms > 0 && (
              <View style={styles.statItem}>
                <Ionicons name="bed-outline" size={14} color={accentColor} />
                <ThemedText style={[styles.statText, { color: colors.textSecondary }]}>{property.bedrooms} hab.</ThemedText>
              </View>
            )}
            {property.bathrooms > 0 && (
              <View style={styles.statItem}>
                <Ionicons name="water-outline" size={14} color={accentColor} />
                <ThemedText style={[styles.statText, { color: colors.textSecondary }]}>{property.bathrooms} baños</ThemedText>
              </View>
            )}
            <View style={styles.statItem}>
              <Ionicons name="resize-outline" size={14} color={accentColor} />
              <ThemedText style={[styles.statText, { color: colors.textSecondary }]}>{property.metraje} m²</ThemedText>
            </View>
          </View>
          <View style={styles.priceRow}>
            <ThemedText style={[styles.salePrice, { color: accentColor }]}>{formatCurrency(property.price)}</ThemedText>
          </View>
        </TouchableOpacity>

        <View style={[styles.actionsContainer, { borderTopColor: colors.divider }]}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: isDark ? colors.inputBackground : '#f5f5f5', flex: 1.5 }]} onPress={onEdit}>
            <Ionicons name="create-outline" size={18} color={accentColor} />
            <ThemedText style={[styles.actionButtonText, { color: accentColor }]}>Editar</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.dangerLight, flex: 1 }]} onPress={onDelete}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <ThemedText style={[styles.deleteButtonText, { color: colors.danger }]}>Eliminar</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

export default function MisAlojamientosScreen() {
  return (
    <ProtectedRoute requireRole="host">
      <MisAlojamientosContent />
    </ProtectedRoute>
  );
}

function MisAlojamientosContent() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const { user } = useAuth();

  const [mode, setMode] = useState<PublishMode>('estadia');
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [mySaleProperties, setMySaleProperties] = useState<SaleProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const accentColor = mode === 'estadia' ? ModeColors.estadia.accent : ModeColors.comprar.accent;

  // Load properties based on mode
  const loadProperties = async () => {
    if (!user) return;

    try {
      setLoading(true);

      if (mode === 'estadia') {
        const { data, error } = await supabase
          .from('properties')
          .select('id, title, location, price, rating, images, max_guests, bedrooms')
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
          host: { name: "Anfitrión", joinedDate: "2024", avatar: require('../../assets/images/anfitrion.jpg') },
          reviews: [],
        }));

        setMyProperties(formattedProperties);
      } else {
        const { data, error } = await supabase
          .from('sale_properties')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedSaleProperties: SaleProperty[] = data.map((prop: any) => ({
          id: prop.id,
          title: prop.title,
          description: prop.description,
          price: prop.price,
          pricePerMeter: prop.price_per_meter,
          location: prop.location,
          city: prop.city,
          zona: prop.zona,
          barrio: prop.barrio,
          estrato: prop.estrato,
          metraje: prop.metraje,
          metrajeConstruido: prop.metraje_construido,
          bedrooms: prop.bedrooms,
          bathrooms: prop.bathrooms,
          garages: prop.garages,
          yearBuilt: prop.year_built,
          propertyType: prop.property_type,
          images: prop.images || [],
          features: prop.features || [],
          agent: { id: '', name: '', avatar: '', phone: '', whatsapp: '', email: '', verified: false, propertiesSold: 0, rating: 0 },
          isNew: prop.is_new,
          isFeatured: prop.is_featured,
          createdAt: prop.created_at,
        }));

        setMySaleProperties(formattedSaleProperties);
      }
    } catch (error) {
      console.error('Error loading properties:', error);
      Alert.alert('Error', 'No se pudieron cargar tus propiedades');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (user) loadProperties();
    }, [user, mode])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadProperties();
  };

  // Delete property
  const handleDeleteProperty = (propertyId: number, propertyTitle: string) => {
    Alert.alert(
      'Eliminar alojamiento',
      `¿Estás seguro que deseas eliminar "${propertyTitle}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('properties').delete().eq('id', propertyId).eq('owner_id', user?.id);
              if (error) throw error;
              Alert.alert('Éxito', 'Alojamiento eliminado');
              loadProperties();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar');
            }
          },
        },
      ]
    );
  };

  // Delete sale property
  const handleDeleteSaleProperty = (propertyId: string, propertyTitle: string) => {
    Alert.alert(
      'Eliminar inmueble',
      `¿Estás seguro que deseas eliminar "${propertyTitle}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('sale_properties').delete().eq('id', propertyId).eq('owner_id', user?.id);
              if (error) throw error;
              Alert.alert('Éxito', 'Inmueble eliminado');
              loadProperties();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar');
            }
          },
        },
      ]
    );
  };

  const currentItems = mode === 'estadia' ? myProperties : mySaleProperties;
  const headerTitle = mode === 'estadia' ? 'Mis Alojamientos' : 'Mis Inmuebles';
  const emptyText = mode === 'estadia' ? 'Aún no tienes alojamientos publicados' : 'Aún no tienes inmuebles en venta';
  const emptySubtext = mode === 'estadia' ? 'Comparte tu espacio y comienza a recibir huéspedes' : 'Publica tu inmueble y encuentra compradores';
  const addButtonText = mode === 'estadia' ? 'Publicar alojamiento' : 'Publicar inmueble';

  if (loading) {
    return (
      <ThemedView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={accentColor} />
        <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: mode === 'comprar' ? '#1A202C' : '#050505' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <ThemedText style={styles.headerTitle}>{headerTitle}</ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: accentColor }]}>
            {currentItems.length} {currentItems.length === 1 ? 'publicación' : 'publicaciones'}
          </ThemedText>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} colors={[accentColor]} />}
      >
        {/* Mode Switcher */}
        <ModeSwitcher mode={mode} onModeChange={setMode} isDark={isDark} disabled={loading} />

        {currentItems.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? colors.inputBackground : '#f5f5f5' }]}>
              <Ionicons name={mode === 'estadia' ? 'home-outline' : 'business-outline'} size={60} color={accentColor} />
            </View>
            <ThemedText style={[styles.emptyStateText, { color: colors.text }]}>{emptyText}</ThemedText>
            <ThemedText style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>{emptySubtext}</ThemedText>
            <TouchableOpacity style={styles.addButton} onPress={() => router.push('/sube-alojamiento')} activeOpacity={0.8}>
              <LinearGradient
                colors={mode === 'estadia' ? [ModeColors.estadia.accent, ModeColors.estadia.accentDark] : [ModeColors.comprar.accent, ModeColors.comprar.accentDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addButtonGradient}
              >
                <Ionicons name="add-circle" size={22} color="#FFF" />
                <ThemedText style={styles.addButtonText}>{addButtonText}</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.propertiesList}>
            {mode === 'estadia' ? (
              myProperties.map((property, index) => (
                <AnimatedPropertyCard
                  key={property.id}
                  property={property}
                  index={index}
                  isDark={isDark}
                  accentColor={accentColor}
                  onPress={() => router.push(`/${property.id}`)}
                  onCalendar={() => router.push(`/calendario/${property.id}`)}
                  onEdit={() => router.push(`/editar-alojamiento/${property.id}`)}
                  onDelete={() => handleDeleteProperty(property.id, property.title)}
                />
              ))
            ) : (
              mySaleProperties.map((property, index) => (
                <AnimatedSaleCard
                  key={property.id}
                  property={property}
                  index={index}
                  isDark={isDark}
                  accentColor={accentColor}
                  onPress={() => { }} // TODO: Navigate to sale property detail
                  onEdit={() => { }} // TODO: Navigate to edit sale property
                  onDelete={() => handleDeleteSaleProperty(property.id, property.title)}
                />
              ))
            )}

            {/* Add more button */}
            <TouchableOpacity
              style={[styles.addMoreButton, { backgroundColor: isDark ? colors.inputBackground : '#f9f9f9', borderColor: accentColor }]}
              onPress={() => router.push('/sube-alojamiento')}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={24} color={accentColor} />
              <ThemedText style={[styles.addMoreButtonText, { color: accentColor }]}>
                {mode === 'estadia' ? 'Publicar otro alojamiento' : 'Publicar otro inmueble'}
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
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center', alignItems: 'center', marginRight: 15,
  },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 4, letterSpacing: 0.3 },
  scrollContent: { paddingTop: 0 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingTop: 60 },
  emptyIconContainer: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyStateText: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  emptyStateSubtext: { fontSize: 15, marginTop: 10, textAlign: 'center', lineHeight: 22 },
  addButton: { marginTop: 30, borderRadius: 25, overflow: 'hidden' },
  addButtonGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 28, paddingVertical: 16, gap: 10 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  propertiesList: { paddingHorizontal: 15 },
  propertyCard: {
    borderRadius: 20, overflow: 'hidden', marginBottom: 20,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  imageContainer: { position: 'relative' },
  propertyImage: { width: '100%', height: 200 },
  imageGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 },
  ratingBadge: {
    position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 4,
  },
  ratingText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  typeBadge: {
    position: 'absolute', top: 12, left: 12,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  typeBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  estratoBadge: {
    position: 'absolute', top: 12, right: 12,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  estratoBadgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  propertyInfo: { padding: 16 },
  propertyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  propertyLocation: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  locationText: { fontSize: 14 },
  propertyStats: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontSize: 13 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  priceSymbol: { fontSize: 16, fontWeight: '600' },
  price: { fontSize: 22, fontWeight: 'bold' },
  priceLabel: { fontSize: 14 },
  salePrice: { fontSize: 24, fontWeight: 'bold' },
  actionsContainer: { flexDirection: 'row', gap: 8, borderTopWidth: 1, paddingTop: 16 },
  actionButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 10, gap: 5,
  },
  actionButtonText: { fontSize: 12, fontWeight: '600' },
  deleteButtonText: { fontSize: 12, fontWeight: '600' },
  addMoreButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 20, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', gap: 10, marginTop: 5,
  },
  addMoreButtonText: { fontSize: 16, fontWeight: '600' },
  bottomSpacing: { height: 40 },
});