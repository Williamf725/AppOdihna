// app/mis-reservas/index.tsx
import { ModeSwitcher } from '@/components/ModeSwitcher';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatCurrency } from '@/constants/realEstateData';
import { useAuth } from '@/hooks/useAuth';
import { cancelBooking } from '@/lib/bookingService';
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
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';

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
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        muted: '#6B7280',
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
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        muted: '#6B7280',
    },
};

interface Booking {
    id: string;
    property_id: number;
    check_in_date: string;
    check_out_date: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    total_price: number;
    confirmation_code: string;
    adults: number;
    children: number;
    property: {
        title: string;
        images: string[];
        location: string;
    };
    created_at: string;
}

interface Proposal {
    id: string;
    sale_property_id: string;
    agent_id: string;
    offered_price: number;
    message: string | null;
    property_title: string;
    property_image: string | null;
    status: 'pending' | 'accepted' | 'rejected' | 'countered';
    counter_price: number | null;
    counter_message: string | null;
    created_at: string;
    responded_at: string | null;
}

type ViewMode = 'reservas' | 'propuestas';

// ================================
// ANIMATED BOOKING CARD
// ================================
interface AnimatedBookingCardProps {
    booking: Booking;
    index: number;
    isDark: boolean;
    colors: typeof Colors.light;
    onPress: () => void;
    onCancel?: () => void;
    showActions: boolean;
}

