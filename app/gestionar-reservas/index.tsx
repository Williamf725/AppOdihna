// app/gestionar-reservas/index.tsx
import { ModeSwitcher } from '@/components/ModeSwitcher';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatCurrency } from '@/constants/realEstateData';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Linking,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
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

interface HostBooking {
    id: string;
    property_id: number;
    check_in_date: string;
    check_out_date: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    total_price: number;
    confirmation_code: string;
    adults: number;
    children: number;
    guest_email: string;
    guest_phone: string;
    property: {
        title: string;
        images: string[];
    };
    guest: {
        full_name: string;
        avatar_url: string;
        phone: string;
    };
    created_at: string;
}

interface Property {
    id: number;
    title: string;
}

interface HostProposal {
    id: string;
    sale_property_id: string;
    user_id: string;
    offered_price: number;
    message: string | null;
    property_title: string;
    property_image: string | null;
    status: 'pending' | 'accepted' | 'rejected' | 'countered';
    counter_price: number | null;
    counter_message: string | null;
    created_at: string;
    responded_at: string | null;
    buyer?: {
        full_name: string;
        avatar_url: string;
        phone: string;
    };
}

type HostViewMode = 'reservas' | 'propuestas';

// ================================
// ANIMATED STAT CARD
// ================================
function AnimatedStatCard({ icon, value, label, color, index, isDark, colors }: {
    icon: string;
    value: string;
    label: string;
    color: string;
    index: number;
    isDark: boolean;
    colors: typeof Colors.light;
}) {
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                delay: index * 100,
                useNativeDriver: true,
                friction: 6,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 400,
                delay: index * 100,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.statCard,
                {
                    backgroundColor: colors.cardBackground,
                    shadowColor: colors.accent,
                    opacity: opacityAnim,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
                <Ionicons name={icon as any} size={22} color={color} />
            </View>
            <ThemedText style={[styles.statValue, { color: colors.text }]}>{value}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</ThemedText>
        </Animated.View>
    );
}

// ================================
// ANIMATED BOOKING CARD
// ================================
function AnimatedBookingCard({ booking, index, isDark, colors, onPress, onConfirm, onCancel, onContact, formatDate, getStatusColor, getStatusText }: {
    booking: HostBooking;
    index: number;
    isDark: boolean;
    colors: typeof Colors.light;
    onPress: () => void;
    onConfirm: () => void;
    onCancel: () => void;
    onContact: () => void;
    formatDate: (date: string) => string;
    getStatusColor: (status: string) => string;
    getStatusText: (status: string) => string;
}) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                delay: index * 60,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                delay: index * 60,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
            }}
        >
            <TouchableOpacity
                style={[styles.bookingCard, { backgroundColor: colors.cardBackground, shadowColor: colors.accent }]}
                onPress={onPress}
                activeOpacity={0.8}
            >
                {/* Header del card */}
                <View style={[styles.bookingHeader, { borderBottomColor: colors.divider }]}>
                    <View style={styles.guestInfo}>
                        {booking.guest.avatar_url ? (
                            <Image
                                source={{ uri: booking.guest.avatar_url }}
                                style={styles.guestAvatar}
                                contentFit="cover"
                            />
                        ) : (
                            <View style={[styles.guestAvatarPlaceholder, { backgroundColor: isDark ? colors.inputBackground : '#f0f0f0' }]}>
                                <Ionicons name="person" size={18} color={colors.textSecondary} />
                            </View>
                        )}
                        <View style={styles.guestDetails}>
                            <ThemedText style={[styles.guestName, { color: colors.text }]}>{booking.guest.full_name}</ThemedText>
                            <ThemedText style={[styles.confirmationText, { color: colors.accent }]}>
                                #{booking.confirmation_code}
                            </ThemedText>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                        <ThemedText style={styles.statusText}>{getStatusText(booking.status)}</ThemedText>
                    </View>
                </View>

                {/* Info de la reserva */}
                <View style={styles.bookingBody}>
                    <ThemedText style={[styles.propertyTitle, { color: colors.text }]} numberOfLines={1}>
                        {booking.property.title}
                    </ThemedText>

                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={15} color={colors.accent} />
                        <ThemedText style={[styles.infoText, { color: colors.textSecondary }]}>
                            {formatDate(booking.check_in_date)} - {formatDate(booking.check_out_date)}
                        </ThemedText>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="people-outline" size={15} color={colors.accent} />
                        <ThemedText style={[styles.infoText, { color: colors.textSecondary }]}>
                            {booking.adults + booking.children} huéspedes
                        </ThemedText>
                    </View>

                    <View style={styles.priceRow}>
                        <ThemedText style={[styles.priceSymbol, { color: colors.accent }]}>$</ThemedText>
                        <ThemedText style={[styles.price, { color: colors.text }]}>
                            {booking.total_price.toLocaleString()}
                        </ThemedText>
                    </View>
                </View>

                {/* Acciones */}
                <View style={[styles.actionsRow, { borderTopColor: colors.divider }]}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: colors.accent }]}
                        onPress={onPress}
                    >
                        <Ionicons name="eye-outline" size={16} color={colors.accent} />
                    </TouchableOpacity>

                    {booking.status === 'pending' && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { borderColor: colors.success }]}
                            onPress={onConfirm}
                        >
                            <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                        </TouchableOpacity>
                    )}

                    {(booking.status === 'pending' || booking.status === 'confirmed') && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { borderColor: colors.danger }]}
                            onPress={onCancel}
                        >
                            <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: colors.accent }]}
                        onPress={onContact}
                    >
                        <Ionicons name="chatbubble-outline" size={16} color={colors.accent} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

