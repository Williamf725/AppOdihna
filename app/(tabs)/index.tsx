import { ModeSwitch } from '@/components/ModeSwitch';
import { RealEstateView } from '@/components/RealEstateView';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { categories, Property } from '@/constants/mockData';
import { useAppMode } from '@/hooks/useAppMode';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { FEATURED_BADGES, FeaturedProperty, getFeaturedProperties } from '@/lib/featuredService';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  UIManager,
  useColorScheme,
  View
} from 'react-native';
import { normalize, normalizeFont } from '../../lib/normalize';

// Habilitar animaciones de layout para Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = height * 0.55;
const CAROUSEL_CARD_HEIGHT = height * 0.30;
const CAROUSEL_CARD_WIDTH = width * 0.65;

// ================================
// NOCTURNE LUXURY PALETTE
// ================================
const Colors = {
  light: {
    background: '#F5F5F0',
    cardBackground: '#FFFFFF',
    text: '#121212',
    textLight: '#FFFFFF',
    accent: '#D4AF37', // Dorado
    accentDark: '#AA8C2C',
    border: '#E0E0E0',
    divider: '#EBEBEB',
    shadow: '#000',
    inputBackground: '#FFFFFF',
    primaryButton: '#121212',
    glass: 'rgba(255,255,255,0.2)',
  },
  dark: {
    background: '#050505',
    cardBackground: '#121212',
    text: '#F0F0F0',
    textLight: '#FFFFFF',
    accent: '#D4AF37', // Dorado
    accentDark: '#F2D06B',
    border: '#333333',
    divider: '#222222',
    shadow: '#000',
    inputBackground: '#1E1E1E',
    primaryButton: '#D4AF37',
    glass: 'rgba(0,0,0,0.6)',
  },
};

// ================================
// ANIMATED PROPERTY CARD COMPONENT
// ================================
interface AnimatedPropertyCardProps {
  property: Property;
  index: number;
  onPress: () => void;
  isDark: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

function AnimatedPropertyCard({ property, index, onPress, isDark, isFavorite, onToggleFavorite }: AnimatedPropertyCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  const colors = isDark ? Colors.dark : Colors.light;

  useEffect(() => {
    const delay = index * 100;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    });
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  };

  const handleFavoritePress = () => {
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.3,
        useNativeDriver: true,
        friction: 3,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
      }),
    ]).start();
    onToggleFavorite();
  };

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.card, { shadowColor: colors.accent }]}
      >
        <Image
          source={{ uri: property.images[0] }}
          style={styles.cardImage}
          contentFit="cover"
          transition={500}
        />

        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'transparent', 'transparent', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']}
          locations={[0, 0.2, 0.5, 0.8, 1]}
          style={styles.cardGradient}
        />

        <View style={styles.cardTopRow}>
          <View style={styles.locationTag}>
            <ThemedText style={styles.locationTagLabel}>LOCATION</ThemedText>
            <View style={styles.locationRowValue}>
              {/* CORRECCIÓN: Se eliminó {property.city} para evitar duplicados */}
              <ThemedText style={styles.locationValue} numberOfLines={1}>
                {property.location}
              </ThemedText>
              <Ionicons name="chevron-down" size={12} color={colors.accent} />
            </View>
          </View>

          <TouchableOpacity style={styles.glassIconBtn} onPress={handleFavoritePress} activeOpacity={0.8}>
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={20}
                color={isFavorite ? '#EF4444' : '#FFF'}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>

        <View style={styles.cardBottomContent}>
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={12} color={colors.accent} />
            <ThemedText style={styles.ratingText}>{property.rating}</ThemedText>
          </View>

          <ThemedText style={styles.cardTitle} numberOfLines={2}>
            {property.title}
          </ThemedText>

          <View style={styles.cardFooterRow}>
            <View style={styles.amenitiesRow}>
              <Ionicons name="bed-outline" size={16} color={colors.accent} style={{ marginRight: 4 }} />
              <ThemedText style={styles.amenityText}>{property.bedrooms} Hab</ThemedText>
              <ThemedText style={styles.amenityDivider}>•</ThemedText>
              <Ionicons name="people-outline" size={16} color={colors.accent} style={{ marginRight: 4 }} />
              <ThemedText style={styles.amenityText}>{property.maxGuests} Huéspedes</ThemedText>
            </View>

            <View style={styles.priceContainer}>
              <ThemedText style={styles.priceSymbol}>$</ThemedText>
              <ThemedText style={styles.priceValue}>{property.price.toLocaleString()}</ThemedText>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ================================
// CAROUSEL PROPERTY CARD COMPONENT
// ================================
interface CarouselPropertyCardProps {
  property: Property;
  onPress: () => void;
  isDark: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

function CarouselPropertyCard({ property, onPress, isDark, isFavorite, onToggleFavorite }: CarouselPropertyCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const colors = isDark ? Colors.dark : Colors.light;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  };

