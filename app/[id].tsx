// app/[id].tsx
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { mainHost, Property } from '@/constants/mockData';
import { useAuth } from '@/hooks/useAuth';
import {
  calculateNights,
  calculatePricing,
  checkAvailability,
  createBooking,
} from '@/lib/bookingService';
import { trackPropertyView } from '@/lib/featuredService';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';

const { width } = Dimensions.get('window');

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
    primary: '#121212',
    whatsapp: '#25D366',
    danger: '#EF4444',
    success: '#10B981',
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
    primary: '#D4AF37',
    whatsapp: '#25D366',
    danger: '#EF4444',
    success: '#10B981',
  },
};

export default function PropertyDetailScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { id } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Estados para reserva
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [selectingDate, setSelectingDate] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');

  // Cargar propiedad desde Supabase
  useEffect(() => {
    const loadProperty = async () => {
      try {
        // Consultar propiedad y datos del dueño (perfil)
        const { data, error } = await supabase
          .from('properties')
          .select(`
            *,
            owner:profiles!owner_id(id, full_name, avatar_url, created_at, email, phone)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        // Formatear datos del anfitrión
        const hostData = data.owner ? {
          id: data.owner.id,
          name: data.owner.full_name || 'Anfitrión',
          joinedDate: data.owner.created_at
            ? new Date(data.owner.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
            : 'Fecha desconocida',
          avatar: data.owner.avatar_url
            ? { uri: data.owner.avatar_url }
            : require('@/assets/images/icon.png'),
          email: data.owner.email,
          phone: data.owner.phone
        } : mainHost;

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
          blockedDates: Array.isArray(data.blocked_dates) ? data.blocked_dates : [],
          host: hostData,
          reviews: [],
        };

        setProperty(formattedProperty);

        // Registrar visualización para estadísticas de destacados
        trackPropertyView(formattedProperty.id, user?.id);
      } catch (error) {
        console.error('Error loading property:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProperty();
  }, [id]);

  // Animación de entrada
  useEffect(() => {
    if (!loading && property) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, property]);

  // Crear objeto de fechas marcadas para el calendario
  const getMarkedDates = () => {
    if (!property) return {};

    const marked: any = {};

    // Marcar fechas bloqueadas
    property.blockedDates?.forEach((date: string) => {
      marked[date] = {
        disabled: true,
        disableTouchEvent: true,
        dotColor: colors.danger,
        marked: true,
      };
    });

    // Marcar check-in seleccionado
    if (checkIn) {
      const checkInStr = checkIn.toISOString().split('T')[0];
      marked[checkInStr] = {
        ...marked[checkInStr],
        selected: true,
        selectedColor: colors.primary,
        startingDay: true,
      };
    }

    // Marcar check-out seleccionado
    if (checkOut) {
      const checkOutStr = checkOut.toISOString().split('T')[0];
      marked[checkOutStr] = {
        ...marked[checkOutStr],
        selected: true,
        selectedColor: colors.accent,
        endingDay: true,
      };
    }

    // Marcar rango entre check-in y check-out
    if (checkIn && checkOut) {
      const currentDate = new Date(checkIn);
      currentDate.setDate(currentDate.getDate() + 1);
      while (currentDate < checkOut) {
        const dateStr = currentDate.toISOString().split('T')[0];
        if (!marked[dateStr]?.disabled) {
          marked[dateStr] = {
            selected: true,
            selectedColor: `${colors.accent}30`,
            textColor: colors.accent,
          };
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return marked;
  };

  // Manejar selección de fecha
  const handleDateSelect = (day: DateData) => {
    const selectedDate = new Date(day.dateString);

    // Verificar si la fecha está bloqueada
    if (property?.blockedDates?.includes(day.dateString)) {
      Alert.alert('Fecha no disponible', 'Esta fecha no está disponible para reservar.');
      return;
    }

    if (selectingDate === 'checkIn') {
      setCheckIn(selectedDate);
      setCheckOut(null);
      setSelectingDate('checkOut');
    } else {
      if (checkIn && selectedDate <= checkIn) {
        Alert.alert('Fecha inválida', 'La fecha de salida debe ser posterior a la de entrada.');
        return;
      }
      setCheckOut(selectedDate);
      setSelectingDate('checkIn');
    }
  };

  // Calcular precios
  const getPricing = () => {
    if (!property || !checkIn || !checkOut) return null;

    const nights = calculateNights(checkIn, checkOut);
    return {
      nights,
      ...calculatePricing(property.price, nights),
    };
  };

  // Manejar reserva
  const handleBooking = async () => {
    if (!user) {
      Alert.alert(
        'Inicia sesión',
        'Debes iniciar sesión para hacer una reserva.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Iniciar sesión', onPress: () => router.push('/auth/login') },
        ]
      );
      return;
    }

    if (!checkIn || !checkOut || !property) {
      Alert.alert('Error', 'Por favor selecciona las fechas de entrada y salida.');
      return;
    }

    const totalGuests = adults + children;
    if (totalGuests > property.maxGuests) {
      Alert.alert(
        'Demasiados huéspedes',
        `Este alojamiento permite un máximo de ${property.maxGuests} huéspedes.`
      );
      return;
    }

    setBookingLoading(true);

    try {
      // Verificar disponibilidad
      const { available, blockedDates } = await checkAvailability(
        property.id,
        checkIn,
        checkOut
      );

      if (!available) {
        Alert.alert(
          'Fechas no disponibles',
          `Algunas de las fechas seleccionadas ya no están disponibles: ${blockedDates.join(', ')}. Por favor selecciona otras fechas.`
        );
        setBookingLoading(false);
        return;
      }

      const pricing = getPricing();
      if (!pricing) throw new Error('Error al calcular precios');

      // Asegurar que el perfil existe antes de reservar
      let guestProfile = profile;
      if (!guestProfile) {
        console.log('Perfil no encontrado en contexto, verificando en base de datos...');
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (existingProfile) {
          guestProfile = existingProfile;
        } else {
          console.log('Perfil no existe, creando uno nuevo...');
          const { data: newProfile, error: createProfileError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.email?.split('@')[0] || 'Usuario',
              role: 'guest',
            })
            .select()
            .single();

          if (createProfileError) {
            console.error('Error creando perfil:', createProfileError);
            throw new Error('No se pudo crear el perfil de usuario. Contacta soporte.');
          }
          guestProfile = newProfile;
        }
      }

      // Crear reserva
      const booking = await createBooking({
        guest_id: user.id,
        property_id: property.id,
        check_in_date: checkIn.toISOString().split('T')[0],
        check_out_date: checkOut.toISOString().split('T')[0],
        adults,
        children,
        total_guests: totalGuests,
        price_per_night: property.price,
        number_of_nights: pricing.nights,
        subtotal: pricing.subtotal,
        service_fee: pricing.serviceFee,
        taxes: pricing.taxes,
        total_price: pricing.total,
        guest_email: guestProfile?.email || user.email,
        guest_phone: guestProfile?.phone || undefined,
      });

      setConfirmationCode(booking.confirmation_code);
      setShowBookingModal(false);
      setShowConfirmation(true);

      // Recargar propiedad para actualizar fechas bloqueadas
      const { data: updatedProperty } = await supabase
        .from('properties')
        .select('blocked_dates')
        .eq('id', property.id)
        .single();

      if (updatedProperty) {
        setProperty({
          ...property,
          blockedDates: updatedProperty.blocked_dates || [],
        });
      }
    } catch (error: any) {
      console.error('Error creating booking:', error);

      if (error?.code === '42P01' || error?.code === '42703' || error?.message?.includes('does not exist')) {
        Alert.alert(
          'Tabla no configurada',
          'La tabla de reservas aún no ha sido creada en la base de datos. Por favor configura la tabla "bookings" en Supabase usando el SQL proporcionado en docs/database_schema_bookings.md'
        );
      } else {
        Alert.alert('Error', 'No se pudo completar la reserva. Por favor intenta de nuevo.');
      }
    } finally {
      setBookingLoading(false);
    }
  };

  const handleWhatsApp = () => {
    if (property) {
      const message = `Hola! Estoy interesado en el alojamiento "${property.title}" en ${property.location}`;
      const url = `https://wa.me/${mainHost.whatsappNumber}?text=${encodeURIComponent(message)}`;
      Linking.openURL(url);
    }
  };

  const resetBookingForm = () => {
    setCheckIn(null);
    setCheckOut(null);
    setAdults(2);
    setChildren(0);
    setSelectingDate('checkIn');
  };

  if (loading) {
    return (
      <ThemedView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando alojamiento...</ThemedText>
      </ThemedView>
    );
  }

  if (!property) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.accent} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.accent} />
          <ThemedText style={[styles.errorText, { color: colors.textSecondary }]}>Alojamiento no encontrado</ThemedText>
          <TouchableOpacity
            style={styles.backHomeButton}
            onPress={() => router.push('/')}
          >
            <LinearGradient
              colors={[colors.accent, colors.accentDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.backHomeGradient}
            >
              <ThemedText style={styles.backHomeText}>Volver al inicio</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  const pricing = getPricing();

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
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

          {/* Gradiente inferior */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)']}
            style={styles.imageGradient}
          />

          <TouchableOpacity
            style={styles.backButtonOverlay}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.imageIndicator}>
            <ThemedText style={styles.imageIndicatorText}>
              {currentImageIndex + 1} / {property.images.length}
            </ThemedText>
          </View>

          {/* Rating badge */}
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={14} color={colors.accent} />
            <ThemedText style={styles.ratingBadgeText}>{property.rating}</ThemedText>
          </View>
        </View>

        {/* Contenido */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Título y ubicación */}
          <View style={styles.titleSection}>
            <ThemedText style={[styles.title, { color: colors.text }]}>{property.title}</ThemedText>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color={colors.accent} />
              <ThemedText style={[styles.location, { color: colors.textSecondary }]}>{property.location}</ThemedText>
            </View>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color={colors.accent} />
              <ThemedText style={[styles.rating, { color: colors.text }]}>
                {property.rating} · {property.reviewCount} reseñas
              </ThemedText>
            </View>
          </View>

          {/* Información rápida */}
          <View style={[styles.quickInfo, { borderBottomColor: colors.divider }]}>
            <View style={[styles.quickInfoItem, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.quickInfoIconContainer, { backgroundColor: `${colors.accent}15` }]}>
                <Ionicons name="people-outline" size={22} color={colors.accent} />
              </View>
              <ThemedText style={[styles.quickInfoText, { color: colors.text }]}>
                {property.maxGuests} huéspedes
              </ThemedText>
            </View>
            <View style={[styles.quickInfoItem, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.quickInfoIconContainer, { backgroundColor: `${colors.accent}15` }]}>
                <Ionicons name="bed-outline" size={22} color={colors.accent} />
              </View>
              <ThemedText style={[styles.quickInfoText, { color: colors.text }]}>
                {property.bedrooms} {property.bedrooms === 1 ? 'habitación' : 'habitaciones'}
              </ThemedText>
            </View>
          </View>

          {/* Descripción */}
          <View style={[styles.section, { borderBottomColor: colors.divider }]}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Descripción</ThemedText>
            <ThemedText style={[styles.description, { color: colors.textSecondary }]}>{property.description}</ThemedText>
          </View>

          {/* Comodidades */}
          <View style={[styles.section, { borderBottomColor: colors.divider }]}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Comodidades</ThemedText>
            <View style={styles.amenitiesContainer}>
              {property.amenities.map((amenity, index) => (
                <View key={index} style={[styles.amenityItem, { backgroundColor: `${colors.accent}10` }]}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                  <ThemedText style={[styles.amenityText, { color: colors.text }]}>{amenity}</ThemedText>
                </View>
              ))}
            </View>
          </View>

          {/* Anfitrión */}
          <View style={[styles.section, { borderBottomColor: colors.divider }]}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Anfitrión</ThemedText>
            <TouchableOpacity
              style={[styles.hostCard, { backgroundColor: colors.cardBackground, shadowColor: colors.accent }]}
              onPress={() => {
                if (property.host !== mainHost && property.host.id) {
                  router.push({
                    pathname: '/host-profile',
                    params: { id: property.host.id }
                  });
                } else {
                  router.push('/host-profile');
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.hostAvatarContainer, { borderColor: colors.accent }]}>
                <Image
                  source={property.host.avatar}
                  style={styles.hostAvatar}
                  contentFit="cover"
                />
              </View>
              <View style={styles.hostInfo}>
                <ThemedText style={[styles.hostName, { color: colors.text }]}>{property.host.name}</ThemedText>
                <ThemedText style={[styles.hostJoined, { color: colors.textSecondary }]}>
                  Se unió en {property.host.joinedDate}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.accent} />
            </TouchableOpacity>
          </View>

          {/* Precio y botones */}
          <View style={[styles.priceSection, { backgroundColor: colors.cardBackground, shadowColor: colors.accent }]}>
            <View>
              <ThemedText style={[styles.priceLabel, { color: colors.textSecondary }]}>Precio por noche</ThemedText>
              <View style={styles.priceRow}>
                <ThemedText style={[styles.priceSymbol, { color: colors.accent }]}>$</ThemedText>
                <ThemedText style={[styles.price, { color: colors.text }]}>
                  {property.price.toLocaleString()}
                </ThemedText>
                <ThemedText style={[styles.priceCurrency, { color: colors.textSecondary }]}> COP</ThemedText>
              </View>
            </View>
          </View>

          {/* Botones de acción */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.reserveButton}
              onPress={() => {
                resetBookingForm();
                setShowBookingModal(true);
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.accent, colors.accentDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.reserveButtonGradient}
              >
                <Ionicons name="calendar" size={20} color="#fff" />
                <ThemedText style={styles.reserveButtonText}>Reservar Ahora</ThemedText>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.whatsappButton} onPress={handleWhatsApp} activeOpacity={0.8}>
              <LinearGradient
                colors={[colors.whatsapp, '#1DA851']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.whatsappButtonGradient}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Modal de Reserva */}
      <Modal
        visible={showBookingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
              <ThemedText style={[styles.modalTitle, { color: colors.text }]}>Reservar Alojamiento</ThemedText>
              <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Calendario */}
              <View style={styles.calendarSection}>
                <ThemedText style={[styles.calendarLabel, { color: colors.accent }]}>
                  {selectingDate === 'checkIn'
                    ? '📅 Selecciona fecha de entrada'
                    : '📅 Selecciona fecha de salida'}
                </ThemedText>
                <Calendar
                  onDayPress={handleDateSelect}
                  markedDates={getMarkedDates()}
                  minDate={new Date().toISOString().split('T')[0]}
                  markingType="period"
                  theme={{
                    backgroundColor: colors.cardBackground,
                    calendarBackground: colors.cardBackground,
                    textSectionTitleColor: colors.textSecondary,
                    dayTextColor: colors.text,
                    todayTextColor: colors.accent,
                    arrowColor: colors.accent,
                    selectedDayBackgroundColor: colors.accent,
                    selectedDayTextColor: '#fff',
                    dotColor: colors.danger,
                    monthTextColor: colors.text,
                  }}
                />
                <View style={styles.calendarLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                    <ThemedText style={[styles.legendText, { color: colors.textSecondary }]}>Entrada</ThemedText>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
                    <ThemedText style={[styles.legendText, { color: colors.textSecondary }]}>Salida</ThemedText>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
                    <ThemedText style={[styles.legendText, { color: colors.textSecondary }]}>No disponible</ThemedText>
                  </View>
                </View>
              </View>

              {/* Fechas seleccionadas */}
              <View style={styles.selectedDates}>
                <TouchableOpacity
                  style={[
                    styles.dateBox,
                    { backgroundColor: colors.inputBackground, borderColor: selectingDate === 'checkIn' ? colors.accent : 'transparent' },
                  ]}
                  onPress={() => setSelectingDate('checkIn')}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.dateBoxLabel, { color: colors.textSecondary }]}>Entrada</ThemedText>
                  <ThemedText style={[styles.dateBoxValue, { color: selectingDate === 'checkIn' ? colors.accent : colors.text }]}>
                    {checkIn ? checkIn.toLocaleDateString('es-ES') : '-- / -- / ----'}
                  </ThemedText>
                  {selectingDate === 'checkIn' && (
                    <ThemedText style={[styles.editingIndicator, { color: colors.accent }]}>Seleccionando...</ThemedText>
                  )}
                </TouchableOpacity>
                <Ionicons name="arrow-forward" size={24} color={colors.textSecondary} />
                <TouchableOpacity
                  style={[
                    styles.dateBox,
                    { backgroundColor: colors.inputBackground, borderColor: selectingDate === 'checkOut' ? colors.accent : 'transparent' },
                  ]}
                  onPress={() => {
                    if (checkIn) {
                      setSelectingDate('checkOut');
                    } else {
                      Alert.alert('Primero selecciona', 'Por favor selecciona primero la fecha de entrada.');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.dateBoxLabel, { color: colors.textSecondary }]}>Salida</ThemedText>
                  <ThemedText style={[styles.dateBoxValue, { color: selectingDate === 'checkOut' ? colors.accent : colors.text }]}>
                    {checkOut ? checkOut.toLocaleDateString('es-ES') : '-- / -- / ----'}
                  </ThemedText>
                  {selectingDate === 'checkOut' && (
                    <ThemedText style={[styles.editingIndicator, { color: colors.accent }]}>Seleccionando...</ThemedText>
                  )}
                </TouchableOpacity>
              </View>

              {/* Huéspedes */}
              <View style={styles.guestsSection}>
                <ThemedText style={[styles.guestsSectionTitle, { color: colors.text }]}>Huéspedes</ThemedText>
                <View style={[styles.guestRow, { borderBottomColor: colors.divider }]}>
                  <View style={styles.guestInfo}>
                    <ThemedText style={[styles.guestLabel, { color: colors.text }]}>Adultos</ThemedText>
                    <ThemedText style={[styles.guestSubLabel, { color: colors.textSecondary }]}>13+ años</ThemedText>
                  </View>
                  <View style={styles.guestCounter}>
                    <TouchableOpacity
                      style={[styles.counterBtn, { borderColor: colors.accent }]}
                      onPress={() => setAdults(Math.max(1, adults - 1))}
                    >
                      <Ionicons name="remove" size={20} color={colors.accent} />
                    </TouchableOpacity>
                    <ThemedText style={[styles.counterValue, { color: colors.text }]}>{adults}</ThemedText>
                    <TouchableOpacity
                      style={[styles.counterBtn, { borderColor: colors.accent }]}
                      onPress={() => setAdults(adults + 1)}
                    >
                      <Ionicons name="add" size={20} color={colors.accent} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={[styles.guestRow, { borderBottomColor: colors.divider }]}>
                  <View style={styles.guestInfo}>
                    <ThemedText style={[styles.guestLabel, { color: colors.text }]}>Niños</ThemedText>
                    <ThemedText style={[styles.guestSubLabel, { color: colors.textSecondary }]}>2-12 años</ThemedText>
                  </View>
                  <View style={styles.guestCounter}>
                    <TouchableOpacity
                      style={[styles.counterBtn, { borderColor: colors.accent }]}
                      onPress={() => setChildren(Math.max(0, children - 1))}
                    >
                      <Ionicons name="remove" size={20} color={colors.accent} />
                    </TouchableOpacity>
                    <ThemedText style={[styles.counterValue, { color: colors.text }]}>{children}</ThemedText>
                    <TouchableOpacity
                      style={[styles.counterBtn, { borderColor: colors.accent }]}
                      onPress={() => setChildren(children + 1)}
                    >
                      <Ionicons name="add" size={20} color={colors.accent} />
                    </TouchableOpacity>
                  </View>
                </View>
                {adults + children > (property?.maxGuests || 0) && (
                  <ThemedText style={[styles.guestWarning, { color: colors.danger }]}>
                    ⚠️ Máximo {property?.maxGuests} huéspedes permitidos
                  </ThemedText>
                )}
              </View>

              {/* Resumen de precio */}
              {pricing && (
                <View style={[styles.pricingSummary, { backgroundColor: colors.inputBackground }]}>
                  <ThemedText style={[styles.pricingTitle, { color: colors.text }]}>Resumen de precio</ThemedText>
                  <View style={styles.pricingRowItem}>
                    <ThemedText style={[styles.pricingLabel, { color: colors.textSecondary }]}>
                      ${property?.price.toLocaleString()} × {pricing.nights} noches
                    </ThemedText>
                    <ThemedText style={[styles.pricingValue, { color: colors.text }]}>
                      ${pricing.subtotal.toLocaleString()}
                    </ThemedText>
                  </View>
                  <View style={styles.pricingRowItem}>
                    <ThemedText style={[styles.pricingLabel, { color: colors.textSecondary }]}>Tarifa de servicio</ThemedText>
                    <ThemedText style={[styles.pricingValue, { color: colors.text }]}>
                      ${pricing.serviceFee.toLocaleString()}
                    </ThemedText>
                  </View>
                  <View style={styles.pricingRowItem}>
                    <ThemedText style={[styles.pricingLabel, { color: colors.textSecondary }]}>Impuestos</ThemedText>
                    <ThemedText style={[styles.pricingValue, { color: colors.text }]}>
                      ${pricing.taxes.toLocaleString()}
                    </ThemedText>
                  </View>
                  <View style={[styles.pricingRowItem, styles.pricingTotal, { borderTopColor: colors.divider }]}>
                    <ThemedText style={[styles.pricingTotalLabel, { color: colors.text }]}>Total</ThemedText>
                    <ThemedText style={[styles.pricingTotalValue, { color: colors.accent }]}>
                      ${pricing.total.toLocaleString()} COP
                    </ThemedText>
                  </View>
                </View>
              )}

              {/* Botón de confirmar */}
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  (!checkIn || !checkOut || bookingLoading) && styles.confirmButtonDisabled,
                ]}
                onPress={handleBooking}
                disabled={!checkIn || !checkOut || bookingLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={(!checkIn || !checkOut || bookingLoading) ? ['#888', '#666'] : [colors.accent, colors.accentDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmButtonGradient}
                >
                  {bookingLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <ThemedText style={styles.confirmButtonText}>
                        Confirmar Reserva
                      </ThemedText>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmación */}
      <Modal
        visible={showConfirmation}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmation(false)}
      >
        <View style={styles.confirmationOverlay}>
          <View style={[styles.confirmationContent, { backgroundColor: colors.cardBackground }]}>
            <View style={[styles.confirmationIcon, { backgroundColor: `${colors.success}15` }]}>
              <Ionicons name="checkmark-circle" size={60} color={colors.success} />
            </View>
            <ThemedText style={[styles.confirmationTitle, { color: colors.text }]}>¡Reserva Confirmada!</ThemedText>
            <ThemedText style={[styles.confirmationText, { color: colors.textSecondary }]}>
              Tu reserva ha sido creada exitosamente.
            </ThemedText>
            <View style={[styles.confirmationCodeBox, { backgroundColor: colors.inputBackground }]}>
              <ThemedText style={[styles.confirmationCodeLabel, { color: colors.textSecondary }]}>Código de confirmación</ThemedText>
              <ThemedText style={[styles.confirmationCodeValue, { color: colors.accent }]}>{confirmationCode}</ThemedText>
            </View>
            <ThemedText style={[styles.confirmationInfo, { color: colors.textSecondary }]}>
              Guarda este código para cualquier consulta sobre tu reserva.
            </ThemedText>
            <TouchableOpacity
              style={styles.confirmationButton}
              onPress={() => {
                setShowConfirmation(false);
                router.push('/mis-reservas');
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.accent, colors.accentDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmationButtonGradient}
              >
                <ThemedText style={styles.confirmationButtonText}>Ver Mis Reservas</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmationSecondaryButton}
              onPress={() => setShowConfirmation(false)}
            >
              <ThemedText style={[styles.confirmationSecondaryText, { color: colors.textSecondary }]}>Seguir Explorando</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  errorText: { fontSize: 18, fontWeight: '600', marginTop: 20, textAlign: 'center' },
  backHomeButton: { marginTop: 24, borderRadius: 14, overflow: 'hidden' },
  backHomeGradient: { paddingHorizontal: 28, paddingVertical: 14 },
  backHomeText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingHorizontal: 20, paddingBottom: 20 },
  backButton: { width: 44, height: 44, justifyContent: 'center' },
  imageCarousel: { position: 'relative' },
  propertyImage: { width: width, height: 320 },
  imageGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 100 },
  backButtonOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  imageIndicator: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  imageIndicatorText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  ratingBadge: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 5,
  },
  ratingBadgeText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  content: { padding: 20 },
  titleSection: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 10, letterSpacing: 0.3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  location: { fontSize: 15 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rating: { fontSize: 14, fontWeight: '600' },
  quickInfo: { flexDirection: 'row', gap: 12, marginBottom: 24, paddingBottom: 24, borderBottomWidth: 1 },
  quickInfoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
  },
  quickInfoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickInfoText: { fontSize: 14, fontWeight: '500' },
  section: { marginBottom: 24, paddingBottom: 24, borderBottomWidth: 1 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  description: { fontSize: 15, lineHeight: 24 },
  amenitiesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amenityItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  amenityText: { fontSize: 14 },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  hostAvatarContainer: {
    borderWidth: 2,
    borderRadius: 32,
    padding: 2,
  },
  hostAvatar: { width: 56, height: 56, borderRadius: 28 },
  hostInfo: { flex: 1 },
  hostName: { fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  hostJoined: { fontSize: 13 },
  priceSection: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  priceLabel: { fontSize: 13, marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  priceSymbol: { fontSize: 20, fontWeight: '600' },
  price: { fontSize: 32, fontWeight: 'bold' },
  priceCurrency: { fontSize: 16 },
  actionButtons: { flexDirection: 'row', gap: 12 },
  reserveButton: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  reserveButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  reserveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  whatsappButton: { borderRadius: 14, overflow: 'hidden' },
  whatsappButtonGradient: { paddingHorizontal: 18, paddingVertical: 16, justifyContent: 'center', alignItems: 'center' },
  whatsappButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  bottomSpacing: { height: 40 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  calendarSection: { padding: 20 },
  calendarLabel: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  calendarLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 12 },
  selectedDates: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, gap: 15, marginBottom: 20 },
  dateBox: { flex: 1, padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 2 },
  dateBoxLabel: { fontSize: 12, marginBottom: 4 },
  dateBoxValue: { fontSize: 15, fontWeight: '600' },
  editingIndicator: { fontSize: 10, marginTop: 4, fontStyle: 'italic' },
  guestsSection: { paddingHorizontal: 20, marginBottom: 20 },
  guestsSectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  guestRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  guestInfo: {},
  guestLabel: { fontSize: 16, fontWeight: '600' },
  guestSubLabel: { fontSize: 12 },
  guestCounter: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  counterBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  counterValue: { fontSize: 18, fontWeight: '600', minWidth: 30, textAlign: 'center' },
  guestWarning: { marginTop: 12, fontSize: 14 },
  pricingSummary: { margin: 20, padding: 20, borderRadius: 16 },
  pricingTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  pricingRowItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  pricingLabel: { fontSize: 14 },
  pricingValue: { fontSize: 14, fontWeight: '500' },
  pricingTotal: { borderTopWidth: 1, paddingTop: 14, marginTop: 8 },
  pricingTotalLabel: { fontSize: 17, fontWeight: 'bold' },
  pricingTotalValue: { fontSize: 20, fontWeight: 'bold' },
  confirmButton: { marginHorizontal: 20, borderRadius: 14, overflow: 'hidden' },
  confirmButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  confirmButtonDisabled: { opacity: 0.7 },
  confirmButtonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },

  // Confirmation modal
  confirmationOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  confirmationContent: { borderRadius: 24, padding: 30, alignItems: 'center', width: '100%' },
  confirmationIcon: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  confirmationTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  confirmationText: { fontSize: 15, textAlign: 'center', marginBottom: 24 },
  confirmationCodeBox: { padding: 20, borderRadius: 14, marginBottom: 16, alignItems: 'center', width: '100%' },
  confirmationCodeLabel: { fontSize: 13, marginBottom: 6 },
  confirmationCodeValue: { fontSize: 28, fontWeight: 'bold', letterSpacing: 2 },
  confirmationInfo: { fontSize: 13, textAlign: 'center', marginBottom: 24 },
  confirmationButton: { width: '100%', borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  confirmationButtonGradient: { paddingVertical: 16, alignItems: 'center' },
  confirmationButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  confirmationSecondaryButton: { paddingVertical: 12 },
  confirmationSecondaryText: { fontSize: 15 },
});
