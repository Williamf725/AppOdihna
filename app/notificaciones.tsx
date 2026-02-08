// app/notificaciones.tsx
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import {
    getNotificationColor,
    getNotificationIcon,
    getNotifications,
    markAllAsRead,
    markAsRead,
    NotificationRecord,
} from '../lib/notificationService';

export default function NotificacionesScreen() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const data = await getNotifications(user.id);
            setNotifications(data);
        } catch (error) {
            console.error('Error cargando notificaciones:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadNotifications();
    };

    const handleNotificationPress = async (notification: NotificationRecord) => {
        // Marcar como leída
        if (!notification.is_read) {
            await markAsRead(notification.id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
            );
        }

        // Navegar según el tipo
        if (notification.data?.bookingId) {
            router.push({
                pathname: '/reserva-detalle/[id]',
                params: { id: notification.data.bookingId },
            });
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!user) return;

        Alert.alert(
            'Marcar todas como leídas',
            '¿Deseas marcar todas las notificaciones como leídas?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Marcar todas',
                    onPress: async () => {
                        await markAllAsRead(user.id);
                        setNotifications((prev) =>
                            prev.map((n) => ({ ...n, is_read: true }))
                        );
                    },
                },
            ]
        );
    };

    const formatTimeAgo = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Ahora';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffHours < 24) return `Hace ${diffHours}h`;
        if (diffDays < 7) return `Hace ${diffDays} días`;
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    };

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2C5F7C" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notificaciones</Text>
                {unreadCount > 0 && (
                    <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllAsRead}>
                        <Ionicons name="checkmark-done" size={22} color="#2C5F7C" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Badge de no leídas */}
            {unreadCount > 0 && (
                <View style={styles.unreadBanner}>
                    <Ionicons name="notifications" size={18} color="#2C5F7C" />
                    <Text style={styles.unreadText}>
                        {unreadCount} {unreadCount === 1 ? 'notificación sin leer' : 'notificaciones sin leer'}
                    </Text>
                </View>
            )}

            {/* Lista de notificaciones */}
            <ScrollView
                style={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {notifications.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={64} color="#CBD5E1" />
                        <Text style={styles.emptyTitle}>Sin notificaciones</Text>
                        <Text style={styles.emptyText}>
                            Las notificaciones de tus reservas aparecerán aquí
                        </Text>
                    </View>
                ) : (
                    notifications.map((notification) => (
                        <TouchableOpacity
                            key={notification.id}
                            style={[
                                styles.notificationCard,
                                !notification.is_read && styles.notificationUnread,
                            ]}
                            onPress={() => handleNotificationPress(notification)}
                            activeOpacity={0.7}
                        >
                            <View
                                style={[
                                    styles.iconContainer,
                                    { backgroundColor: getNotificationColor(notification.type) + '20' },
                                ]}
                            >
                                <Ionicons
                                    name={getNotificationIcon(notification.type) as any}
                                    size={24}
                                    color={getNotificationColor(notification.type)}
                                />
                            </View>
                            <View style={styles.notificationContent}>
                                <View style={styles.notificationHeader}>
                                    <Text style={styles.notificationTitle} numberOfLines={1}>
                                        {notification.title}
                                    </Text>
                                    <Text style={styles.notificationTime}>
                                        {formatTimeAgo(notification.created_at)}
                                    </Text>
                                </View>
                                <Text style={styles.notificationBody} numberOfLines={2}>
                                    {notification.body}
                                </Text>
                                {!notification.is_read && <View style={styles.unreadDot} />}
                            </View>
                        </TouchableOpacity>
                    ))
                )}
                <View style={{ height: 20 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
        flex: 1,
        textAlign: 'center',
    },
    markAllButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
    },
    unreadText: {
        fontSize: 14,
        color: '#2C5F7C',
        fontWeight: '500',
    },
    list: {
        flex: 1,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 100,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1E293B',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
    },
    notificationCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    notificationUnread: {
        backgroundColor: '#FAFBFF',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    notificationContent: {
        flex: 1,
        position: 'relative',
    },
    notificationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    notificationTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1E293B',
        flex: 1,
        marginRight: 8,
    },
    notificationTime: {
        fontSize: 12,
        color: '#94A3B8',
    },
    notificationBody: {
        fontSize: 14,
        color: '#64748B',
        lineHeight: 20,
    },
    unreadDot: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#2C5F7C',
    },
});
