// app/mis-reservas/index.tsx
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

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

export default function MisReservasScreen() {
    return (
        <ProtectedRoute>
            <MisReservasContent />
        </ProtectedRoute>
    );
}

function MisReservasContent() {
    const { user } = useAuth();
    const [selectedTab, setSelectedTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
    const [bookings, setBookings] = useState<Booking[]>([]);
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
            // No mostrar alerta, solo log
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (user) loadBookings();
        }, [user])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadBookings();
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

    // Calcular número de noches
    const calculateNights = (checkIn: string, checkOut: string) => {
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const diff = end.getTime() - start.getTime();
        return Math.ceil(diff / (1000 * 3600 * 24));
    };

    // Formatear fecha
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    // Obtener color de estado
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return '#10B981';
            case 'pending':
                return '#F59E0B';
            case 'cancelled':
                return '#EF4444';
            case 'completed':
                return '#6B7280';
            default:
                return '#6B7280';
        }
    };

    // Obtener texto de estado
    const getStatusText = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'Confirmada';
            case 'pending':
                return 'Pendiente';
            case 'cancelled':
                return 'Cancelada';
            case 'completed':
                return 'Completada';
            default:
                return status;
        }
    };

    // Cancelar reserva
    const handleCancelBooking = (booking: Booking) => {
        const checkInDate = new Date(booking.check_in_date);
        const today = new Date();
        const hoursUntilCheckIn = (checkInDate.getTime() - today.getTime()) / (1000 * 3600);

        if (hoursUntilCheckIn < 48) {
            Alert.alert(
                'No se puede cancelar',
                'Las reservas solo se pueden cancelar con al menos 48 horas de anticipación.'
            );
            return;
        }

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
                                .eq('id', booking.id);

                            if (error) throw error;

                            Alert.alert('Éxito', 'Reserva cancelada correctamente');
                            loadBookings();
                        } catch (error) {
                            console.error('Error cancelling booking:', error);
                            Alert.alert('Error', 'No se pudo cancelar la reserva');
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
                <ThemedText style={styles.loadingText}>Cargando reservas...</ThemedText>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <ThemedText style={styles.headerTitle}>Mis Reservas</ThemedText>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'upcoming' && styles.tabActive]}
                    onPress={() => setSelectedTab('upcoming')}
                >
                    <ThemedText
                        style={[styles.tabText, selectedTab === 'upcoming' && styles.tabTextActive]}
                    >
                        Próximas
                    </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'past' && styles.tabActive]}
                    onPress={() => setSelectedTab('past')}
                >
                    <ThemedText style={[styles.tabText, selectedTab === 'past' && styles.tabTextActive]}>
                        Pasadas
                    </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'cancelled' && styles.tabActive]}
                    onPress={() => setSelectedTab('cancelled')}
                >
                    <ThemedText
                        style={[styles.tabText, selectedTab === 'cancelled' && styles.tabTextActive]}
                    >
                        Canceladas
                    </ThemedText>
                </TouchableOpacity>
            </View>

            {/* Lista de reservas */}
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {filteredBookings.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="calendar-outline" size={80} color="#ccc" />
                        <ThemedText style={styles.emptyStateTitle}>
                            {selectedTab === 'upcoming' && 'No tienes reservas próximas'}
                            {selectedTab === 'past' && 'No tienes reservas pasadas'}
                            {selectedTab === 'cancelled' && 'No tienes reservas canceladas'}
                        </ThemedText>
                        <ThemedText style={styles.emptyStateText}>
                            {selectedTab === 'upcoming' && 'Explora alojamientos increíbles y haz tu primera reserva'}
                        </ThemedText>
                        {selectedTab === 'upcoming' && (
                            <TouchableOpacity
                                style={styles.exploreButton}
                                onPress={() => router.push('/(tabs)')}
                            >
                                <ThemedText style={styles.exploreButtonText}>Explorar Alojamientos</ThemedText>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    filteredBookings.map((booking) => (
                        <TouchableOpacity
                            key={booking.id}
                            style={styles.bookingCard}
                            onPress={() => router.push(`/reserva-detalle/${booking.id}`)}
                            activeOpacity={0.7}
                        >
                            {/* Imagen */}
                            <Image
                                source={{ uri: booking.property.images[0] }}
                                style={styles.bookingImage}
                                contentFit="cover"
                            />

                            <View style={styles.bookingInfo}>
                                {/* Título */}
                                <ThemedText style={styles.bookingTitle} numberOfLines={2}>
                                    {booking.property.title}
                                </ThemedText>

                                {/* Ubicación */}
                                <View style={styles.locationRow}>
                                    <Ionicons name="location" size={14} color="#666" />
                                    <ThemedText style={styles.locationText}>{booking.property.location}</ThemedText>
                                </View>

                                {/* Fechas */}
                                <View style={styles.datesRow}>
                                    <Ionicons name="calendar-outline" size={14} color="#2C5F7C" />
                                    <ThemedText style={styles.datesText}>
                                        {formatDate(booking.check_in_date)} - {formatDate(booking.check_out_date)}
                                    </ThemedText>
                                </View>

                                <ThemedText style={styles.nightsText}>
                                    {calculateNights(booking.check_in_date, booking.check_out_date)} noches
                                </ThemedText>

                                {/* Footer */}
                                <View style={styles.bookingFooter}>
                                    {/* Estado */}
                                    <View
                                        style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}
                                    >
                                        <ThemedText style={styles.statusText}>{getStatusText(booking.status)}</ThemedText>
                                    </View>

                                    {/* Precio */}
                                    <ThemedText style={styles.priceText}>
                                        ${booking.total_price.toLocaleString()}
                                    </ThemedText>
                                </View>

                                {/* Código de confirmación */}
                                <ThemedText style={styles.confirmationCode}>
                                    Código: {booking.confirmation_code}
                                </ThemedText>

                                {/* Botones de acción */}
                                {selectedTab === 'upcoming' && booking.status !== 'cancelled' && (
                                    <View style={styles.actionsRow}>
                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={() => router.push(`/reserva-detalle/${booking.id}`)}
                                        >
                                            <Ionicons name="eye-outline" size={18} color="#2C5F7C" />
                                            <ThemedText style={styles.actionButtonText}>Ver Detalles</ThemedText>
                                        </TouchableOpacity>

                                        {booking.status === 'confirmed' && (
                                            <TouchableOpacity
                                                style={[styles.actionButton, styles.cancelButton]}
                                                onPress={() => handleCancelBooking(booking)}
                                            >
                                                <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                                                <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))
                )}

                <View style={styles.bottomSpacing} />
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
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
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
    },
    headerTitleContainer: { flex: 1, alignItems: 'center', marginLeft: -40 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 20,
        paddingVertical: 10,
        gap: 10,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20,
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    tabActive: { backgroundColor: '#2C5F7C' },
    tabText: { fontSize: 14, fontWeight: '600', color: '#666' },
    tabTextActive: { color: '#fff' },
    scrollView: { flex: 1 },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        paddingHorizontal: 40,
    },
    emptyStateTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 20, textAlign: 'center' },
    emptyStateText: { fontSize: 15, color: '#999', marginTop: 10, textAlign: 'center' },
    exploreButton: {
        marginTop: 30,
        backgroundColor: '#2C5F7C',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 12,
    },
    exploreButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    bookingCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: 15,
        borderRadius: 15,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    bookingImage: { width: '100%', height: 180 },
    bookingInfo: { padding: 15 },
    bookingTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
    locationText: { fontSize: 14, color: '#666' },
    datesRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    datesText: { fontSize: 14, color: '#2C5F7C', fontWeight: '600' },
    nightsText: { fontSize: 13, color: '#999', marginBottom: 12 },
    bookingFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    priceText: { fontSize: 20, fontWeight: 'bold', color: '#2C5F7C' },
    confirmationCode: { fontSize: 12, color: '#999', marginBottom: 12 },
    actionsRow: { flexDirection: 'row', gap: 10 },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#2C5F7C',
    },
    actionButtonText: { fontSize: 14, color: '#2C5F7C', fontWeight: '600' },
    cancelButton: { borderColor: '#EF4444' },
    cancelButtonText: { fontSize: 14, color: '#EF4444', fontWeight: '600' },
    bottomSpacing: { height: 30 },
});
