// lib/notificationService.ts
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configurar comportamiento de notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// Tipos de notificaciones
export type NotificationType =
    | 'new_booking'           // Nueva reserva (para anfitrión)
    | 'booking_confirmed'     // Reserva confirmada (para huésped)
    | 'booking_cancelled'     // Reserva cancelada
    | 'checkin_today'         // Check-in hoy
    | 'checkout_today'        // Check-out hoy
    | 'checkin_reminder'      // Recordatorio check-in (mañana)
    | 'checkout_reminder'     // Recordatorio check-out (mañana)
    | 'new_message'           // Nuevo mensaje de chat
    | 'new_proposal'          // Nueva propuesta recibida
    | 'proposal_accepted'     // Propuesta aceptada
    | 'proposal_rejected';    // Propuesta rechazada

// Interfaz de notificación guardada
export interface NotificationRecord {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, any>;
    is_read: boolean;
    created_at: string;
}

// Datos adicionales para notificaciones
interface NotificationData {
    bookingId?: string;
    propertyId?: number;
    propertyTitle?: string;
    guestName?: string;
    hostName?: string;
    checkInDate?: string;
    checkOutDate?: string;
    confirmationCode?: string;
    conversationId?: string;
    messageId?: string;
}

// ============================================
// FUNCIONES DE REGISTRO Y PERMISOS
// ============================================

/**
 * Registrar el dispositivo para recibir notificaciones push
 * @returns Push token o null si no está disponible
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
    let token: string | null = null;

    // Las notificaciones push solo funcionan en dispositivos físicos
    if (!Device.isDevice) {
        console.log('⚠️ Las notificaciones push requieren un dispositivo físico');
        return null;
    }

    // Verificar y solicitar permisos
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('❌ Permisos de notificación denegados');
        return null;
    }

    try {
        // Obtener el push token usando el projectId de la configuración
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: projectId,
        });
        token = tokenData.data;
        console.log('✅ Push token obtenido:', token);
    } catch (error) {
        console.log('⚠️ Error obteniendo push token (normal en Expo Go):', error);
    }

    // Configuración específica para Android
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Notificaciones',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#2C5F7C',
        });
    }

    return token;
}

/**
 * Guardar el push token del usuario en Supabase
 */
export async function savePushToken(userId: string, token: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ push_token: token })
            .eq('id', userId);

        if (error) throw error;
        console.log('✅ Push token guardado en perfil');
    } catch (error) {
        console.error('❌ Error guardando push token:', error);
    }
}

// ============================================
// FUNCIONES DE NOTIFICACIÓN LOCAL
// ============================================

/**
 * Mostrar notificación local inmediata
 */
export async function showLocalNotification(
    title: string,
    body: string,
    data?: NotificationData
): Promise<void> {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data: data as any,
            sound: true,
        },
        trigger: null, // Inmediata
    });
}

/**
 * Programar notificación para una fecha específica
 */
export async function scheduleNotification(
    title: string,
    body: string,
    date: Date,
    data?: NotificationData
): Promise<string> {
    const identifier = await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data: data as any,
            sound: true,
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date,
        },
    });
    return identifier;
}

// ============================================
// FUNCIONES DE GUARDADO EN BD
// ============================================

/**
 * Guardar notificación en el historial de la base de datos
 */
export async function saveNotificationToHistory(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: NotificationData
): Promise<void> {
    try {
        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                type,
                title,
                body,
                data,
                is_read: false,
            });

        if (error) throw error;
    } catch (error) {
        console.error('Error guardando notificación en historial:', error);
    }
}

/**
 * Obtener notificaciones del usuario
 */
export async function getNotifications(userId: string): Promise<NotificationRecord[]> {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error obteniendo notificaciones:', error);
        return [];
    }
}

/**
 * Obtener contador de notificaciones no leídas
 */
export async function getUnreadCount(userId: string): Promise<number> {
    try {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw error;
        return count || 0;
    } catch (error) {
        console.error('Error obteniendo contador de no leídas:', error);
        return 0;
    }
}

/**
 * Marcar notificación como leída
 */
export async function markAsRead(notificationId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) throw error;
    } catch (error) {
        console.error('Error marcando como leída:', error);
    }
}

/**
 * Marcar todas las notificaciones como leídas
 */
export async function markAllAsRead(userId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw error;
    } catch (error) {
        console.error('Error marcando todas como leídas:', error);
    }
}

// ============================================
// FUNCIONES DE NOTIFICACIÓN ESPECÍFICAS
// ============================================

/**
 * Notificar al anfitrión sobre nueva reserva
 */
export async function notifyNewBooking(
    hostId: string,
    guestName: string,
    propertyTitle: string,
    checkInDate: string,
    checkOutDate: string,
    bookingId: string,
    confirmationCode: string
): Promise<void> {
    const title = '🎉 ¡Nueva reserva!';
    const body = `${guestName} reservó "${propertyTitle}" del ${formatDateShort(checkInDate)} al ${formatDateShort(checkOutDate)}`;

    // Mostrar notificación local
    await showLocalNotification(title, body, {
        bookingId,
        propertyTitle,
        guestName,
        checkInDate,
        checkOutDate,
        confirmationCode,
    });

    // Guardar en historial
    await saveNotificationToHistory(hostId, 'new_booking', title, body, {
        bookingId,
        propertyTitle,
        guestName,
        checkInDate,
        checkOutDate,
        confirmationCode,
    });
}