export default function GestionarReservasScreen() {
    return (
        <ProtectedRoute requireRole="host">
            <GestionarReservasContent />
        </ProtectedRoute>
    );
}

function GestionarReservasContent() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? Colors.dark : Colors.light;

    const { user } = useAuth();
    const [viewMode, setViewMode] = useState<HostViewMode>('reservas');
    const [bookings, setBookings] = useState<HostBooking[]>([]);
    const [proposals, setProposals] = useState<HostProposal[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filtros
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [selectedProperty, setSelectedProperty] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showPropertyModal, setShowPropertyModal] = useState(false);
    const [showCounterModal, setShowCounterModal] = useState(false);
    const [counterPrice, setCounterPrice] = useState('');
    const [counterMessage, setCounterMessage] = useState('');
    const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);

    // Estadísticas
    const [stats, setStats] = useState({
        totalBookings: 0,
        monthlyRevenue: 0,
        occupancyRate: 0,
        upcomingCheckIns: 0,
    });

    // Cargar propiedades del host
    const loadProperties = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('properties')
                .select('id, title')
                .eq('owner_id', user.id)
                .order('title');

            if (error) throw error;
            setProperties(data || []);
        } catch (error) {
            console.error('Error loading properties:', error);
        }
    };

    // Cargar reservas
    const loadBookings = async () => {
        if (!user) return;

        try {
            // Primero obtener todas las propiedades del host
            const { data: hostProperties, error: propsError } = await supabase
                .from('properties')
                .select('id')
                .eq('owner_id', user.id);

            if (propsError) throw propsError;

            const propertyIds = hostProperties.map(p => p.id);

            if (propertyIds.length === 0) {
                setBookings([]);
                setLoading(false);
                return;
            }

            // Luego obtener las reservas de esas propiedades
            const { data, error } = await supabase
                .from('bookings')
                .select(`
          *,
          property:properties(title, images),
          guest:profiles!guest_id(full_name, avatar_url, phone)
        `)
                .in('property_id', propertyIds)
                .order('created_at', { ascending: false });

            if (error) {
                // Si la tabla no existe, simplemente mostrar lista vacía
                if (error.code === '42P01' || error.code === '42703' || error.message.includes('does not exist')) {
                    console.log('Tabla bookings no existe aún');
                    setBookings([]);
                    setLoading(false);
                    setRefreshing(false);
                    return;
                }
                throw error;
            }

            setBookings(data || []);
            calculateStats(data || []);
        } catch (error) {
            console.error('Error loading bookings:', error);
            // No mostrar alerta, solo log
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Calcular estadísticas
    const calculateStats = (bookingsData: HostBooking[]) => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // Ingresos del mes
        const monthlyRevenue = bookingsData
            .filter(b => {
                const bookingDate = new Date(b.created_at);
                return (
                    bookingDate.getMonth() === currentMonth &&
                    bookingDate.getFullYear() === currentYear &&
                    b.status !== 'cancelled'
                );
            })
            .reduce((sum, b) => sum + b.total_price, 0);

        // Próximos check-ins (en los próximos 7 días)
        const upcomingCheckIns = bookingsData.filter(b => {
            const checkIn = new Date(b.check_in_date);
            const sevenDaysFromNow = new Date();
            sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
            return checkIn >= today && checkIn <= sevenDaysFromNow && b.status === 'confirmed';
        }).length;

        setStats({
            totalBookings: bookingsData.filter(b => b.status !== 'cancelled').length,
            monthlyRevenue,
            occupancyRate: 0, // Calcular después con más lógica
            upcomingCheckIns,
        });
    };

    // Cargar propuestas recibidas (para anfitriones/agentes)
    const loadProposals = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('proposals')
                .select(`
                    *,
                    buyer:profiles!user_id(full_name, avatar_url, phone)
                `)
                .eq('agent_id', user.id)
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

    // Cambiar modo de vista
    const handleModeChange = (mode: 'estadia' | 'comprar') => {
        const newViewMode: HostViewMode = mode === 'estadia' ? 'reservas' : 'propuestas';
        setViewMode(newViewMode);
        setLoading(true);
        if (newViewMode === 'reservas') {
            loadBookings();
        } else {
            loadProposals();
        }
    };

    // Aceptar propuesta
    const handleAcceptProposal = (proposalId: string) => {
        Alert.alert(
            'Aceptar Propuesta',
            '¿Deseas aceptar esta propuesta de compra?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Aceptar',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('proposals')
                                .update({
                                    status: 'accepted',
                                    responded_at: new Date().toISOString(),
                                })
                                .eq('id', proposalId);

                            if (error) throw error;
                            Alert.alert('Éxito', 'Propuesta aceptada');
                            loadProposals();
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo aceptar la propuesta');
                        }
                    },
                },
            ]
        );
    };

    // Rechazar propuesta
    const handleRejectProposal = (proposalId: string) => {
        Alert.alert(
            'Rechazar Propuesta',
            '¿Estás seguro que deseas rechazar esta propuesta?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Sí, rechazar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('proposals')
                                .update({
                                    status: 'rejected',
                                    responded_at: new Date().toISOString(),
                                })
                                .eq('id', proposalId);

                            if (error) throw error;
                            Alert.alert('Éxito', 'Propuesta rechazada');
                            loadProposals();
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo rechazar la propuesta');
                        }
                    },
                },
            ]
        );
    };

    // Abrir modal de contraoferta
    const openCounterModal = (proposalId: string) => {
        setSelectedProposalId(proposalId);
        setCounterPrice('');
        setCounterMessage('');
        setShowCounterModal(true);
    };

    // Enviar contraoferta
    const handleSendCounter = async () => {
        if (!selectedProposalId || !counterPrice) {
            Alert.alert('Error', 'Por favor ingresa un precio para la contraoferta');
            return;
        }

        const priceValue = parseInt(counterPrice.replace(/[^0-9]/g, ''), 10);
        if (isNaN(priceValue) || priceValue <= 0) {
            Alert.alert('Error', 'Por favor ingresa un precio válido');
            return;
        }

        try {
            const { error } = await supabase
                .from('proposals')
                .update({
                    status: 'countered',
                    counter_price: priceValue,
                    counter_message: counterMessage || null,
                    responded_at: new Date().toISOString(),
                })
                .eq('id', selectedProposalId);

            if (error) throw error;

            Alert.alert('Éxito', 'Contraoferta enviada al comprador');
            setShowCounterModal(false);
            loadProposals();
        } catch (error) {
            Alert.alert('Error', 'No se pudo enviar la contraoferta');
        }
    };

    // Contactar comprador
    const handleContactBuyer = (phone: string, buyerName: string) => {
        Alert.alert(
            'Contactar Comprador',
            `¿Cómo deseas contactar a ${buyerName}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'WhatsApp',
                    onPress: () => {
                        const message = `Hola ${buyerName}, soy el agente inmobiliario de la propiedad que te interesa en Odihna.`;
                        const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
                        Linking.openURL(url).catch(() => {
                            Alert.alert('Error', 'No se pudo abrir WhatsApp');
                        });
                    },
                },
            ]
        );
    };

    // Abrir chat de propuesta (para agente/host)
    const handleOpenChat = async (proposal: HostProposal) => {
        if (!user) return;

        try {
            const { getOrCreateConversation } = await import('@/lib/chatService');

            // El agente (user) crea/obtiene conversación con el comprador (buyer)
            const conversation = await getOrCreateConversation(
                proposal.user_id, // El comprador es el user_id de la conversación
                user.id, // El agente es el agent_id
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

    useFocusEffect(
        useCallback(() => {
            if (user) {
                loadProperties();
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

    // Filtrar reservas
    const filteredBookings = bookings.filter(booking => {
        // Filtro por estado
        if (selectedStatus !== 'all' && booking.status !== selectedStatus) {
            return false;
        }

        // Filtro por propiedad
        if (selectedProperty && booking.property_id !== selectedProperty) {
            return false;
        }

        // Búsqueda por texto
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            return (
                booking.guest.full_name.toLowerCase().includes(query) ||
                booking.confirmation_code.toLowerCase().includes(query) ||
                booking.guest_email?.toLowerCase().includes(query)
            );
        }

        return true;
    });

    // Formatear fecha
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
        });
    };

    // Obtener color de estado
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return colors.success;
            case 'pending': return colors.warning;
            case 'cancelled': return colors.danger;
            case 'completed': return colors.muted;
            default: return colors.muted;
        }
    };

    // Obtener texto de estado
    const getStatusText = (status: string) => {
        switch (status) {
            case 'confirmed': return 'Confirmada';
            case 'pending': return 'Pendiente';
            case 'cancelled': return 'Cancelada';
            case 'completed': return 'Completada';
            default: return status;
        }
    };

    // Confirmar reserva
    const handleConfirmBooking = (bookingId: string) => {
        Alert.alert(
            'Confirmar Reserva',
            '¿Deseas confirmar esta reserva?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('bookings')
                                .update({ status: 'confirmed' })
                                .eq('id', bookingId);

                            if (error) throw error;
                            Alert.alert('Éxito', 'Reserva confirmada');
                            loadBookings();
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo confirmar la reserva');
                        }
                    },
                },
            ]
        );
    };

    // Cancelar reserva
    const handleCancelBooking = (bookingId: string) => {
        Alert.alert(
            'Cancelar Reserva',
            '¿Estás seguro que deseas cancelar esta reserva?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Sí, cancelar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('bookings')
                                .update({
                                    status: 'cancelled',
                                    cancelled_at: new Date().toISOString(),
                                    cancelled_by: user?.id,
                                })
                                .eq('id', bookingId);

                            if (error) throw error;
                            Alert.alert('Éxito', 'Reserva cancelada');
                            loadBookings();
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo cancelar la reserva');
                        }
                    },
                },
            ]
        );
    };

    // Contactar huésped
    const handleContactGuest = (phone: string, guestName: string) => {
        Alert.alert(
            'Contactar Huésped',
            `¿Cómo deseas contactar a ${guestName}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'WhatsApp',
                    onPress: () => {
                        const message = `Hola ${guestName}, soy el anfitrión de tu reserva en Odihna.`;
                        const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
                        Linking.openURL(url).catch(() => {
                            Alert.alert('Error', 'No se pudo abrir WhatsApp');
                        });
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <ThemedView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.accent} />
                <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
                    {viewMode === 'reservas' ? 'Cargando reservas...' : 'Cargando propuestas...'}
                </ThemedText>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <ThemedText style={styles.headerTitle}>
                        {viewMode === 'reservas' ? 'Gestionar Reservas' : 'Gestionar Propuestas'}
                    </ThemedText>
                    <ThemedText style={styles.headerSubtitle}>
                        {viewMode === 'reservas' ? 'Panel de anfitrín' : 'Ofertas de compra recibidas'}
                    </ThemedText>
                </View>
            </View>

            {/* Mode Switcher */}
            <View style={{ paddingHorizontal: 0, paddingVertical: 4 }}>
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

            {/* Reservas View */}
            {viewMode === 'reservas' && (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.accent}
                            colors={[colors.accent]}
                        />
                    }
                >
                    {/* Dashboard de estadísticas */}
                    <View style={styles.statsContainer}>
                        <AnimatedStatCard
                            icon="calendar"
                            value={stats.totalBookings.toString()}
                            label="Reservas Totales"
                            color={colors.accent}
                            index={0}
                            isDark={isDark}
                            colors={colors}
                        />
                        <AnimatedStatCard
                            icon="cash"
                            value={`$${(stats.monthlyRevenue / 1000).toFixed(0)}K`}
                            label="Ingresos del Mes"
                            color={colors.success}
                            index={1}
                            isDark={isDark}
                            colors={colors}
                        />
                        <AnimatedStatCard
                            icon="trending-up"
                            value={stats.upcomingCheckIns.toString()}
                            label="Próximas Llegadas"
                            color={colors.warning}
                            index={2}
                            isDark={isDark}
                            colors={colors}
                        />
                    </View>

                    {/* Filtros */}
                    <View style={styles.filtersContainer}>
                        {/* Barra de búsqueda */}
                        <View style={[styles.searchBar, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
                            <TextInput
                                style={[styles.searchInput, { color: colors.text }]}
                                placeholder="Buscar por huésped o código..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholderTextColor={colors.textSecondary}
                            />
                            {searchQuery !== '' && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Filtros de estado y propiedad */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                            {['all', 'pending', 'confirmed', 'completed'].map((status) => (
                                <TouchableOpacity
                                    key={status}
                                    style={[
                                        styles.filterChip,
                                        {
                                            backgroundColor: selectedStatus === status ? colors.accent : (isDark ? colors.inputBackground : '#f5f5f5'),
                                            borderColor: selectedStatus === status ? colors.accent : colors.border,
                                        }
                                    ]}
                                    onPress={() => setSelectedStatus(status)}
                                >
                                    <ThemedText
                                        style={[
                                            styles.filterChipText,
                                            { color: selectedStatus === status ? '#FFF' : colors.textSecondary }
                                        ]}
                                    >
                                        {status === 'all' ? 'Todas' :
                                            status === 'pending' ? 'Pendientes' :
                                                status === 'confirmed' ? 'Confirmadas' : 'Completadas'}
                                    </ThemedText>
                                </TouchableOpacity>
                            ))}

                            <TouchableOpacity
                                style={[
                                    styles.filterChip,
                                    {
                                        backgroundColor: isDark ? colors.inputBackground : '#f5f5f5',
                                        borderColor: selectedProperty ? colors.accent : colors.border,
                                    }
                                ]}
                                onPress={() => setShowPropertyModal(true)}
                            >
                                <Ionicons name="home-outline" size={14} color={colors.accent} />
                                <ThemedText style={[styles.filterChipText, { color: colors.textSecondary }]}>
                                    {selectedProperty ? properties.find(p => p.id === selectedProperty)?.title.substring(0, 12) + '...' : 'Propiedad'}
                                </ThemedText>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>

                    {/* Lista de reservas */}
                    <View style={styles.bookingsContainer}>
                        <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
                            Reservas ({filteredBookings.length})
                        </ThemedText>

                        {filteredBookings.length === 0 ? (
                            <View style={styles.emptyState}>
                                <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? colors.inputBackground : '#f5f5f5' }]}>
                                    <Ionicons name="receipt-outline" size={50} color={colors.accent} />
                                </View>
                                <ThemedText style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                                    No hay reservas con estos filtros
                                </ThemedText>
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
                                    onConfirm={() => handleConfirmBooking(booking.id)}
                                    onCancel={() => handleCancelBooking(booking.id)}
                                    onContact={() => handleContactGuest(booking.guest.phone, booking.guest.full_name)}
                                    formatDate={formatDate}
                                    getStatusColor={getStatusColor}
                                    getStatusText={getStatusText}
                                />
                            ))
                        )}
                    </View>

                    <View style={styles.bottomSpacing} />
                </ScrollView>
            )}

            {/* Propuestas View */}
            {viewMode === 'propuestas' && (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.accent}
                            colors={[colors.accent]}
                        />
                    }
                >
                    <ThemedText style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>
                        Propuestas Recibidas ({proposals.length})
                    </ThemedText>

                    {proposals.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? colors.inputBackground : '#f5f5f5' }]}>
                                <Ionicons name="document-text-outline" size={50} color="#6B7B8A" />
                            </View>
                            <ThemedText style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                                No has recibido propuestas aún
                            </ThemedText>
                            <ThemedText style={[styles.emptyStateSubtext, { color: colors.muted }]}>
                                Las ofertas de tus inmuebles aparecerán aquí
                            </ThemedText>
                        </View>
                    ) : (
                        proposals.map((proposal, index) => (
                            <Animated.View
                                key={proposal.id}
                                style={[styles.bookingCard, { backgroundColor: colors.cardBackground, shadowColor: '#6B7B8A' }]}
                            >
                                {/* Header con comprador */}
                                <View style={[styles.bookingHeader, { borderBottomColor: colors.divider }]}>
                                    <View style={styles.guestInfo}>
                                        {proposal.buyer?.avatar_url ? (
                                            <Image
                                                source={{ uri: proposal.buyer.avatar_url }}
                                                style={styles.guestAvatar}
                                                contentFit="cover"
                                            />
                                        ) : (
                                            <View style={[styles.guestAvatarPlaceholder, { backgroundColor: isDark ? colors.inputBackground : '#f0f0f0' }]}>
                                                <Ionicons name="person" size={18} color={colors.textSecondary} />
                                            </View>
                                        )}
                                        <View style={styles.guestDetails}>
                                            <ThemedText style={[styles.guestName, { color: colors.text }]}>
                                                {proposal.buyer?.full_name || 'Comprador'}
                                            </ThemedText>
                                            <ThemedText style={[styles.confirmationText, { color: '#6B7B8A' }]}>
                                                {new Date(proposal.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </ThemedText>
                                        </View>
                                    </View>
                                    <View style={[styles.statusBadge, {
                                        backgroundColor:
                                            proposal.status === 'accepted' ? colors.success :
                                                proposal.status === 'rejected' ? colors.danger :
                                                    proposal.status === 'countered' ? colors.warning :
                                                        '#6B7B8A'
                                    }]}>
                                        <ThemedText style={styles.statusText}>
                                            {proposal.status === 'pending' ? 'Pendiente' :
                                                proposal.status === 'accepted' ? 'Aceptada' :
                                                    proposal.status === 'rejected' ? 'Rechazada' :
                                                        proposal.status === 'countered' ? 'Contraoferta' : proposal.status}
                                        </ThemedText>
                                    </View>
                                </View>

                                {/* Info de la propuesta */}
                                <View style={styles.bookingBody}>
                                    <ThemedText style={[styles.propertyTitle, { color: colors.text }]} numberOfLines={1}>
                                        {proposal.property_title}
                                    </ThemedText>

                                    <View style={styles.infoRow}>
                                        <Ionicons name="pricetag" size={15} color="#6B7B8A" />
                                        <ThemedText style={[styles.infoText, { color: colors.textSecondary }]}>
                                            Oferta: {formatCurrency(proposal.offered_price)}
                                        </ThemedText>
                                    </View>

                                    {proposal.message && (
                                        <View style={styles.infoRow}>
                                            <Ionicons name="chatbubble-ellipses-outline" size={15} color="#6B7B8A" />
                                            <ThemedText style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={2}>
                                                "{proposal.message}"
                                            </ThemedText>
                                        </View>
                                    )}

                                    {proposal.counter_price && (
                                        <View style={[styles.priceRow, { backgroundColor: colors.warning + '20', padding: 8, borderRadius: 8, marginTop: 8 }]}>
                                            <Ionicons name="swap-horizontal" size={15} color={colors.warning} />
                                            <ThemedText style={[styles.infoText, { color: colors.warning, marginLeft: 6 }]}>
                                                Tu contraoferta: {formatCurrency(proposal.counter_price)}
                                            </ThemedText>
                                        </View>
                                    )}
                                </View>

                                {/* Acciones solo si está pendiente */}
                                {proposal.status === 'pending' && (
                                    <View style={[styles.actionsRow, { borderTopColor: colors.divider }]}>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { borderColor: colors.success, flex: 1, marginRight: 6 }]}
                                            onPress={() => handleAcceptProposal(proposal.id)}
                                        >
                                            <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                                            <ThemedText style={{ color: colors.success, marginLeft: 4, fontSize: 12 }}>Aceptar</ThemedText>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.actionBtn, { borderColor: colors.warning, flex: 1, marginRight: 6 }]}
                                            onPress={() => openCounterModal(proposal.id)}
                                        >
                                            <Ionicons name="swap-horizontal-outline" size={16} color={colors.warning} />
                                            <ThemedText style={{ color: colors.warning, marginLeft: 4, fontSize: 12 }}>Contraoferta</ThemedText>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.actionBtn, { borderColor: colors.danger, flex: 1 }]}
                                            onPress={() => handleRejectProposal(proposal.id)}
                                        >
                                            <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                                            <ThemedText style={{ color: colors.danger, marginLeft: 4, fontSize: 12 }}>Rechazar</ThemedText>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {/* Botón de chat siempre visible */}
                                <TouchableOpacity
                                    style={[styles.contactFullBtn, { backgroundColor: '#6B7B8A' }]}
                                    onPress={() => handleOpenChat(proposal)}
                                >
                                    <Ionicons name="chatbubble-outline" size={16} color="#FFF" />
                                    <ThemedText style={{ color: '#FFF', marginLeft: 6, fontWeight: '600' }}>Ver Conversación</ThemedText>
                                </TouchableOpacity>
                            </Animated.View>
                        ))
                    )}

                    <View style={styles.bottomSpacing} />
                </ScrollView>
            )}

            {/* Modal de selección de propiedad */}
            <Modal
                visible={showPropertyModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowPropertyModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
                            <ThemedText style={[styles.modalTitle, { color: colors.text }]}>Filtrar por Propiedad</ThemedText>
                            <TouchableOpacity onPress={() => setShowPropertyModal(false)}>
                                <Ionicons name="close" size={26} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.propertyItem, { borderBottomColor: colors.divider }]}
                            onPress={() => {
                                setSelectedProperty(null);
                                setShowPropertyModal(false);
                            }}
                        >
                            <ThemedText style={[styles.propertyText, { color: colors.text }]}>Todas las propiedades</ThemedText>
                            {selectedProperty === null && <Ionicons name="checkmark" size={22} color={colors.accent} />}
                        </TouchableOpacity>

                        <ScrollView>
                            {properties.map((property) => (
                                <TouchableOpacity
                                    key={property.id}
                                    style={[styles.propertyItem, { borderBottomColor: colors.divider }]}
                                    onPress={() => {
                                        setSelectedProperty(property.id);
                                        setShowPropertyModal(false);
                                    }}
                                >
                                    <ThemedText style={[styles.propertyText, { color: colors.text }]}>{property.title}</ThemedText>
                                    {selectedProperty === property.id && (
                                        <Ionicons name="checkmark" size={22} color={colors.accent} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Modal de Contraoferta */}
            <Modal
                visible={showCounterModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCounterModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
                            <ThemedText style={[styles.modalTitle, { color: colors.text }]}>Enviar Contraoferta</ThemedText>
                            <TouchableOpacity onPress={() => setShowCounterModal(false)}>
                                <Ionicons name="close" size={26} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ padding: 16 }}>
                            <ThemedText style={{ color: colors.textSecondary, marginBottom: 8 }}>
                                Precio de contraoferta (COP)
                            </ThemedText>
                            <TextInput
                                style={[styles.searchInput, {
                                    backgroundColor: colors.inputBackground,
                                    color: colors.text,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 12,
                                    padding: 14,
                                    fontSize: 18,
                                    fontWeight: '600',
                                    marginBottom: 16
                                }]}
                                placeholder="$ 0"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="numeric"
                                value={counterPrice}
                                onChangeText={(text) => {
                                    const numericValue = text.replace(/[^0-9]/g, '');
                                    setCounterPrice(numericValue);
                                }}
                            />

                            <ThemedText style={{ color: colors.textSecondary, marginBottom: 8 }}>
                                Mensaje (opcional)
                            </ThemedText>
                            <TextInput
                                style={[styles.searchInput, {
                                    backgroundColor: colors.inputBackground,
                                    color: colors.text,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 12,
                                    padding: 14,
                                    height: 100,
                                    textAlignVertical: 'top',
                                    marginBottom: 20
                                }]}
                                placeholder="Explica tu contraoferta..."
                                placeholderTextColor={colors.textSecondary}
                                multiline
                                value={counterMessage}
                                onChangeText={setCounterMessage}
                            />

                            <TouchableOpacity
                                style={{
                                    backgroundColor: colors.warning,
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                }}
                                onPress={handleSendCounter}
                            >
                                <Ionicons name="swap-horizontal" size={20} color="#FFF" />
                                <ThemedText style={{ color: '#FFF', fontWeight: '700', marginLeft: 8, fontSize: 16 }}>
                                    Enviar Contraoferta
                                </ThemedText>
                            </TouchableOpacity>
                        </View>
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
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        paddingVertical: 20,
        gap: 10,
    },
    statCard: {
        flex: 1,
        padding: 14,
        borderRadius: 16,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    statIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: { fontSize: 22, fontWeight: 'bold' },
    statLabel: { fontSize: 11, textAlign: 'center', marginTop: 4 },
    filtersContainer: { paddingHorizontal: 15, paddingBottom: 15 },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 12,
        gap: 10,
        borderWidth: 1,
    },
    searchInput: { flex: 1, fontSize: 15 },
    filterRow: { flexDirection: 'row' },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 8,
        gap: 5,
        borderWidth: 1,
    },
    filterChipText: { fontSize: 13, fontWeight: '600' },
    bookingsContainer: { paddingHorizontal: 15, paddingTop: 5 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
    emptyState: { alignItems: 'center', paddingVertical: 50 },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyStateText: { fontSize: 15 },
    bookingCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    bookingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    guestInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    guestAvatar: { width: 40, height: 40, borderRadius: 20 },
    guestAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    guestDetails: { flex: 1 },
    guestName: { fontSize: 15, fontWeight: 'bold' },
    confirmationText: { fontSize: 12, marginTop: 2, fontWeight: '500' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    bookingBody: { marginBottom: 12 },
    propertyTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
    infoText: { fontSize: 13 },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
    priceSymbol: { fontSize: 14, fontWeight: '600' },
    price: { fontSize: 20, fontWeight: 'bold' },
    actionsRow: { flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1 },
    actionBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
    },
    bottomSpacing: { height: 40 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 40,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    propertyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    propertyText: { fontSize: 15 },
    emptyStateSubtext: {
        fontSize: 13,
        marginTop: 4,
        textAlign: 'center',
    },
    contactFullBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 12,
    },
});
