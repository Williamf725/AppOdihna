// app/gestionar-reservas/index.tsx
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
    Linking,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

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

export default function GestionarReservasScreen() {
    return (
        <ProtectedRoute requireRole="host">
            <GestionarReservasContent />
        </ProtectedRoute>
    );
}

function GestionarReservasContent() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<HostBooking[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filtros
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [selectedProperty, setSelectedProperty] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showPropertyModal, setShowPropertyModal] = useState(false);

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

    useFocusEffect(
        useCallback(() => {
            if (user) {
                loadProperties();
                loadBookings();
            }
        }, [user])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadBookings();
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
            case 'confirmed': return '#10B981';
            case 'pending': return '#F59E0B';
            case 'cancelled': return '#EF4444';
            case 'completed': return '#6B7280';
            default: return '#6B7280';
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
                    <ThemedText style={styles.headerTitle}>Gestionar Reservas</ThemedText>
                    <ThemedText style={styles.headerSubtitle}>Panel de anfitrión</ThemedText>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Dashboard de estadísticas */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Ionicons name="calendar" size={28} color="#2C5F7C" />
                        <ThemedText style={styles.statValue}>{stats.totalBookings}</ThemedText>
                        <ThemedText style={styles.statLabel}>Reservas Totales</ThemedText>
                    </View>

                    <View style={styles.statCard}>
                        <Ionicons name="cash" size={28} color="#10B981" />
                        <ThemedText style={styles.statValue}>${(stats.monthlyRevenue / 1000).toFixed(0)}K</ThemedText>
                        <ThemedText style={styles.statLabel}>Ingresos del Mes</ThemedText>
                    </View>

                    <View style={styles.statCard}>
                        <Ionicons name="trending-up" size={28} color="#F59E0B" />
                        <ThemedText style={styles.statValue}>{stats.upcomingCheckIns}</ThemedText>
                        <ThemedText style={styles.statLabel}>Próximas Llegadas</ThemedText>
                    </View>
                </View>

                {/* Filtros */}
                <View style={styles.filtersContainer}>
                    {/* Barra de búsqueda */}
                    <View style={styles.searchBar}>
                        <Ionicons name="search-outline" size={20} color="#999" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar por huésped o código..."
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

                    {/* Filtros de estado y propiedad */}
                    <View style={styles.filterRow}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <TouchableOpacity
                                style={[styles.filterChip, selectedStatus === 'all' && styles.filterChipActive]}
                                onPress={() => setSelectedStatus('all')}
                            >
                                <ThemedText
                                    style={[styles.filterChipText, selectedStatus === 'all' && styles.filterChipTextActive]}
                                >
                                    Todas
                                </ThemedText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.filterChip, selectedStatus === 'pending' && styles.filterChipActive]}
                                onPress={() => setSelectedStatus('pending')}
                            >
                                <ThemedText
                                    style={[styles.filterChipText, selectedStatus === 'pending' && styles.filterChipTextActive]}
                                >
                                    Pendientes
                                </ThemedText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.filterChip, selectedStatus === 'confirmed' && styles.filterChipActive]}
                                onPress={() => setSelectedStatus('confirmed')}
                            >
                                <ThemedText
                                    style={[styles.filterChipText, selectedStatus === 'confirmed' && styles.filterChipTextActive]}
                                >
                                    Confirmadas
                                </ThemedText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.filterChip, selectedStatus === 'completed' && styles.filterChipActive]}
                                onPress={() => setSelectedStatus('completed')}
                            >
                                <ThemedText
                                    style={[styles.filterChipText, selectedStatus === 'completed' && styles.filterChipTextActive]}
                                >
                                    Completadas
                                </ThemedText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.filterChip}
                                onPress={() => setShowPropertyModal(true)}
                            >
                                <Ionicons name="home-outline" size={16} color="#2C5F7C" />
                                <ThemedText style={styles.filterChipText}>
                                    {selectedProperty ? properties.find(p => p.id === selectedProperty)?.title.substring(0, 15) + '...' : 'Propiedad'}
                                </ThemedText>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>

                {/* Lista de reservas */}
                <View style={styles.bookingsContainer}>
                    <ThemedText style={styles.sectionTitle}>
                        Reservas ({filteredBookings.length})
                    </ThemedText>

                    {filteredBookings.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="receipt-outline" size={64} color="#ccc" />
                            <ThemedText style={styles.emptyStateText}>No hay reservas con estos filtros</ThemedText>
                        </View>
                    ) : (
                        filteredBookings.map((booking) => (
                            <TouchableOpacity
                                key={booking.id}
                                style={styles.bookingCard}
                                onPress={() => router.push(`/reserva-detalle/${booking.id}`)}
                                activeOpacity={0.7}
                            >
                                {/* Header del card */}
                                <View style={styles.bookingHeader}>
                                    <View style={styles.guestInfo}>
                                        {booking.guest.avatar_url ? (
                                            <Image
                                                source={{ uri: booking.guest.avatar_url }}
                                                style={styles.guestAvatar}
                                                contentFit="cover"
                                            />
                                        ) : (
                                            <View style={styles.guestAvatarPlaceholder}>
                                                <Ionicons name="person" size={20} color="#999" />
                                            </View>
                                        )}
                                        <View style={styles.guestDetails}>
                                            <ThemedText style={styles.guestName}>{booking.guest.full_name}</ThemedText>
                                            <ThemedText style={styles.confirmationText}>
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
                                    <ThemedText style={styles.propertyTitle} numberOfLines={1}>
                                        {booking.property.title}
                                    </ThemedText>

                                    <View style={styles.infoRow}>
                                        <Ionicons name="calendar-outline" size={16} color="#666" />
                                        <ThemedText style={styles.infoText}>
                                            {formatDate(booking.check_in_date)} - {formatDate(booking.check_out_date)}
                                        </ThemedText>
                                    </View>

                                    <View style={styles.infoRow}>
                                        <Ionicons name="people-outline" size={16} color="#666" />
                                        <ThemedText style={styles.infoText}>
                                            {booking.adults + booking.children} huéspedes
                                        </ThemedText>
                                    </View>

                                    <View style={styles.priceRow}>
                                        <ThemedText style={styles.price}>${booking.total_price.toLocaleString()}</ThemedText>
                                    </View>
                                </View>

                                {/* Acciones */}
                                <View style={styles.actionsRow}>
                                    <TouchableOpacity
                                        style={styles.actionBtn}
                                        onPress={() => router.push(`/reserva-detalle/${booking.id}`)}
                                    >
                                        <Ionicons name="eye-outline" size={18} color="#2C5F7C" />
                                    </TouchableOpacity>

                                    {booking.status === 'pending' && (
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.confirmBtn]}
                                            onPress={() => handleConfirmBooking(booking.id)}
                                        >
                                            <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
                                        </TouchableOpacity>
                                    )}

                                    {(booking.status === 'pending' || booking.status === 'confirmed') && (
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.cancelBtn]}
                                            onPress={() => handleCancelBooking(booking.id)}
                                        >
                                            <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        style={[styles.actionBtn, styles.contactBtn]}
                                        onPress={() => handleContactGuest(booking.guest.phone, booking.guest.full_name)}
                                    >
                                        <Ionicons name="chatbubble-outline" size={18} color="#D4AF37" />
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                <View style={styles.bottomSpacing} />
            </ScrollView>

            {/* Modal de selección de propiedad */}
            <Modal
                visible={showPropertyModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowPropertyModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <ThemedText style={styles.modalTitle}>Filtrar por Propiedad</ThemedText>
                            <TouchableOpacity onPress={() => setShowPropertyModal(false)}>
                                <Ionicons name="close" size={28} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.propertyItem}
                            onPress={() => {
                                setSelectedProperty(null);
                                setShowPropertyModal(false);
                            }}
                        >
                            <ThemedText style={styles.propertyText}>Todas las propiedades</ThemedText>
                            {selectedProperty === null && <Ionicons name="checkmark" size={24} color="#2C5F7C" />}
                        </TouchableOpacity>

                        <ScrollView>
                            {properties.map((property) => (
                                <TouchableOpacity
                                    key={property.id}
                                    style={styles.propertyItem}
                                    onPress={() => {
                                        setSelectedProperty(property.id);
                                        setShowPropertyModal(false);
                                    }}
                                >
                                    <ThemedText style={styles.propertyText}>{property.title}</ThemedText>
                                    {selectedProperty === property.id && (
                                        <Ionicons name="checkmark" size={24} color="#2C5F7C" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
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
    headerSubtitle: { fontSize: 14, color: '#D4AF37', marginTop: 2 },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 20,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statValue: { fontSize: 24, fontWeight: 'bold', color: '#2C5F7C', marginTop: 8 },
    statLabel: { fontSize: 12, color: '#666', textAlign: 'center', marginTop: 4 },
    filtersContainer: { paddingHorizontal: 20, paddingBottom: 15 },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginBottom: 15,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    searchInput: { flex: 1, fontSize: 16, color: '#000' },
    filterRow: { flexDirection: 'row', gap: 10 },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        marginRight: 8,
        gap: 6,
    },
    filterChipActive: { backgroundColor: '#2C5F7C' },
    filterChipText: { fontSize: 14, color: '#666', fontWeight: '600' },
    filterChipTextActive: { color: '#fff' },
    bookingsContainer: { paddingHorizontal: 20, paddingTop: 10 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyStateText: { fontSize: 16, color: '#999', marginTop: 16 },
    bookingCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    bookingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    guestInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    guestAvatar: { width: 40, height: 40, borderRadius: 20 },
    guestAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    guestDetails: { flex: 1 },
    guestName: { fontSize: 16, fontWeight: 'bold' },
    confirmationText: { fontSize: 12, color: '#999', marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
    statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    bookingBody: { marginBottom: 12 },
    propertyTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    infoText: { fontSize: 14, color: '#666' },
    priceRow: { marginTop: 8 },
    price: { fontSize: 20, fontWeight: 'bold', color: '#2C5F7C' },
    actionsRow: { flexDirection: 'row', gap: 8 },
    actionBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#2C5F7C',
        backgroundColor: '#fff',
    },
    confirmBtn: { borderColor: '#10B981' },
    cancelBtn: { borderColor: '#EF4444' },
    contactBtn: { borderColor: '#D4AF37' },
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
        maxHeight: '70%',
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
    propertyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    propertyText: { fontSize: 16 },
});