/**
 * Notificar al huésped sobre reserva confirmada
 */
export async function notifyBookingConfirmed(
    guestId: string,
    propertyTitle: string,
    checkInDate: string,
    checkOutDate: string,
    bookingId: string,
    confirmationCode: string
): Promise<void> {
    const title = '✅ ¡Reserva confirmada!';
    const body = `Tu reserva en "${propertyTitle}" está confirmada. Código: ${confirmationCode}`;

    await showLocalNotification(title, body, {
        bookingId,
        propertyTitle,
        checkInDate,
        checkOutDate,
        confirmationCode,
    });

    await saveNotificationToHistory(guestId, 'booking_confirmed', title, body, {
        bookingId,
        propertyTitle,
        checkInDate,
        checkOutDate,
        confirmationCode,
    });
}

/**
 * Notificar sobre cancelación de reserva
 */
export async function notifyCancellation(
    userId: string,
    isHost: boolean,
    otherPartyName: string,
    propertyTitle: string,
    bookingId: string
): Promise<void> {
    const title = '❌ Reserva cancelada';
    const body = isHost
        ? `${otherPartyName} canceló su reserva en "${propertyTitle}"`
        : `Tu reserva en "${propertyTitle}" fue cancelada`;

    await showLocalNotification(title, body, {
        bookingId,
        propertyTitle,
    });

    await saveNotificationToHistory(userId, 'booking_cancelled', title, body, {
        bookingId,
        propertyTitle,
    });
}

/**
 * Notificar sobre check-in hoy
 */
export async function notifyCheckInToday(
    userId: string,
    isHost: boolean,
    personName: string,
    propertyTitle: string,
    bookingId: string
): Promise<void> {
    const title = isHost ? '🏠 Huésped llega hoy' : '🎒 ¡Hoy es el día!';
    const body = isHost
        ? `${personName} hace check-in hoy en "${propertyTitle}"`
        : `Hoy es tu check-in en "${propertyTitle}"`;

    await showLocalNotification(title, body, {
        bookingId,
        propertyTitle,
    });

    await saveNotificationToHistory(userId, 'checkin_today', title, body, {
        bookingId,
        propertyTitle,
    });
}

/**
 * Notificar sobre check-out hoy
 */
export async function notifyCheckOutToday(
    userId: string,
    isHost: boolean,
    personName: string,
    propertyTitle: string,
    bookingId: string
): Promise<void> {
    const title = isHost ? '👋 Check-out hoy' : '👋 Último día';
    const body = isHost
        ? `${personName} sale hoy de "${propertyTitle}"`
        : `Hoy es tu check-out de "${propertyTitle}"`;

    await showLocalNotification(title, body, {
        bookingId,
        propertyTitle,
    });

    await saveNotificationToHistory(userId, 'checkout_today', title, body, {
        bookingId,
        propertyTitle,
    });
}

/**
 * Notificar recordatorio de check-in mañana
 */
export async function notifyCheckInReminder(
    userId: string,
    isHost: boolean,
    personName: string,
    propertyTitle: string,
    bookingId: string
): Promise<void> {
    const title = isHost ? '📅 Check-in mañana' : '📅 Tu viaje es mañana';
    const body = isHost
        ? `${personName} llega mañana a "${propertyTitle}"`
        : `Recuerda: mañana es tu check-in en "${propertyTitle}"`;

    await showLocalNotification(title, body, {
        bookingId,
        propertyTitle,
    });

    await saveNotificationToHistory(userId, 'checkin_reminder', title, body, {
        bookingId,
        propertyTitle,
    });
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Formatear fecha corta
 */
function formatDateShort(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
    });
}

/**
 * Obtener el icono según el tipo de notificación
 */
export function getNotificationIcon(type: NotificationType): string {
    switch (type) {
        case 'new_booking':
            return 'calendar';
        case 'booking_confirmed':
            return 'checkmark-circle';
        case 'booking_cancelled':
            return 'close-circle';
        case 'checkin_today':
            return 'log-in';
        case 'checkout_today':
            return 'log-out';
        case 'checkin_reminder':
            return 'alarm';
        case 'checkout_reminder':
            return 'alarm';
        default:
            return 'notifications';
    }
}

/**
 * Obtener color según el tipo de notificación
 */
export function getNotificationColor(type: NotificationType): string {
    switch (type) {
        case 'new_booking':
            return '#10B981'; // Verde
        case 'booking_confirmed':
            return '#2C5F7C'; // Azul
        case 'booking_cancelled':
            return '#EF4444'; // Rojo
        case 'checkin_today':
        case 'checkout_today':
            return '#F59E0B'; // Amarillo
        case 'checkin_reminder':
        case 'checkout_reminder':
            return '#8B5CF6'; // Púrpura
        default:
            return '#6B7280'; // Gris
    }
}
