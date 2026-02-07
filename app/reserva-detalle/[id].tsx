// app/reserva-detalle/[id].tsx
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/useAuth';
import { cancelBooking, confirmBooking, formatDate } from '@/lib/bookingService';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

interface BookingDetail {
    id: string;
    property_id: number;
    check_in_date: string;
    check_out_date: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    total_price: number;
    confirmation_code: string;
    adults: number;
    children: number;
    total_guests: number;
    price_per_night: number;
    number_of_nights: number;
    subtotal: number;
    service_fee: number;
    taxes: number;
    guest_email: string;
    guest_phone: string;
    special_requests: string;
    created_at: string;
    cancelled_at: string | null;
    property: {
        id: number;
        title: string;
        images: string[];
        location: string;
        city: string;
        department: string;
        amenities: string[];
    };
    guest: {
        id: string;
        full_name: string;
        avatar_url: string;
        phone: string;
        email: string;
    };
}

export default function ReservaDetalleScreen() {
    const { id } = useLocalSearchParams();
    const { user, profile } = useAuth();
    const [booking, setBooking] = useState<BookingDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Determinar si el usuario es el anfitrión o el huésped
    const isHost = profile?.role === 'host';
    const isGuest = booking?.guest?.id === user?.id;

    useEffect(() => {
        loadBooking();
    }, [id]);

    const loadBooking = async () => {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
          *,
          property:properties(id, title, images, location, city, department, amenities),
          guest:profiles!guest_id(id, full_name, avatar_url, phone, email)
        `)
                .eq('id', id)
                .single();

            if (error) throw error;
            setBooking(data);
        } catch (error) {
            console.error('Error loading booking:', error);
            Alert.alert('Error', 'No se pudo cargar la reserva');
        } finally {
            setLoading(false);
        }
    };

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

    const getStatusText = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'Confirmada';
            case 'pending':
                return 'Pendiente de confirmación';
            case 'cancelled':
                return 'Cancelada';
            case 'completed':
                return 'Completada';
            default:
                return status;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'checkmark-circle';
            case 'pending':
                return 'time';
            case 'cancelled':
                return 'close-circle';
            case 'completed':
                return 'flag';
            default:
                return 'help-circle';
        }
    };

    const handleConfirm = async () => {
        if (!booking) return;

        Alert.alert(
            'Confirmar Reserva',
            '¿Deseas confirmar esta reserva?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            await confirmBooking(booking.id);
                            Alert.alert('Éxito', 'Reserva confirmada correctamente');
                            loadBooking();
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo confirmar la reserva');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleCancel = async () => {
        if (!booking || !user) return;

        // Calcular horas hasta el check-in
        const checkInDate = new Date(booking.check_in_date);
        const now = new Date();
        const hoursUntilCheckIn = (checkInDate.getTime() - now.getTime()) / (1000 * 3600);
        const isSameDay = checkInDate.toDateString() === now.toDateString();
        const isCloseToCheckIn = hoursUntilCheckIn < 48 && hoursUntilCheckIn > 0;
        const isPastCheckIn = hoursUntilCheckIn <= 0;

        // Función para ejecutar la cancelación
        const executeCancellation = async () => {
            setActionLoading(true);
            try {
                await cancelBooking(booking.id, user.id);
                Alert.alert('Éxito', 'Reserva cancelada correctamente');
                loadBooking();
            } catch (error) {
                Alert.alert('Error', 'No se pudo cancelar la reserva');
            } finally {
                setActionLoading(false);
            }
        };

        // Si es el mismo día del check-in o ya pasó
        if (isSameDay || isPastCheckIn) {
            const warningTitle = isPastCheckIn
                ? '⚠️ Reserva ya iniciada'
                : '⚠️ Cancelación el día del check-in';
            const warningMessage = isPastCheckIn
                ? 'Esta reserva ya comenzó o está en curso. Cancelarla puede afectar al huésped que ya llegó o está por llegar. ¿Estás completamente seguro?'
                : `El check-in es HOY. Cancelar con tan poco tiempo de anticipación puede causar inconvenientes ${isHost ? 'al huésped' : 'al anfitrión'}. ¿Deseas continuar?`;

            Alert.alert(
                warningTitle,
                warningMessage,
                [
                    { text: 'No cancelar', style: 'cancel' },
                    {
                        text: 'Entiendo, continuar',
                        style: 'destructive',
                        onPress: () => {
                            // Segundo mensaje de confirmación
                            Alert.alert(
                                '🚨 Confirmación final',
                                'Esta acción no se puede deshacer. La otra parte será notificada inmediatamente.',
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

        // Si es menos de 48 horas pero más de un día
        if (isCloseToCheckIn) {
            const hoursText = Math.round(hoursUntilCheckIn);
            Alert.alert(
                '⚠️ Cancelación próxima al check-in',
                `Faltan aproximadamente ${hoursText} horas para el check-in. Cancelar con poco tiempo de anticipación puede causar inconvenientes ${isHost ? 'al huésped' : 'al anfitrión'}.\n\n¿Deseas continuar con la cancelación?`,
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
            '¿Estás seguro que deseas cancelar esta reserva? Esta acción no se puede deshacer.',
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

    const handleContact = () => {
        if (!booking) return;

        const phone = isHost ? booking.guest?.phone : '573001234567'; // Teléfono del anfitrión
        const name = isHost ? booking.guest?.full_name : 'el anfitrión';
        const message = `Hola ${name}, te contacto sobre la reserva ${booking.confirmation_code} en ${booking.property?.title}.`;

        const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'No se pudo abrir WhatsApp');
        });
    };

    if (loading) {
        return (
            <ThemedView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2C5F7C" />
                <ThemedText style={styles.loadingText}>Cargando reserva...</ThemedText>
            </ThemedView>
        );
    }

    if (!booking) {
        return (
            <ThemedView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <ThemedText style={styles.headerTitle}>Detalle de Reserva</ThemedText>
                </View>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
                    <ThemedText style={styles.errorText}>Reserva no encontrada</ThemedText>
                </View>
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
                <View style={styles.headerContent}>
                    <ThemedText style={styles.headerTitle}>Detalle de Reserva</ThemedText>
                    <ThemedText style={styles.headerCode}>#{booking.confirmation_code}</ThemedText>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Estado de la reserva */}
                <View style={[styles.statusCard, { borderLeftColor: getStatusColor(booking.status) }]}>
                    <Ionicons
                        name={getStatusIcon(booking.status) as any}
                        size={32}
                        color={getStatusColor(booking.status)}
                    />
                    <View style={styles.statusInfo}>
                        <ThemedText style={styles.statusText}>{getStatusText(booking.status)}</ThemedText>
                        <ThemedText style={styles.statusDate}>
                            Reserva creada el {formatDate(booking.created_at)}
                        </ThemedText>
                        {booking.cancelled_at && (
                            <ThemedText style={styles.cancelledDate}>
                                Cancelada el {formatDate(booking.cancelled_at)}
                            </ThemedText>
                        )}
                    </View>
                </View>

                {/* Información del alojamiento */}
                <TouchableOpacity
                    style={styles.propertyCard}
                    onPress={() => router.push(`/${booking.property_id}`)}
                    activeOpacity={0.7}
                >
                    <Image
                        source={{ uri: booking.property?.images?.[0] }}
                        style={styles.propertyImage}
                        contentFit="cover"
                    />
                    <View style={styles.propertyInfo}>
                        <ThemedText style={styles.propertyTitle} numberOfLines={2}>
                            {booking.property?.title}
                        </ThemedText>
                        <View style={styles.propertyLocation}>
                            <Ionicons name="location" size={14} color="#666" />
                            <ThemedText style={styles.propertyLocationText}>
                                {booking.property?.city}, {booking.property?.department}
                            </ThemedText>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#ccc" />
                </TouchableOpacity>

                {/* Fechas y huéspedes */}
                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Detalles de la estadía</ThemedText>

                    <View style={styles.detailsGrid}>
                        <View style={styles.detailItem}>
                            <Ionicons name="calendar" size={24} color="#2C5F7C" />
                            <View style={styles.detailContent}>
                                <ThemedText style={styles.detailLabel}>Check-in</ThemedText>
                                <ThemedText style={styles.detailValue}>
                                    {formatDate(booking.check_in_date)}
                                </ThemedText>
                            </View>
                        </View>

                        <View style={styles.detailItem}>
                            <Ionicons name="calendar-outline" size={24} color="#D4AF37" />
                            <View style={styles.detailContent}>
                                <ThemedText style={styles.detailLabel}>Check-out</ThemedText>
                                <ThemedText style={styles.detailValue}>
                                    {formatDate(booking.check_out_date)}
                                </ThemedText>
                            </View>
                        </View>

                        <View style={styles.detailItem}>
                            <Ionicons name="moon" size={24} color="#6B7280" />
                            <View style={styles.detailContent}>
                                <ThemedText style={styles.detailLabel}>Duración</ThemedText>
                                <ThemedText style={styles.detailValue}>
                                    {booking.number_of_nights} noches
                                </ThemedText>
                            </View>
                        </View>

                        <View style={styles.detailItem}>
                            <Ionicons name="people" size={24} color="#6B7280" />
                            <View style={styles.detailContent}>
                                <ThemedText style={styles.detailLabel}>Huéspedes</ThemedText>
                                <ThemedText style={styles.detailValue}>
                                    {booking.adults} adultos, {booking.children} niños
                                </ThemedText>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Información del huésped (solo para anfitriones) */}
                {isHost && booking.guest && (
                    <View style={styles.section}>
                        <ThemedText style={styles.sectionTitle}>Información del huésped</ThemedText>
                        <View style={styles.guestCard}>
                            {booking.guest.avatar_url ? (
                                <Image source={{ uri: booking.guest.avatar_url }} style={styles.guestAvatar} />
                            ) : (
                                <View style={styles.guestAvatarPlaceholder}>
                                    <Ionicons name="person" size={30} color="#999" />
                                </View>
                            )}
                            <View style={styles.guestInfo}>
                                <ThemedText style={styles.guestName}>{booking.guest.full_name}</ThemedText>
                                <ThemedText style={styles.guestContact}>{booking.guest.email}</ThemedText>
                                {booking.guest.phone && (
                                    <ThemedText style={styles.guestContact}>{booking.guest.phone}</ThemedText>
                                )}
                            </View>
                        </View>
                    </View>
                )}

                {/* Desglose de precio */}
                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Resumen de pago</ThemedText>
                    <View style={styles.priceBreakdown}>
                        <View style={styles.priceRow}>
                            <ThemedText style={styles.priceLabel}>
                                ${booking.price_per_night.toLocaleString()} × {booking.number_of_nights} noches
                            </ThemedText>
                            <ThemedText style={styles.priceValue}>
                                ${booking.subtotal.toLocaleString()}
                            </ThemedText>
                        </View>
                        <View style={styles.priceRow}>
                            <ThemedText style={styles.priceLabel}>Tarifa de servicio</ThemedText>
                            <ThemedText style={styles.priceValue}>
                                ${booking.service_fee.toLocaleString()}
                            </ThemedText>
                        </View>
                        <View style={styles.priceRow}>
                            <ThemedText style={styles.priceLabel}>Impuestos</ThemedText>
                            <ThemedText style={styles.priceValue}>
                                ${booking.taxes.toLocaleString()}
                            </ThemedText>
                        </View>
                        <View style={[styles.priceRow, styles.priceTotal]}>
                            <ThemedText style={styles.priceTotalLabel}>Total</ThemedText>
                            <ThemedText style={styles.priceTotalValue}>
                                ${booking.total_price.toLocaleString()} COP
                            </ThemedText>
                        </View>
                    </View>
                </View>

                {/* Botones de acción */}
                {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                    <View style={styles.actionsSection}>
                        {/* Botón de confirmar (solo hosts y si está pending) */}
                        {isHost && booking.status === 'pending' && (
                            <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={handleConfirm}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                        <ThemedText style={styles.confirmButtonText}>Confirmar Reserva</ThemedText>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}

                        {/* Botón de contactar */}
                        <TouchableOpacity style={styles.contactButton} onPress={handleContact}>
                            <Ionicons name="chatbubble" size={20} color="#fff" />
                            <ThemedText style={styles.contactButtonText}>
                                {isHost ? 'Contactar Huésped' : 'Contactar Anfitrión'}
                            </ThemedText>
                        </TouchableOpacity>

                        {/* Botón de cancelar */}
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleCancel}
                            disabled={actionLoading}
                        >
                            {actionLoading ? (
                                <ActivityIndicator color="#EF4444" />
                            ) : (
                                <>
                                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                                    <ThemedText style={styles.cancelButtonText}>Cancelar Reserva</ThemedText>
                                </>
                            )}
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
    loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { marginTop: 20, fontSize: 18, color: '#666' },
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
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContent: { flex: 1, marginLeft: 15 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    headerCode: { fontSize: 14, color: '#D4AF37', marginTop: 2 },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 20,
        padding: 20,
        borderRadius: 12,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statusInfo: { marginLeft: 15, flex: 1 },
    statusText: { fontSize: 18, fontWeight: 'bold' },
    statusDate: { fontSize: 13, color: '#666', marginTop: 4 },
    cancelledDate: { fontSize: 13, color: '#EF4444', marginTop: 2 },
    propertyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 20,
        padding: 15,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    propertyImage: { width: 80, height: 80, borderRadius: 10 },
    propertyInfo: { flex: 1, marginLeft: 15 },
    propertyTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
    propertyLocation: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    propertyLocationText: { fontSize: 14, color: '#666' },
    section: {
        backgroundColor: '#fff',
        margin: 20,
        marginTop: 15,
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    detailsGrid: { gap: 15 },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    detailContent: {},
    detailLabel: { fontSize: 13, color: '#666' },
    detailValue: { fontSize: 16, fontWeight: '600' },
    guestCard: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    guestAvatar: { width: 60, height: 60, borderRadius: 30 },
    guestAvatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    guestInfo: { flex: 1 },
    guestName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
    guestContact: { fontSize: 14, color: '#666' },
    priceBreakdown: {},
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    priceLabel: { fontSize: 15, color: '#666' },
    priceValue: { fontSize: 15, fontWeight: '500' },
    priceTotal: {
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 15,
        marginTop: 5,
    },
    priceTotalLabel: { fontSize: 18, fontWeight: 'bold' },
    priceTotalValue: { fontSize: 20, fontWeight: 'bold', color: '#2C5F7C' },
    actionsSection: { paddingHorizontal: 20, gap: 12 },
    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10B981',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#D4AF37',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    contactButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    cancelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: '#EF4444',
    },
    cancelButtonText: { color: '#EF4444', fontSize: 16, fontWeight: 'bold' },
    bottomSpacing: { height: 30 },
});
