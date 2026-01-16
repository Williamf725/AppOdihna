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
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';

const { width } = Dimensions.get('window');

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
          name: data.owner.full_name || 'Anfitrión',
          joinedDate: data.owner.created_at
            ? new Date(data.owner.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
            : 'Fecha desconocida',
          avatar: data.owner.avatar_url
            ? { uri: data.owner.avatar_url }
            : require('@/assets/images/icon.png'), // Avatar por defecto
          email: data.owner.email,
          phone: data.owner.phone
        } : mainHost; // Fallback por seguridad, aunque no debería ocurrir si hay owner_id

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
      } catch (error) {
        console.error('Error loading property:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProperty();
  }, [id]);

  // Crear objeto de fechas marcadas para el calendario
  const getMarkedDates = () => {
    if (!property) return {};

    const marked: any = {};

    // Marcar fechas bloqueadas
    property.blockedDates?.forEach((date: string) => {
      marked[date] = {
        disabled: true,
        disableTouchEvent: true,
        dotColor: '#EF4444',
        marked: true,
      };
    });

    // Marcar check-in seleccionado
    if (checkIn) {
      const checkInStr = checkIn.toISOString().split('T')[0];
      marked[checkInStr] = {
        ...marked[checkInStr],
        selected: true,
        selectedColor: '#2C5F7C',
        startingDay: true,
      };
    }

    // Marcar check-out seleccionado
    if (checkOut) {
      const checkOutStr = checkOut.toISOString().split('T')[0];
      marked[checkOutStr] = {
        ...marked[checkOutStr],
        selected: true,
        selectedColor: '#D4AF37',
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
            selectedColor: '#E6F0F5',
            textColor: '#2C5F7C',
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

      // Asegurar que el perfil existe antes de reservar (fix error 23503)
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

      // Verificar si el error es porque la tabla no existe
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

  const pricing = getPricing();

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

          {/* Anfitrión */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Anfitrión</ThemedText>
            <TouchableOpacity
              style={styles.hostCard}
              onPress={() => {
                // Navegar al perfil del anfitrión pasando su ID si existe (usuario real)
                // Si es el anfitrión por defecto (mock), no pasamos ID o pasamos un indicador
                // Navegar al perfil del anfitrión pasando su ID si existe (usuario real)
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

          {/* Precio y botones */}
          <View style={styles.priceSection}>
            <View>
              <ThemedText style={styles.priceLabel}>Precio por noche</ThemedText>
              <ThemedText style={styles.price}>
                ${property.price.toLocaleString()} COP
              </ThemedText>
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
            >
              <Ionicons name="calendar" size={20} color="#fff" />
              <ThemedText style={styles.reserveButtonText}>Reservar Ahora</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.whatsappButton} onPress={handleWhatsApp}>
              <Ionicons name="logo-whatsapp" size={20} color="#fff" />
              <ThemedText style={styles.whatsappButtonText}>Contactar</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Reservar Alojamiento</ThemedText>
              <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Calendario */}
              <View style={styles.calendarSection}>
                <ThemedText style={styles.calendarLabel}>
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
                    todayTextColor: '#2C5F7C',
                    arrowColor: '#2C5F7C',
                    selectedDayBackgroundColor: '#2C5F7C',
                    dotColor: '#EF4444',
                  }}
                />
                <View style={styles.calendarLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#2C5F7C' }]} />
                    <ThemedText style={styles.legendText}>Entrada</ThemedText>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#D4AF37' }]} />
                    <ThemedText style={styles.legendText}>Salida</ThemedText>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                    <ThemedText style={styles.legendText}>No disponible</ThemedText>
                  </View>
                </View>
              </View>

              {/* Fechas seleccionadas - Clickeables para editar */}
              <View style={styles.selectedDates}>
                <TouchableOpacity
                  style={[
                    styles.dateBox,
                    selectingDate === 'checkIn' && styles.dateBoxActive,
                  ]}
                  onPress={() => setSelectingDate('checkIn')}
                  activeOpacity={0.7}
                >
                  <ThemedText style={styles.dateBoxLabel}>Entrada</ThemedText>
                  <ThemedText style={[
                    styles.dateBoxValue,
                    selectingDate === 'checkIn' && styles.dateBoxValueActive,
                  ]}>
                    {checkIn ? checkIn.toLocaleDateString('es-ES') : '-- / -- / ----'}
                  </ThemedText>
                  {selectingDate === 'checkIn' && (
                    <ThemedText style={styles.editingIndicator}>Seleccionando...</ThemedText>
                  )}
                </TouchableOpacity>
                <Ionicons name="arrow-forward" size={24} color="#ccc" />
                <TouchableOpacity
                  style={[
                    styles.dateBox,
                    selectingDate === 'checkOut' && styles.dateBoxActive,
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
                  <ThemedText style={styles.dateBoxLabel}>Salida</ThemedText>
                  <ThemedText style={[
                    styles.dateBoxValue,
                    selectingDate === 'checkOut' && styles.dateBoxValueActive,
                  ]}>
                    {checkOut ? checkOut.toLocaleDateString('es-ES') : '-- / -- / ----'}
                  </ThemedText>
                  {selectingDate === 'checkOut' && (
                    <ThemedText style={styles.editingIndicator}>Seleccionando...</ThemedText>
                  )}
                </TouchableOpacity>
              </View>

              {/* Huéspedes */}
              <View style={styles.guestsSection}>
                <ThemedText style={styles.guestsSectionTitle}>Huéspedes</ThemedText>
                <View style={styles.guestRow}>
                  <View style={styles.guestInfo}>
                    <ThemedText style={styles.guestLabel}>Adultos</ThemedText>
                    <ThemedText style={styles.guestSubLabel}>13+ años</ThemedText>
                  </View>
                  <View style={styles.guestCounter}>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => setAdults(Math.max(1, adults - 1))}
                    >
                      <Ionicons name="remove" size={20} color="#2C5F7C" />
                    </TouchableOpacity>
                    <ThemedText style={styles.counterValue}>{adults}</ThemedText>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => setAdults(adults + 1)}
                    >
                      <Ionicons name="add" size={20} color="#2C5F7C" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.guestRow}>
                  <View style={styles.guestInfo}>
                    <ThemedText style={styles.guestLabel}>Niños</ThemedText>
                    <ThemedText style={styles.guestSubLabel}>2-12 años</ThemedText>
                  </View>
                  <View style={styles.guestCounter}>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => setChildren(Math.max(0, children - 1))}
                    >
                      <Ionicons name="remove" size={20} color="#2C5F7C" />
                    </TouchableOpacity>
                    <ThemedText style={styles.counterValue}>{children}</ThemedText>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => setChildren(children + 1)}
                    >
                      <Ionicons name="add" size={20} color="#2C5F7C" />
                    </TouchableOpacity>
                  </View>
                </View>
                {adults + children > (property?.maxGuests || 0) && (
                  <ThemedText style={styles.guestWarning}>
                    ⚠️ Máximo {property?.maxGuests} huéspedes permitidos
                  </ThemedText>
                )}
              </View>

              {/* Resumen de precio */}
              {pricing && (
                <View style={styles.pricingSummary}>
                  <ThemedText style={styles.pricingTitle}>Resumen de precio</ThemedText>
                  <View style={styles.pricingRow}>
                    <ThemedText style={styles.pricingLabel}>
                      ${property?.price.toLocaleString()} × {pricing.nights} noches
                    </ThemedText>
                    <ThemedText style={styles.pricingValue}>
                      ${pricing.subtotal.toLocaleString()}
                    </ThemedText>
                  </View>
                  <View style={styles.pricingRow}>
                    <ThemedText style={styles.pricingLabel}>Tarifa de servicio</ThemedText>
                    <ThemedText style={styles.pricingValue}>
                      ${pricing.serviceFee.toLocaleString()}
                    </ThemedText>
                  </View>
                  <View style={styles.pricingRow}>
                    <ThemedText style={styles.pricingLabel}>Impuestos</ThemedText>
                    <ThemedText style={styles.pricingValue}>
                      ${pricing.taxes.toLocaleString()}
                    </ThemedText>
                  </View>
                  <View style={[styles.pricingRow, styles.pricingTotal]}>
                    <ThemedText style={styles.pricingTotalLabel}>Total</ThemedText>
                    <ThemedText style={styles.pricingTotalValue}>
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
          <View style={styles.confirmationContent}>
            <View style={styles.confirmationIcon}>
              <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            </View>
            <ThemedText style={styles.confirmationTitle}>¡Reserva Confirmada!</ThemedText>
            <ThemedText style={styles.confirmationText}>
              Tu reserva ha sido creada exitosamente.
            </ThemedText>
            <View style={styles.confirmationCodeBox}>
              <ThemedText style={styles.confirmationCodeLabel}>Código de confirmación</ThemedText>
              <ThemedText style={styles.confirmationCodeValue}>{confirmationCode}</ThemedText>
            </View>
            <ThemedText style={styles.confirmationInfo}>
              Guarda este código para cualquier consulta sobre tu reserva.
            </ThemedText>
            <TouchableOpacity
              style={styles.confirmationButton}
              onPress={() => {
                setShowConfirmation(false);
                router.push('/mis-reservas');
              }}
            >
              <ThemedText style={styles.confirmationButtonText}>Ver Mis Reservas</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmationSecondaryButton}
              onPress={() => setShowConfirmation(false)}
            >
              <ThemedText style={styles.confirmationSecondaryText}>Seguir Explorando</ThemedText>
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
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  errorText: { fontSize: 18, fontWeight: '600', marginTop: 20, color: '#666', textAlign: 'center' },
  backHomeButton: { marginTop: 20, backgroundColor: '#2C5F7C', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  backHomeText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  imageCarousel: { position: 'relative' },
  propertyImage: { width: width, height: 300 },
  backButtonOverlay: { position: 'absolute', top: 60, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  imageIndicator: { position: 'absolute', bottom: 20, right: 20, backgroundColor: 'rgba(0, 0, 0, 0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  imageIndicatorText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  content: { padding: 20 },
  titleSection: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 4 },
  location: { fontSize: 16, color: '#666' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: { fontSize: 14, fontWeight: '600' },
  quickInfo: { flexDirection: 'row', gap: 20, marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  quickInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quickInfoText: { fontSize: 14, color: '#666' },
  section: { marginBottom: 25, paddingBottom: 25, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  description: { fontSize: 16, lineHeight: 24, color: '#333' },
  amenitiesContainer: { gap: 12 },
  amenityItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amenityText: { fontSize: 15, color: '#333' },
  hostCard: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  hostAvatar: { width: 60, height: 60, borderRadius: 30 },
  hostInfo: { flex: 1 },
  hostName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  hostJoined: { fontSize: 14, color: '#666' },
  priceSection: { backgroundColor: '#f9f9f9', padding: 20, borderRadius: 12, marginBottom: 15 },
  priceLabel: { fontSize: 14, color: '#666', marginBottom: 4 },
  price: { fontSize: 28, fontWeight: 'bold', color: '#2C5F7C' },
  actionButtons: { flexDirection: 'row', gap: 12 },
  reserveButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C5F7C', paddingVertical: 16, borderRadius: 12, gap: 8 },
  reserveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  whatsappButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#25D366', paddingHorizontal: 20, paddingVertical: 16, borderRadius: 12, gap: 8 },
  whatsappButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  bottomSpacing: { height: 30 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  calendarSection: { padding: 20 },
  calendarLabel: { fontSize: 16, fontWeight: '600', marginBottom: 10, color: '#2C5F7C' },
  calendarLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 15 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 12, color: '#666' },
  selectedDates: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, gap: 15, marginBottom: 20 },
  dateBox: { flex: 1, backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  dateBoxActive: { borderColor: '#2C5F7C', backgroundColor: '#E6F0F5' },
  dateBoxLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  dateBoxValue: { fontSize: 16, fontWeight: '600' },
  dateBoxValueActive: { color: '#2C5F7C' },
  editingIndicator: { fontSize: 10, color: '#2C5F7C', marginTop: 4, fontStyle: 'italic' },
  guestsSection: { paddingHorizontal: 20, marginBottom: 20 },
  guestsSectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  guestRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  guestInfo: {},
  guestLabel: { fontSize: 16, fontWeight: '600' },
  guestSubLabel: { fontSize: 12, color: '#666' },
  guestCounter: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  counterBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#2C5F7C', justifyContent: 'center', alignItems: 'center' },
  counterValue: { fontSize: 18, fontWeight: '600', minWidth: 30, textAlign: 'center' },
  guestWarning: { color: '#EF4444', marginTop: 10, fontSize: 14 },
  pricingSummary: { backgroundColor: '#f9f9f9', margin: 20, padding: 20, borderRadius: 12 },
  pricingTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  pricingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  pricingLabel: { fontSize: 15, color: '#666' },
  pricingValue: { fontSize: 15, fontWeight: '500' },
  pricingTotal: { borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 15, marginTop: 10 },
  pricingTotalLabel: { fontSize: 18, fontWeight: 'bold' },
  pricingTotalValue: { fontSize: 20, fontWeight: 'bold', color: '#2C5F7C' },
  confirmButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#D4AF37', marginHorizontal: 20, paddingVertical: 16, borderRadius: 12, gap: 8 },
  confirmButtonDisabled: { backgroundColor: '#ccc' },
  confirmButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  // Confirmation modal
  confirmationOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  confirmationContent: { backgroundColor: '#fff', borderRadius: 20, padding: 30, alignItems: 'center', width: '100%' },
  confirmationIcon: { marginBottom: 20 },
  confirmationTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  confirmationText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 },
  confirmationCodeBox: { backgroundColor: '#f5f5f5', padding: 20, borderRadius: 12, marginBottom: 15, alignItems: 'center', width: '100%' },
  confirmationCodeLabel: { fontSize: 14, color: '#666', marginBottom: 5 },
  confirmationCodeValue: { fontSize: 28, fontWeight: 'bold', color: '#2C5F7C', letterSpacing: 2 },
  confirmationInfo: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 25 },
  confirmationButton: { backgroundColor: '#2C5F7C', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 12, width: '100%', alignItems: 'center', marginBottom: 10 },
  confirmationButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  confirmationSecondaryButton: { paddingVertical: 12 },
  confirmationSecondaryText: { color: '#666', fontSize: 16 },
});