  const handleFavoritePress = () => {
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.3,
        useNativeDriver: true,
        friction: 3,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
      }),
    ]).start();
    onToggleFavorite();
  };

  return (
    <Animated.View style={[styles.carouselCardContainer, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.carouselCard, { shadowColor: colors.accent }]}
      >
        <Image
          source={{ uri: property.images[0] }}
          style={styles.carouselCardImage}
          contentFit="cover"
          transition={400}
        />

        <LinearGradient
          colors={['rgba(0,0,0,0.2)', 'transparent', 'rgba(0,0,0,0.85)']}
          locations={[0, 0.4, 1]}
          style={styles.carouselCardGradient}
        />

        {/* Botón de favorito */}
        <TouchableOpacity
          style={styles.carouselFavoriteBtn}
          onPress={handleFavoritePress}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavorite ? '#EF4444' : '#FFF'}
            />
          </Animated.View>
        </TouchableOpacity>

        {/* Contenido inferior */}
        <View style={styles.carouselCardContent}>
          <View style={styles.carouselRatingPill}>
            <Ionicons name="star" size={10} color={colors.accent} />
            <ThemedText style={styles.carouselRatingText}>{property.rating}</ThemedText>
          </View>

          <ThemedText style={styles.carouselCardTitle} numberOfLines={2}>
            {property.title}
          </ThemedText>

          <View style={styles.carouselCardFooter}>
            <View style={styles.carouselAmenities}>
              <Ionicons name="bed-outline" size={12} color={colors.accent} />
              <ThemedText style={styles.carouselAmenityText}>{property.bedrooms}</ThemedText>
              <ThemedText style={styles.carouselDivider}>•</ThemedText>
              <Ionicons name="people-outline" size={12} color={colors.accent} />
              <ThemedText style={styles.carouselAmenityText}>{property.maxGuests}</ThemedText>
            </View>

            <View style={styles.carouselPriceContainer}>
              <ThemedText style={styles.carouselPriceSymbol}>$</ThemedText>
              <ThemedText style={styles.carouselPriceValue}>{property.price.toLocaleString()}</ThemedText>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ================================
// FEATURED SECTION COMPONENT
// ================================
interface FeaturedSectionProps {
  properties: FeaturedProperty[];
  isDark: boolean;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
}

function FeaturedSection({ properties, isDark, isFavorite, toggleFavorite }: FeaturedSectionProps) {
  const colors = isDark ? Colors.dark : Colors.light;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (properties.length > 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
        }),
      ]).start();
    }
  }, [properties]);

  if (properties.length === 0) return null;

  return (
    <Animated.View
      style={[
        styles.featuredSection,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }
      ]}
    >
      {/* Header con título premium */}
      <View style={styles.featuredHeader}>
        <View style={styles.featuredTitleRow}>
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.featuredIconBg}
          >
            <Ionicons name="diamond" size={16} color="#FFF" />
          </LinearGradient>
          <View>
            <ThemedText style={[styles.featuredTitle, { color: colors.text }]}>
              Destacados
            </ThemedText>
            <ThemedText style={[styles.featuredSubtitle, { color: colors.accent }]}>
              Los más populares de la comunidad
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Carrusel horizontal de destacados */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.featuredScrollContent}
        snapToInterval={width * 0.75 + 15}
        decelerationRate="fast"
      >
        {properties.map((property, index) => (
          <FeaturedPropertyCard
            key={`featured-${property.id}-${index}-${property.featured_reason}`}
            property={property}
            index={index}
            onPress={() => router.push(`/${property.id}`)}
            isDark={isDark}
            isFavorite={isFavorite(String(property.id))}
            onToggleFavorite={() => toggleFavorite(String(property.id))}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

// ================================
// FEATURED PROPERTY CARD COMPONENT
// ================================
interface FeaturedPropertyCardProps {
  property: FeaturedProperty;
  index: number;
  onPress: () => void;
  isDark: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

function FeaturedPropertyCard({ property, index, onPress, isDark, isFavorite, onToggleFavorite }: FeaturedPropertyCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const colors = isDark ? Colors.dark : Colors.light;
  const badge = FEATURED_BADGES[property.featured_reason] || FEATURED_BADGES['Mejor valorado'];

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handleFavoritePress = () => {
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.4,
        useNativeDriver: true,
        friction: 3,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
      }),
    ]).start();
    onToggleFavorite();
  };

  return (
    <Animated.View style={[styles.featuredCardContainer, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.featuredCard}
      >
        <Image
          source={{ uri: property.images[0] }}
          style={styles.featuredCardImage}
          contentFit="cover"
          transition={400}
        />

        {/* Gradiente overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.9)']}
          locations={[0, 0.3, 1]}
          style={styles.featuredCardGradient}
        />

        {/* Badge de destacado */}
        <View style={styles.featuredBadgeContainer}>
          <LinearGradient
            colors={badge.gradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.featuredBadge}
          >
            <Ionicons name={badge.icon as any} size={12} color="#FFF" />
            <ThemedText style={styles.featuredBadgeText}>
              {property.featured_reason}
            </ThemedText>
          </LinearGradient>
        </View>

        {/* Botón de favorito */}
        <TouchableOpacity
          style={styles.featuredFavoriteBtn}
          onPress={handleFavoritePress}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorite ? '#EF4444' : '#FFF'}
            />
          </Animated.View>
        </TouchableOpacity>

        {/* Contenido inferior */}
        <View style={styles.featuredCardContent}>
          <View style={styles.featuredRatingRow}>
            <View style={styles.featuredRatingPill}>
              <Ionicons name="star" size={12} color={colors.accent} />
              <ThemedText style={styles.featuredRatingText}>{property.rating}</ThemedText>
            </View>
            <ThemedText style={styles.featuredCityText}>{property.city}</ThemedText>
          </View>

          <ThemedText style={styles.featuredCardTitle} numberOfLines={2}>
            {property.title}
          </ThemedText>

          <View style={styles.featuredCardFooter}>
            <View style={styles.featuredAmenities}>
              <Ionicons name="bed-outline" size={14} color="#CCC" />
              <ThemedText style={styles.featuredAmenityText}>{property.bedrooms}</ThemedText>
              <ThemedText style={styles.featuredDivider}>•</ThemedText>
              <Ionicons name="people-outline" size={14} color="#CCC" />
              <ThemedText style={styles.featuredAmenityText}>{property.max_guests}</ThemedText>
            </View>

            <View style={styles.featuredPriceContainer}>
              <ThemedText style={styles.featuredPriceSymbol}>$</ThemedText>
              <ThemedText style={styles.featuredPriceValue}>
                {property.price.toLocaleString()}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Borde dorado premium */}
        <View style={[styles.featuredBorderOverlay, { borderColor: badge.color }]} />
      </Pressable>
    </Animated.View>
  );
}