function AnimatedBookingCard({ booking, index, isDark, colors, onPress, onCancel, showActions }: AnimatedBookingCardProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        const delay = index * 80;
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 500,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const calculateNights = () => {
        const start = new Date(booking.check_in_date);
        const end = new Date(booking.check_out_date);
        const diff = end.getTime() - start.getTime();
        return Math.ceil(diff / (1000 * 3600 * 24));
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return colors.success;
            case 'pending': return colors.warning;
            case 'cancelled': return colors.danger;
            case 'completed': return colors.muted;
            default: return colors.muted;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'confirmed': return 'Confirmada';
            case 'pending': return 'Pendiente';
            case 'cancelled': return 'Cancelada';
            case 'completed': return 'Completada';
            default: return status;
        }
    };

    return (
        <Animated.View
            style={[
                styles.bookingCard,
                {
                    backgroundColor: colors.cardBackground,
                    shadowColor: colors.accent,
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
                {/* Imagen */}
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: booking.property.images[0] }}
                        style={styles.bookingImage}
                        contentFit="cover"
                        transition={300}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.6)']}
                        style={styles.imageGradient}
                    />
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                        <ThemedText style={styles.statusText}>{getStatusText(booking.status)}</ThemedText>
                    </View>
                </View>

                <View style={styles.bookingInfo}>
                    {/* Título */}
                    <ThemedText style={[styles.bookingTitle, { color: colors.text }]} numberOfLines={2}>
                        {booking.property.title}
                    </ThemedText>

                    {/* Ubicación */}
                    <View style={styles.locationRow}>
                        <Ionicons name="location" size={14} color={colors.accent} />
                        <ThemedText style={[styles.locationText, { color: colors.textSecondary }]}>
                            {booking.property.location}
                        </ThemedText>
                    </View>

                    {/* Fechas */}
                    <View style={styles.datesRow}>
                        <Ionicons name="calendar-outline" size={14} color={colors.accent} />
                        <ThemedText style={[styles.datesText, { color: colors.accent }]}>
                            {formatDate(booking.check_in_date)} - {formatDate(booking.check_out_date)}
                        </ThemedText>
                    </View>

                    <ThemedText style={[styles.nightsText, { color: colors.textSecondary }]}>
                        {calculateNights()} noches
                    </ThemedText>

                    {/* Footer */}
                    <View style={[styles.bookingFooter, { borderTopColor: colors.divider }]}>
                        {/* Precio */}
                        <View style={styles.priceContainer}>
                            <ThemedText style={[styles.priceSymbol, { color: colors.accent }]}>$</ThemedText>
                            <ThemedText style={[styles.priceText, { color: colors.text }]}>
                                {booking.total_price.toLocaleString()}
                            </ThemedText>
                        </View>

                        {/* Código de confirmación */}
                        <View style={[styles.codeContainer, { backgroundColor: isDark ? colors.inputBackground : '#f5f5f5' }]}>
                            <ThemedText style={[styles.confirmationCode, { color: colors.textSecondary }]}>
                                #{booking.confirmation_code}
                            </ThemedText>
                        </View>
                    </View>

                    {/* Botones de acción */}
                    {showActions && booking.status !== 'cancelled' && (
                        <View style={styles.actionsRow}>
                            <TouchableOpacity
                                style={[styles.actionButton, { borderColor: colors.accent }]}
                                onPress={onPress}
                            >
                                <Ionicons name="eye-outline" size={16} color={colors.accent} />
                                <ThemedText style={[styles.actionButtonText, { color: colors.accent }]}>Ver Detalles</ThemedText>
                            </TouchableOpacity>

                            {booking.status === 'confirmed' && onCancel && (
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.cancelButton]}
                                    onPress={onCancel}
                                >
                                    <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                                    <ThemedText style={[styles.cancelButtonText, { color: colors.danger }]}>Cancelar</ThemedText>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

export default function MisReservasScreen() {
    return (
        <ProtectedRoute>
            <MisReservasContent />
        </ProtectedRoute>
    );
}

function MisReservasContent() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? Colors.dark : Colors.light;

    const { user } = useAuth();
    const [viewMode, setViewMode] = useState<ViewMode>('reservas');
    const [selectedTab, setSelectedTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Cargar reservas
    const loadBookings = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
          *,
          property:properties(title, images, location)
        `)
                .eq('guest_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                // Si la tabla no existe, simplemente mostrar lista vacía
                if (error.code === '42P01' || error.code === '42703' || error.message.includes('does not exist')) {
                    console.log('Tabla bookings no existe aún');
                    setBookings([]);
                } else {
                    throw error;
                }
            } else {
                setBookings(data || []);
            }
        } catch (error) {
            console.error('Error loading bookings:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Cargar propuestas
    const loadProposals = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('proposals')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                if (error.code === '42P01' || error.message.includes('does not exist')) {
                    console.log('Tabla proposals no existe aún');
                    setProposals([]);
                } else {
                    throw error;
                }
            } else {
                setProposals(data || []);
            }
        } catch (error) {
            console.error('Error loading proposals:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleModeChange = (mode: 'estadia' | 'comprar') => {
        const newViewMode: ViewMode = mode === 'estadia' ? 'reservas' : 'propuestas';
        setViewMode(newViewMode);
        setLoading(true);
        if (newViewMode === 'reservas') {
            loadBookings();
        } else {
            loadProposals();
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (user) {
                if (viewMode === 'reservas') {
                    loadBookings();
                } else {
                    loadProposals();
                }
            }
        }, [user, viewMode])
    );

    const onRefresh = () => {
        setRefreshing(true);
        if (viewMode === 'reservas') {
            loadBookings();
        } else {
            loadProposals();
        }
    };

    // Abrir chat de propuesta
    const handleOpenChat = async (proposal: Proposal) => {
        if (!user) return;

        try {
            const { getOrCreateConversation } = await import('@/lib/chatService');

            const conversation = await getOrCreateConversation(
                user.id,
                proposal.agent_id,
                proposal.sale_property_id,
                proposal.property_title,
                proposal.property_image || undefined
            );

            if (conversation) {
                router.push({
                    pathname: '/chat/[conversationId]',
                    params: { conversationId: conversation.id },
                });
            } else {
                Alert.alert('Error', 'No se pudo abrir la conversación');
            }
        } catch (error) {
            console.error('Error opening chat:', error);
            Alert.alert('Error', 'No se pudo abrir la conversación');
        }
    };

    // Filtrar reservas según el tab
    const filteredBookings = bookings.filter((booking) => {
        const checkInDate = new Date(booking.check_in_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedTab === 'upcoming') {
            return booking.status !== 'cancelled' && checkInDate >= today;
        } else if (selectedTab === 'past') {
            return booking.status === 'completed' || (booking.status !== 'cancelled' && checkInDate < today);
        } else {
            return booking.status === 'cancelled';
        }
    });

    // Cancelar reserva
    const handleCancelBooking = (booking: Booking) => {
        const checkInDate = new Date(booking.check_in_date);
        const now = new Date();
        const hoursUntilCheckIn = (checkInDate.getTime() - now.getTime()) / (1000 * 3600);
        const isSameDay = checkInDate.toDateString() === now.toDateString();
        const isCloseToCheckIn = hoursUntilCheckIn < 48 && hoursUntilCheckIn > 0;
        const isPastCheckIn = hoursUntilCheckIn <= 0;

        // Función para ejecutar la cancelación (usa el servicio que desbloquea fechas)
        const executeCancellation = async () => {
            try {
                await cancelBooking(booking.id, user?.id || '');
                Alert.alert('Éxito', 'Reserva cancelada correctamente');
                loadBookings();
            } catch (error) {
                console.error('Error cancelling booking:', error);
                Alert.alert('Error', 'No se pudo cancelar la reserva');
            }
        };

        // Si es el mismo día del check-in o ya pasó
        if (isSameDay || isPastCheckIn) {
            const warningTitle = isPastCheckIn
                ? '⚠️ Reserva ya iniciada'
                : '⚠️ Cancelación el día del check-in';
            const warningMessage = isPastCheckIn
                ? 'Esta reserva ya comenzó o está en curso. ¿Estás completamente seguro de cancelarla?'
                : 'El check-in es HOY. Cancelar con tan poco tiempo puede causar inconvenientes al anfitrión. ¿Deseas continuar?';

            Alert.alert(
                warningTitle,
                warningMessage,
                [
                    { text: 'No cancelar', style: 'cancel' },
                    {
                        text: 'Entiendo, continuar',
                        style: 'destructive',
                        onPress: () => {
                            Alert.alert(
                                '🚨 Confirmación final',
                                'Esta acción no se puede deshacer. El anfitrión será notificado.',
                                [
                                    { text: 'Volver', style: 'cancel' },
                                    {
                                        text: 'Confirmar cancelación',
                                        style: 'destructive',
                                        onPress: executeCancellation,
                                    },
                                ]
                            );
                        },
                    },
                ]
            );
            return;
        }

        // Si es menos de 48 horas
        if (isCloseToCheckIn) {
            const hoursText = Math.round(hoursUntilCheckIn);
            Alert.alert(
                '⚠️ Cancelación próxima al check-in',
                `Faltan aproximadamente ${hoursText} horas para el check-in. Cancelar con poco tiempo puede causar inconvenientes al anfitrión.\n\n¿Deseas continuar?`,
                [
                    { text: 'No cancelar', style: 'cancel' },
                    {
                        text: 'Sí, continuar',
                        style: 'destructive',
                        onPress: () => {
                            Alert.alert(
                                'Confirmar cancelación',
                                '¿Estás seguro? Esta acción no se puede deshacer.',
                                [
                                    { text: 'Volver', style: 'cancel' },
                                    {
                                        text: 'Cancelar reserva',
                                        style: 'destructive',
                                        onPress: executeCancellation,
                                    },
                                ]
                            );
                        },
                    },
                ]
            );
            return;
        }

        // Cancelación normal (más de 48 horas)
        Alert.alert(
            'Cancelar Reserva',
            '¿Estás seguro que deseas cancelar esta reserva?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Sí, cancelar',
                    style: 'destructive',
                    onPress: executeCancellation,
                },
            ]
        );
    };

    if (loading) {
        return (
            <ThemedView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.accent} />
                <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
                    Cargando reservas...
                </ThemedText>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.navigate('/(tabs)')}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <ThemedText style={styles.headerTitle}>
                        {viewMode === 'reservas' ? 'Mis Reservas' : 'Mis Propuestas'}
                    </ThemedText>
                    <ThemedText style={styles.headerSubtitle}>
                        {viewMode === 'reservas' ? 'Gestiona tus viajes' : 'Ofertas enviadas'}
                    </ThemedText>
                </View>
            </View>

            {/* Mode Switcher */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                <ModeSwitcher
                    mode={viewMode === 'reservas' ? 'estadia' : 'comprar'}
                    onModeChange={handleModeChange}
                    isDark={isDark}
                    estadiaLabel="Reservas"
                    estadiaSubtitle="(alojamientos)"
                    comprarLabel="Propuestas"
                    comprarSubtitle="(ofertas inmuebles)"
                />
            </View>

            {/* Tabs - Only for Reservas mode */}
            {viewMode === 'reservas' && (
                <View style={[styles.tabsContainer, { backgroundColor: isDark ? colors.cardBackground : '#f5f5f5' }]}>
                    <TouchableOpacity
                        style={[
                            styles.tab,
                            { backgroundColor: selectedTab === 'upcoming' ? colors.accent : (isDark ? colors.inputBackground : '#fff') }
                        ]}
                        onPress={() => setSelectedTab('upcoming')}
                    >
                        <ThemedText
                            style={[
                                styles.tabText,
                                { color: selectedTab === 'upcoming' ? '#FFF' : colors.textSecondary }
                            ]}
                        >
                            Próximas
                        </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.tab,
                            { backgroundColor: selectedTab === 'past' ? colors.accent : (isDark ? colors.inputBackground : '#fff') }
                        ]}
                        onPress={() => setSelectedTab('past')}
                    >
                        <ThemedText
                            style={[
                                styles.tabText,
                                { color: selectedTab === 'past' ? '#FFF' : colors.textSecondary }
                            ]}
                        >
                            Pasadas
                        </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.tab,
                            { backgroundColor: selectedTab === 'cancelled' ? colors.accent : (isDark ? colors.inputBackground : '#fff') }
                        ]}
                        onPress={() => setSelectedTab('cancelled')}
                    >
                        <ThemedText
                            style={[
                                styles.tabText,
                                { color: selectedTab === 'cancelled' ? '#FFF' : colors.textSecondary }
                            ]}
                        >
                            Canceladas
                        </ThemedText>
                    </TouchableOpacity>
                </View>
            )}

            {/* Lista de reservas */}
            {viewMode === 'reservas' && (
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.accent}
                            colors={[colors.accent]}
                        />
                    }
                >
                    {filteredBookings.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? colors.inputBackground : '#f5f5f5' }]}>
                                <Ionicons name="calendar-outline" size={60} color={colors.accent} />
                            </View>
                            <ThemedText style={[styles.emptyStateTitle, { color: colors.text }]}>
                                {selectedTab === 'upcoming' && 'No tienes reservas próximas'}
                                {selectedTab === 'past' && 'No tienes reservas pasadas'}
                                {selectedTab === 'cancelled' && 'No tienes reservas canceladas'}
                            </ThemedText>
                            <ThemedText style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                                {selectedTab === 'upcoming' && 'Explora alojamientos increíbles y haz tu primera reserva'}
                            </ThemedText>
                            {selectedTab === 'upcoming' && (
                                <TouchableOpacity
                                    style={styles.exploreButton}
                                    onPress={() => router.push('/(tabs)')}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={[colors.accent, colors.accentDark]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.exploreButtonGradient}
                                    >
                                        <Ionicons name="search" size={18} color="#FFF" />
                                        <ThemedText style={styles.exploreButtonText}>Explorar Alojamientos</ThemedText>
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        filteredBookings.map((booking, index) => (
                            <AnimatedBookingCard
                                key={booking.id}
                                booking={booking}
                                index={index}
                                isDark={isDark}
                                colors={colors}
                                onPress={() => router.push(`/reserva-detalle/${booking.id}`)}
                                onCancel={() => handleCancelBooking(booking)}
                                showActions={selectedTab === 'upcoming'}
                            />
                        ))
                    )}

                    <View style={styles.bottomSpacing} />
                </ScrollView>
            )}

            {/* Propuestas View */}
            {viewMode === 'propuestas' && (
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.accent}
                            colors={[colors.accent]}
                        />
                    }
                >
                    {proposals.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? colors.inputBackground : '#f5f5f5' }]}>
                                <Ionicons name="document-text-outline" size={60} color={colors.accent} />
                            </View>
                            <ThemedText style={[styles.emptyStateTitle, { color: colors.text }]}>
                                No tienes propuestas enviadas
                            </ThemedText>
                            <ThemedText style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                                Explora inmuebles en venta y envía tu primera oferta
                            </ThemedText>
                            <TouchableOpacity
                                style={styles.exploreButton}
                                onPress={() => router.push('/(tabs)')}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#6B7B8A', '#3D4852']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.exploreButtonGradient}
                                >
                                    <Ionicons name="search" size={18} color="#FFF" />
                                    <ThemedText style={styles.exploreButtonText}>Explorar Inmuebles</ThemedText>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        proposals.map((proposal, index) => (
                            <Animated.View
                                key={proposal.id}
                                style={[
                                    styles.bookingCard,
                                    { backgroundColor: colors.cardBackground }
                                ]}
                            >
                                <TouchableOpacity
                                    onPress={() => router.push(`/sale-property/${proposal.sale_property_id}`)}
                                    activeOpacity={0.9}
                                >
                                    <View style={styles.imageContainer}>
                                        <Image
                                            source={{ uri: proposal.property_image || 'https://via.placeholder.com/400x200' }}
                                            style={styles.bookingImage}
                                            contentFit="cover"
                                            transition={300}
                                        />
                                        <LinearGradient
                                            colors={['transparent', 'rgba(0,0,0,0.6)']}
                                            style={styles.imageGradient}
                                        />
                                        <View style={[
                                            styles.statusBadge,
                                            {
                                                backgroundColor:
                                                    proposal.status === 'accepted' ? colors.success :
                                                        proposal.status === 'rejected' ? colors.danger :
                                                            proposal.status === 'countered' ? colors.warning :
                                                                '#6B7B8A'
                                            }
                                        ]}>
                                            <ThemedText style={styles.statusText}>
                                                {proposal.status === 'pending' ? 'Pendiente' :
                                                    proposal.status === 'accepted' ? 'Aceptada' :
                                                        proposal.status === 'rejected' ? 'Rechazada' :
                                                            proposal.status === 'countered' ? 'Contraoferta' : proposal.status}
                                            </ThemedText>
                                        </View>
                                    </View>

                                    <View style={styles.bookingInfo}>
                                        <ThemedText style={[styles.bookingTitle, { color: colors.text }]} numberOfLines={2}>
                                            {proposal.property_title}
                                        </ThemedText>

                                        <View style={styles.locationRow}>
                                            <Ionicons name="pricetag" size={14} color="#6B7B8A" />
                                            <ThemedText style={[styles.locationText, { color: colors.textSecondary }]}>
                                                Tu oferta: {formatCurrency(proposal.offered_price)}
                                            </ThemedText>
                                        </View>

                                        {proposal.counter_price && (
                                            <View style={styles.datesRow}>
                                                <Ionicons name="swap-horizontal" size={14} color={colors.warning} />
                                                <ThemedText style={[styles.datesText, { color: colors.warning }]}>
                                                    Contraoferta: {formatCurrency(proposal.counter_price)}
                                                </ThemedText>
                                            </View>
                                        )}

                                        <View style={[styles.bookingFooter, { borderTopColor: colors.divider }]}>
                                            <View style={styles.priceContainer}>
                                                <Ionicons name="calendar" size={14} color={colors.textSecondary} />
                                                <ThemedText style={[styles.nightsText, { color: colors.textSecondary, marginBottom: 0, marginLeft: 6 }]}>
                                                    {new Date(proposal.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </ThemedText>
                                            </View>
                                        </View>

                                        {/* Botón de chat */}
                                        <View style={styles.actionsRow}>
                                            <TouchableOpacity
                                                style={[styles.actionButton, { borderColor: '#6B7B8A' }]}
                                                onPress={() => handleOpenChat(proposal)}
                                            >
                                                <Ionicons name="chatbubble-outline" size={16} color="#6B7B8A" />
                                                <ThemedText style={[styles.actionButtonText, { color: '#6B7B8A' }]}>Ver Conversación</ThemedText>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        ))
                    )}

                    <View style={styles.bottomSpacing} />
                </ScrollView>
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 16 },
    header: {
        backgroundColor: '#050505',
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 22,
    },
    headerTitleContainer: { flex: 1, alignItems: 'center', marginLeft: -44 },
    headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },
    headerSubtitle: { fontSize: 13, color: '#D4AF37', marginTop: 3, letterSpacing: 0.3 },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        paddingVertical: 12,
        gap: 10,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 20,
        alignItems: 'center',
    },
    tabText: { fontSize: 13, fontWeight: '600' },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 15, paddingTop: 10 },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 30,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyStateTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
    emptyStateText: { fontSize: 15, marginTop: 10, textAlign: 'center', lineHeight: 22 },
    exploreButton: {
        marginTop: 30,
        borderRadius: 25,
        overflow: 'hidden',
    },
    exploreButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 28,
        gap: 10,
    },
    exploreButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    bookingCard: {
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 16,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 5,
    },
    imageContainer: {
        position: 'relative',
    },
    bookingImage: { width: '100%', height: 180 },
    imageGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 80,
    },
    statusBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    bookingInfo: { padding: 16 },
    bookingTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    locationText: { fontSize: 14 },
    datesRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    datesText: { fontSize: 14, fontWeight: '600' },
    nightsText: { fontSize: 13, marginBottom: 12 },
    bookingFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        marginBottom: 12,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    priceSymbol: { fontSize: 16, fontWeight: '600' },
    priceText: { fontSize: 22, fontWeight: 'bold' },
    codeContainer: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    confirmationCode: { fontSize: 12, fontWeight: '500' },
    actionsRow: { flexDirection: 'row', gap: 10 },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
    },
    actionButtonText: { fontSize: 13, fontWeight: '600' },
    cancelButton: { borderColor: '#EF4444' },
    cancelButtonText: { fontSize: 13, fontWeight: '600' },
    bottomSpacing: { height: 40 },
});