// ================================
// CITY CAROUSEL SECTION COMPONENT
// ================================
interface CityCarouselSectionProps {
  city: string;
  properties: Property[];
  isDark: boolean;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
}

function CityCarouselSection({ city, properties, isDark, isFavorite, toggleFavorite }: CityCarouselSectionProps) {
  const colors = isDark ? Colors.dark : Colors.light;
  const scrollX = useRef(new Animated.Value(0)).current;

  return (
    <View style={styles.cityCarouselSection}>
      {/* Header de la ciudad */}
      <View style={styles.cityHeader}>
        <View>
          <ThemedText style={[styles.cityName, { color: colors.text }]}>{city}</ThemedText>
          <ThemedText style={[styles.citySubtitle, { color: colors.accent }]}>
            {properties.length} {properties.length === 1 ? 'alojamiento' : 'alojamientos'}
          </ThemedText>
        </View>
        <TouchableOpacity
          style={[styles.viewAllButton, { borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <ThemedText style={[styles.viewAllText, { color: colors.accent }]}>Ver todos</ThemedText>
          <Ionicons name="arrow-forward" size={14} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Carrusel horizontal */}
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselScrollContent}
        snapToInterval={CAROUSEL_CARD_WIDTH + 15}
        decelerationRate="fast"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {properties.map((property) => (
          <CarouselPropertyCard
            key={property.id}
            property={property}
            onPress={() => router.push(`/${property.id}`)}
            isDark={isDark}
            isFavorite={isFavorite(String(property.id))}
            onToggleFavorite={() => toggleFavorite(String(property.id))}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { profile } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { mode, modeColors, isEstadia } = useAppMode();

  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);

  const [guestsModalVisible, setGuestsModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);

  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [isComprarFiltersVisible, setIsComprarFiltersVisible] = useState(true); // Open by default for dramatic entrance

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [featuredProperties, setFeaturedProperties] = useState<FeaturedProperty[]>([]);

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

      setProperties(formattedProperties);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadFeaturedProperties = async () => {
    try {
      const featured = await getFeaturedProperties();
      setFeaturedProperties(featured);
    } catch (error) {
      console.error('Error loading featured properties:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProperties();
      loadFeaturedProperties();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadProperties();
    loadFeaturedProperties();
  };

  const isPropertyAvailable = (property: Property, checkInDate: Date, checkOutDate: Date): boolean => {
    if (!property.blockedDates || !Array.isArray(property.blockedDates) || property.blockedDates.length === 0) {
      return true;
    }
    const searchDates: string[] = [];
    const current = new Date(checkInDate);
    while (current <= checkOutDate) {
      const dateString = current.toISOString().split('T')[0];
      searchDates.push(dateString);
      current.setDate(current.getDate() + 1);
    }
    return !searchDates.some(date => property.blockedDates.includes(date));
  };

  const filteredProperties = useMemo(() => {
    let filtered = properties;
    if (selectedCategory !== 'todos') {
      filtered = filtered.filter(property =>
        property.tags.some(tag =>
          tag.toLowerCase() === selectedCategory.toLowerCase()
        )
      );
    }
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(property =>
        property.title.toLowerCase().includes(query) ||
        property.location.toLowerCase().includes(query) ||
        property.city.toLowerCase().includes(query)
      );
    }
    if (searchActive && checkIn && checkOut) {
      filtered = filtered.filter(property =>
        isPropertyAvailable(property, checkIn, checkOut)
      );
    }
    if (searchActive) {
      const totalGuests = adults + children;
      filtered = filtered.filter(property => {
        const propertyMaxGuests = property.maxGuests || 10;
        const propertyBedrooms = property.bedrooms || 1;
        return propertyMaxGuests >= totalGuests && propertyBedrooms >= rooms;
      });
    }
    return filtered;
  }, [searchQuery, selectedCategory, properties, searchActive, checkIn, checkOut, adults, children, rooms]);

  // Agrupar propiedades por ciudad para los carruseles
  const propertiesByCity = useMemo(() => {
    const cityMap: { [key: string]: Property[] } = {};
    properties.forEach(property => {
      const city = property.city || 'Otros';
      if (!cityMap[city]) {
        cityMap[city] = [];
      }
      cityMap[city].push(property);
    });
    // Ordenar por cantidad de propiedades y limitar a las 3 ciudades con más propiedades
    return Object.entries(cityMap)
      .filter(([_, props]) => props.length >= 2) // Solo ciudades con 2+ propiedades
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3);
  }, [properties]);

  const onCheckInChange = (event: any, selectedDate?: Date) => {
    setShowCheckInPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setCheckIn(selectedDate);
      if (checkOut && selectedDate > checkOut) {
        setCheckOut(null);
      }
    }
  };

  const onCheckOutChange = (event: any, selectedDate?: Date) => {
    setShowCheckOutPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setCheckOut(selectedDate);
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    });
  };

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
    setIsFiltersVisible(false);
  };

  const handleClearSearch = () => {
    setCheckIn(null);
    setCheckOut(null);
    setAdults(2);
    setChildren(0);
    setRooms(1);
    setSearchActive(false);
  };

  const toggleFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsFiltersVisible(!isFiltersVisible);
  };

  if (loading) {
    return (
      <ThemedView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />

      {/* HEADER ELEGANTE */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {isEstadia && (
              <Image
                source={{ uri: 'https://res.cloudinary.com/dvpnkr2i9/image/upload/v1770446460/LogoOdihna_thsha2.jpg' }}
                style={{ width: 45, height: 45, borderRadius: 22.5 }}
                contentFit="cover"
              />
            )}
            <View>
              <ThemedText style={[styles.logoText, { color: colors.text }]}>ODIHNA</ThemedText>
              <ThemedText style={[styles.logoSubtext, { color: isEstadia ? colors.accent : modeColors.accent }]}>
                {isEstadia ? 'Experiencias Unicas' : 'Bienes Raíces'}
              </ThemedText>
            </View>
          </View>

          <View style={styles.headerRightButtons}>
            {/* Mode Switch */}
            <ModeSwitch isDark={isDark} />

            {/* Search button - Estadía */}
            {isEstadia && (
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: isFiltersVisible ? colors.accent : colors.inputBackground, marginLeft: 10 }]}
                onPress={toggleFilters}
              >
                <Ionicons name="search" size={22} color={isFiltersVisible ? '#FFF' : colors.text} />
              </TouchableOpacity>
            )}

            {/* Search button - Comprar */}
            {!isEstadia && (
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: isComprarFiltersVisible ? modeColors.accent : colors.inputBackground, marginLeft: 10 }]}
                onPress={() => setIsComprarFiltersVisible(!isComprarFiltersVisible)}
              >
                <Ionicons name="search" size={22} color={isComprarFiltersVisible ? '#FFF' : colors.text} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.iconButton, { marginLeft: 10, backgroundColor: colors.inputBackground }]}
              onPress={() => setMenuVisible(true)}
            >
              <Ionicons name="menu" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* FILTROS DESPLEGABLES - Solo en modo Estadía */}
        {isEstadia && isFiltersVisible && (
          <View style={styles.collapsibleContainer}>
            <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={18} color={colors.text} style={{ opacity: 0.5 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Buscar destino..."
                placeholderTextColor={isDark ? '#666' : '#999'}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ alignItems: 'center' }}>
              {/* BOTON FECHA LLEGADA */}
              <TouchableOpacity
                style={[styles.filterChip, { borderColor: checkIn ? colors.accent : colors.border, backgroundColor: checkIn ? 'rgba(212, 175, 55, 0.1)' : 'transparent' }]}
                onPress={() => setShowCheckInPicker(true)}
              >
                <Ionicons name="calendar-outline" size={14} color={checkIn ? colors.accent : colors.text} />
                <ThemedText style={[styles.filterText, { color: checkIn ? colors.accent : colors.text }]}>
                  {checkIn ? formatDate(checkIn) : 'Llegada'}
                </ThemedText>
              </TouchableOpacity>

              {/* BOTON FECHA SALIDA */}
              <TouchableOpacity
                style={[styles.filterChip, { borderColor: checkOut ? colors.accent : colors.border, backgroundColor: checkOut ? 'rgba(212, 175, 55, 0.1)' : 'transparent' }]}
                onPress={() => setShowCheckOutPicker(true)}
              >
                <Ionicons name="calendar-outline" size={14} color={checkOut ? colors.accent : colors.text} />
                <ThemedText style={[styles.filterText, { color: checkOut ? colors.accent : colors.text }]}>
                  {checkOut ? formatDate(checkOut) : 'Salida'}
                </ThemedText>
              </TouchableOpacity>

              {/* HUESPEDES */}
              <TouchableOpacity
                style={[styles.filterChip, { borderColor: colors.border }]}
                onPress={() => setGuestsModalVisible(true)}
              >
                <Ionicons name="people-outline" size={14} color={colors.text} />
                <ThemedText style={[styles.filterText, { color: colors.text }]}>
                  {adults + children}
                </ThemedText>
              </TouchableOpacity>

              {(!searchActive && checkIn && checkOut) && (
                <TouchableOpacity style={[styles.filterChip, { backgroundColor: colors.accent, borderColor: colors.accent }]} onPress={handleSearch}>
                  <ThemedText style={[styles.filterText, { color: '#FFF' }]}>Buscar</ThemedText>
                </TouchableOpacity>
              )}

              {searchActive && (
                <TouchableOpacity style={[styles.filterChip, { backgroundColor: colors.text }]} onPress={handleClearSearch}>
                  <ThemedText style={[styles.filterText, { color: colors.background }]}>Limpiar</ThemedText>
                </TouchableOpacity>
              )}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryItem,
                    selectedCategory === category.tag && { backgroundColor: colors.accent }
                  ]}
                  onPress={() => setSelectedCategory(category.tag)}
                >
                  <ThemedText style={[
                    styles.categoryText,
                    { color: selectedCategory === category.tag ? '#FFF' : colors.text, fontWeight: selectedCategory === category.tag ? '700' : '400' }
                  ]}>
                    {category.name}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* CONTENIDO PRINCIPAL - Condicional según modo */}
      {isEstadia ? (
        /* LISTA DE ALOJAMIENTOS - MODO ESTADÍA */
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          {/* SECCIÓN DE DESTACADOS - Solo cuando no hay filtros activos */}
          {!searchActive && !searchQuery.trim() && selectedCategory === 'todos' && featuredProperties.length > 0 && (
            <FeaturedSection
              properties={featuredProperties}
              isDark={isDark}
              isFavorite={isFavorite}
              toggleFavorite={toggleFavorite}
            />
          )}

          {/* CARRUSELES POR CIUDAD - Solo cuando no hay filtros activos */}
          {!searchActive && !searchQuery.trim() && selectedCategory === 'todos' && propertiesByCity.length > 0 && (
            <View style={styles.cityCarouselsWrapper}>
              <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
                Explora por Ciudad
              </ThemedText>
              {propertiesByCity.map(([city, cityProperties]) => (
                <CityCarouselSection
                  key={city}
                  city={city}
                  properties={cityProperties}
                  isDark={isDark}
                  isFavorite={isFavorite}
                  toggleFavorite={toggleFavorite}
                />
              ))}

              {/* Separador */}
              <View style={styles.sectionDivider}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <ThemedText style={[styles.dividerText, { color: colors.text }]}>
                  Todos los alojamientos
                </ThemedText>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>
            </View>
          )}

          {filteredProperties.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="telescope-outline" size={60} color={colors.accent} style={{ opacity: 0.5 }} />
              <ThemedText style={[styles.emptyText, { color: colors.text }]}>No encontramos alojamientos</ThemedText>
            </View>
          ) : (
            filteredProperties.map((property, index) => (
              <AnimatedPropertyCard
                key={property.id}
                property={property}
                index={index}
                onPress={() => router.push(`/${property.id}`)}
                isDark={isDark}
                isFavorite={isFavorite(String(property.id))}
                onToggleFavorite={() => toggleFavorite(String(property.id))}
              />
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        /* MODO COMPRAR - VISTA INMOBILIARIA */
        <RealEstateView
          isDark={isDark}
          isFiltersVisible={isComprarFiltersVisible}
          onToggleFilters={() => setIsComprarFiltersVisible(!isComprarFiltersVisible)}
        />
      )}

      {/* PICKERS */}
      {showCheckInPicker && (
        <DateTimePicker
          value={checkIn || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onCheckInChange}
          minimumDate={new Date()}
        />
      )}

      {showCheckOutPicker && (
        <DateTimePicker
          value={checkOut || (checkIn ? new Date(checkIn.getTime() + 86400000) : new Date())}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onCheckOutChange}
          minimumDate={checkIn || new Date()}
        />
      )}

      {/* MODAL HUESPEDES */}
      <Modal visible={guestsModalVisible} transparent animationType="fade" onRequestClose={() => setGuestsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: colors.text }]}>Huéspedes</ThemedText>
              <TouchableOpacity onPress={() => setGuestsModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={[styles.counterRow, { borderBottomColor: colors.divider }]}>
                <ThemedText style={{ color: colors.text }}>Adultos</ThemedText>
                <View style={styles.counterControls}>
                  <TouchableOpacity onPress={() => setAdults(Math.max(1, adults - 1))}><Ionicons name="remove-circle-outline" size={28} color={colors.text} /></TouchableOpacity>
                  <ThemedText style={{ color: colors.text, width: 30, textAlign: 'center' }}>{adults}</ThemedText>
                  <TouchableOpacity onPress={() => setAdults(adults + 1)}><Ionicons name="add-circle-outline" size={28} color={colors.text} /></TouchableOpacity>
                </View>
              </View>
              <View style={[styles.counterRow, { borderBottomColor: colors.divider }]}>
                <ThemedText style={{ color: colors.text }}>Niños</ThemedText>
                <View style={styles.counterControls}>
                  <TouchableOpacity onPress={() => setChildren(Math.max(0, children - 1))}><Ionicons name="remove-circle-outline" size={28} color={colors.text} /></TouchableOpacity>
                  <ThemedText style={{ color: colors.text, width: 30, textAlign: 'center' }}>{children}</ThemedText>
                  <TouchableOpacity onPress={() => setChildren(children + 1)}><Ionicons name="add-circle-outline" size={28} color={colors.text} /></TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity style={[styles.applyButton, { backgroundColor: colors.primaryButton }]} onPress={() => setGuestsModalVisible(false)}>
                <ThemedText style={{ color: isDark ? colors.background : '#FFF', fontWeight: 'bold' }}>Aplicar</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MENU MODAL COMPLETO */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <View style={styles.menuOverlay}>
          <View style={[styles.menuContainer, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.menuHeader}>
              <ThemedText style={[styles.menuTitle, { color: colors.text }]}>Menú</ThemedText>
              <TouchableOpacity onPress={() => setMenuVisible(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* 1. Mi Perfil */}
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); router.push('/profile'); }}>
                <Ionicons name="person-outline" size={20} color={colors.text} />
                <ThemedText style={[styles.menuItemText, { color: colors.text }]}>Mi Perfil</ThemedText>
              </TouchableOpacity>

              {/* 2. Mis Reservas (Si NO es host) */}
              {profile?.role !== 'host' && (
                <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); router.push('/mis-reservas'); }}>
                  <Ionicons name="calendar-outline" size={20} color={colors.text} />
                  <ThemedText style={[styles.menuItemText, { color: colors.text }]}>Mis Reservas / Propuestas</ThemedText>
                </TouchableOpacity>
              )}

              {/* 3, 4, 5. Opciones de Host */}
              {profile?.role === 'host' && (
                <>
                  <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); router.push('/sube-alojamiento'); }}>
                    <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
                    <ThemedText style={[styles.menuItemText, { color: colors.text }]}>Publicar Alojamiento / Inmueble</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); router.push('/mis-alojamientos'); }}>
                    <Ionicons name="home-outline" size={20} color={colors.text} />
                    <ThemedText style={[styles.menuItemText, { color: colors.text }]}>Mis Alojamientos / Inmuebles</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); router.push('/gestionar-reservas'); }}>
                    <Ionicons name="receipt-outline" size={20} color={colors.text} />
                    <ThemedText style={[styles.menuItemText, { color: colors.text }]}>Gestionar Reservas / Propuestas</ThemedText>
                  </TouchableOpacity>
                </>
              )}

              {/* 6. Mis Favoritos */}
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); router.push('/mis-favoritos'); }}>
                <Ionicons name="heart-outline" size={20} color={colors.accent} />
                <ThemedText style={[styles.menuItemText, { color: colors.text }]}>Mis Favoritos</ThemedText>
              </TouchableOpacity>

              {/* 7. Trabaja con Nosotros */}
              <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => { setMenuVisible(false); router.push('/trabaja-con-nosotros'); }}>
                <Ionicons name="briefcase-outline" size={20} color={colors.text} />
                <ThemedText style={[styles.menuItemText, { color: colors.text }]}>Trabaja con Nosotros</ThemedText>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>

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
  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? normalize(50) : normalize(40),
    paddingBottom: normalize(10),
    paddingHorizontal: normalize(20),
    zIndex: 100,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: normalize(10),
  },
  logoText: {
    fontSize: normalizeFont(20),
    fontWeight: '900',
    letterSpacing: normalize(2),
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
  },
  logoSubtext: {
    fontSize: normalizeFont(10),
    fontWeight: '400',
    letterSpacing: normalize(1),
    textTransform: 'uppercase',
  },
  headerRightButtons: {
    flexDirection: 'row',
  },
  iconButton: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Collapsible Search
  collapsibleContainer: {
    marginTop: normalize(10),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: normalize(45),
    borderRadius: normalize(25),
    paddingHorizontal: normalize(15),
    borderWidth: 1,
    marginBottom: normalize(15),
  },
  searchInput: {
    flex: 1,
    marginLeft: normalize(10),
    fontSize: normalizeFont(14),
    height: '100%',
  },
  filterScroll: {
    marginBottom: normalize(15),
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: normalize(14),
    paddingVertical: normalize(8),
    borderRadius: normalize(20),
    borderWidth: 1,
    marginRight: normalize(8),
    gap: normalize(6),
  },
  filterText: {
    fontSize: normalizeFont(12),
    fontWeight: '500',
  },
  categoriesScroll: {
    paddingBottom: normalize(10),
    gap: normalize(10),
  },
  categoryItem: {
    paddingHorizontal: normalize(16),
    paddingVertical: normalize(8),
    borderRadius: normalize(20),
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  categoryText: {
    fontSize: normalizeFont(12),
  },

  // Content
  scrollContent: {
    paddingHorizontal: normalize(15),
    paddingTop: normalize(10),
  },

  // Property Card
  cardContainer: {
    marginBottom: normalize(25),
  },
  card: {
    height: CARD_HEIGHT,
    borderRadius: normalize(35),
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
    elevation: 10,
    shadowOffset: { width: 0, height: normalize(10) },
    shadowOpacity: 0.3,
    shadowRadius: normalize(20),
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },

  // Card Top
  cardTopRow: {
    position: 'absolute',
    top: normalize(25),
    left: normalize(20),
    right: normalize(20),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  locationTag: {
    marginTop: normalize(10),
  },
  locationTagLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: normalizeFont(10),
    letterSpacing: normalize(1.5),
    fontWeight: '700',
    marginBottom: normalize(2),
  },
  locationRowValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(4),
  },
  locationValue: {
    color: '#FFF',
    fontSize: normalizeFont(16),
    fontWeight: '600',
    maxWidth: normalize(200),
  },
  glassIconBtn: {
    width: normalize(44),
    height: normalize(44),
    borderRadius: normalize(22),
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  // Card Bottom
  cardBottomContent: {
    position: 'absolute',
    bottom: normalize(30),
    left: normalize(25),
    right: normalize(25),
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(6),
    borderRadius: normalize(12),
    alignSelf: 'flex-start',
    marginBottom: normalize(12),
    gap: normalize(4),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ratingText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: normalizeFont(12),
  },
  cardTitle: {
    color: '#FFF',
    fontSize: normalizeFont(32),
    fontWeight: '700',
    marginBottom: normalize(15),
    lineHeight: normalizeFont(36),
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: normalize(2) },
    textShadowRadius: normalize(4),
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amenitiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amenityText: {
    color: '#DDD',
    fontSize: normalizeFont(12),
  },
  amenityDivider: {
    color: '#666',
    marginHorizontal: normalize(8),
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: normalize(12),
    paddingVertical: normalize(8),
    borderRadius: normalize(16),
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.5)',
  },
  priceSymbol: {
    color: '#D4AF37',
    fontSize: normalizeFont(14),
    fontWeight: '600',
    marginTop: normalize(2),
    marginRight: normalize(2),
  },
  priceValue: {
    color: '#FFF',
    fontSize: normalizeFont(20),
    fontWeight: '700',
  },

  // States
  emptyState: {
    alignItems: 'center',
    paddingVertical: normalize(100),
    gap: normalize(15),
  },
  emptyText: {
    fontSize: normalizeFont(16),
  },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: normalize(20) },
  modalContent: { borderRadius: normalize(20), padding: normalize(20) },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: normalize(20) },
  modalTitle: { fontSize: normalizeFont(18), fontWeight: 'bold' },
  modalBody: { gap: normalize(15) },
  counterRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: normalize(15), borderBottomWidth: 1 },
  counterControls: { flexDirection: 'row', alignItems: 'center', gap: normalize(10) },
  applyButton: { padding: normalize(15), borderRadius: normalize(12), alignItems: 'center', marginTop: normalize(10) },

  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  menuContainer: { borderTopLeftRadius: normalize(25), borderTopRightRadius: normalize(25), padding: normalize(25), minHeight: normalize(350), maxHeight: '80%' },
  menuHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: normalize(20) },
  menuTitle: { fontSize: normalizeFont(22), fontWeight: 'bold' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: normalize(15), gap: normalize(15), borderBottomWidth: 0.5, borderBottomColor: '#333' },
  menuItemText: { fontSize: normalizeFont(16) },

  // ================================
  // CITY CAROUSEL STYLES
  // ================================
  cityCarouselsWrapper: {
    marginBottom: normalize(20),
  },
  sectionTitle: {
    fontSize: normalizeFont(24),
    fontWeight: '700',
    marginBottom: normalize(20),
    letterSpacing: normalize(0.5),
  },
  cityCarouselSection: {
    marginBottom: normalize(25),
  },
  cityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: normalize(15),
    paddingRight: normalize(5),
  },
  cityName: {
    fontSize: normalizeFont(20),
    fontWeight: '700',
    letterSpacing: normalize(0.3),
  },
  citySubtitle: {
    fontSize: normalizeFont(12),
    fontWeight: '500',
    marginTop: normalize(2),
    textTransform: 'uppercase',
    letterSpacing: normalize(1),
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: normalize(12),
    paddingVertical: normalize(8),
    borderRadius: normalize(20),
    borderWidth: 1,
    gap: normalize(5),
  },
  viewAllText: {
    fontSize: normalizeFont(12),
    fontWeight: '600',
  },
  carouselScrollContent: {
    paddingLeft: 0,
    paddingRight: normalize(20),
    gap: normalize(15),
  },

  // Carousel Card Styles
  carouselCardContainer: {
    width: CAROUSEL_CARD_WIDTH,
    marginRight: normalize(15),
  },
  carouselCard: {
    width: '100%',
    height: CAROUSEL_CARD_HEIGHT,
    borderRadius: normalize(24),
    overflow: 'hidden',
    backgroundColor: '#000',
    elevation: 8,
    shadowOffset: { width: 0, height: normalize(6) },
    shadowOpacity: 0.25,
    shadowRadius: normalize(12),
  },
  carouselCardImage: {
    width: '100%',
    height: '100%',
  },
  carouselCardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  carouselFavoriteBtn: {
    position: 'absolute',
    top: normalize(12),
    right: normalize(12),
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  carouselCardContent: {
    position: 'absolute',
    bottom: normalize(15),
    left: normalize(15),
    right: normalize(15),
  },
  carouselRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: normalize(8),
    paddingVertical: normalize(4),
    borderRadius: normalize(10),
    alignSelf: 'flex-start',
    marginBottom: normalize(8),
    gap: normalize(3),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  carouselRatingText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: normalizeFont(10),
  },
  carouselCardTitle: {
    color: '#FFF',
    fontSize: normalizeFont(16),
    fontWeight: '700',
    marginBottom: normalize(8),
    lineHeight: normalizeFont(20),
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: normalize(1) },
    textShadowRadius: normalize(3),
  },
  carouselCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  carouselAmenities: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(4),
  },
  carouselAmenityText: {
    color: '#DDD',
    fontSize: normalizeFont(10),
  },
  carouselDivider: {
    color: '#666',
    marginHorizontal: normalize(4),
    fontSize: normalizeFont(10),
  },
  carouselPriceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(212, 175, 55, 0.25)',
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(5),
    borderRadius: normalize(12),
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.5)',
  },
  carouselPriceSymbol: {
    color: '#D4AF37',
    fontSize: normalizeFont(10),
    fontWeight: '600',
    marginTop: normalize(1),
    marginRight: normalize(1),
  },
  carouselPriceValue: {
    color: '#FFF',
    fontSize: normalizeFont(14),
    fontWeight: '700',
  },

  // Section Divider
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: normalize(10),
    marginBottom: normalize(20),
    paddingHorizontal: normalize(10),
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: normalizeFont(13),
    fontWeight: '600',
    marginHorizontal: normalize(15),
    opacity: 0.7,
  },

  // ================================
  // FEATURED SECTION STYLES
  // ================================
  featuredSection: {
    marginBottom: normalize(30),
  },
  featuredHeader: {
    marginBottom: normalize(20),
  },
  featuredTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(12),
  },
  featuredIconBg: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredTitle: {
    fontSize: normalizeFont(22),
    fontWeight: '800',
    letterSpacing: normalize(0.5),
  },
  featuredSubtitle: {
    fontSize: normalizeFont(12),
    fontWeight: '500',
    letterSpacing: normalize(0.5),
    textTransform: 'uppercase',
    marginTop: normalize(2),
  },
  featuredScrollContent: {
    paddingRight: normalize(20),
    gap: normalize(15),
  },

  // Featured Card
  featuredCardContainer: {
    width: width * 0.75,
  },
  featuredCard: {
    width: '100%',
    height: height * 0.40,
    borderRadius: normalize(28),
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  featuredCardImage: {
    width: '100%',
    height: '100%',
  },
  featuredCardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  featuredBadgeContainer: {
    position: 'absolute',
    top: normalize(15),
    left: normalize(15),
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: normalize(12),
    paddingVertical: normalize(6),
    borderRadius: normalize(20),
    gap: normalize(6),
  },
  featuredBadgeText: {
    color: '#FFF',
    fontSize: normalizeFont(11),
    fontWeight: '700',
    letterSpacing: normalize(0.3),
  },
  featuredFavoriteBtn: {
    position: 'absolute',
    top: normalize(15),
    right: normalize(15),
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  featuredCardContent: {
    position: 'absolute',
    bottom: normalize(20),
    left: normalize(20),
    right: normalize(20),
  },
  featuredRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: normalize(8),
  },
  featuredRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(5),
    borderRadius: normalize(12),
    gap: normalize(4),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  featuredRatingText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: normalizeFont(12),
  },
  featuredCityText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: normalizeFont(12),
    fontWeight: '500',
  },
  featuredCardTitle: {
    color: '#FFF',
    fontSize: normalizeFont(20),
    fontWeight: '700',
    marginBottom: normalize(12),
    lineHeight: normalizeFont(24),
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: normalize(1) },
    textShadowRadius: normalize(3),
  },
  featuredCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredAmenities: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(5),
  },
  featuredAmenityText: {
    color: '#CCC',
    fontSize: normalizeFont(12),
  },
  featuredDivider: {
    color: '#666',
    marginHorizontal: normalize(3),
  },
  featuredPriceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(212, 175, 55, 0.3)',
    paddingHorizontal: normalize(12),
    paddingVertical: normalize(6),
    borderRadius: normalize(14),
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.6)',
  },
  featuredPriceSymbol: {
    color: '#D4AF37',
    fontSize: normalizeFont(12),
    fontWeight: '600',
    marginTop: normalize(1),
    marginRight: normalize(2),
  },
  featuredPriceValue: {
    color: '#FFF',
    fontSize: normalizeFont(16),
    fontWeight: '700',
  },
  featuredBorderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: normalize(28),
    borderWidth: 2,
    borderColor: 'transparent',
  },
});