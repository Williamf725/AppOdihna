// lib/bookingService.ts
import { supabase } from './supabase';

export interface BookingData {
  guest_id: string;
  property_id: number;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  children: number;
  total_guests: number;
  price_per_night: number;
  number_of_nights: number;
  subtotal: number;
  service_fee: number;
  taxes: number;
  total_price: number;
  guest_email?: string;
  guest_phone?: string;
  special_requests?: string;
}

export interface Booking extends BookingData {
  id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  confirmation_code: string;
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  cancelled_by?: string;
}

// Generar código de confirmación único
export const generateConfirmationCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'ODH';
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Calcular número de noches entre dos fechas
export const calculateNights = (checkIn: Date, checkOut: Date): number => {
  const diffTime = checkOut.getTime() - checkIn.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Calcular precio total con desglose
export const calculatePricing = (pricePerNight: number, nights: number) => {
  const subtotal = pricePerNight * nights;
  const serviceFee = Math.round(subtotal * 0.12); // 12% tarifa de servicio
  const taxes = Math.round(subtotal * 0.05); // 5% impuestos
  const total = subtotal + serviceFee + taxes;

  return {
    subtotal,
    serviceFee,
    taxes,
    total,
  };
};

// Verificar si las fechas están disponibles (no bloqueadas)
export const checkAvailability = async (
  propertyId: number,
  checkIn: Date,
  checkOut: Date
): Promise<{ available: boolean; blockedDates: string[] }> => {
  try {
    // Obtener las fechas bloqueadas de la propiedad
    const { data: property, error } = await supabase
      .from('properties')
      .select('blocked_dates')
      .eq('id', propertyId)
      .single();

    if (error) throw error;

    const blockedDates: string[] = property?.blocked_dates || [];

    // Generar todas las fechas entre check-in y check-out
    const requestedDates: string[] = [];
    const currentDate = new Date(checkIn);
    const endDate = new Date(checkOut);

    while (currentDate < endDate) {
      requestedDates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Verificar si alguna fecha solicitada está bloqueada
    const conflictDates = requestedDates.filter(date => blockedDates.includes(date));

    return {
      available: conflictDates.length === 0,
      blockedDates: conflictDates,
    };
  } catch (error) {
    console.error('Error checking availability:', error);
    throw error;
  }
};

// Verificar si hay reservas existentes en esas fechas
export const checkExistingBookings = async (
  propertyId: number,
  checkIn: Date,
  checkOut: Date
): Promise<boolean> => {
  try {
    const checkInStr = checkIn.toISOString().split('T')[0];
    const checkOutStr = checkOut.toISOString().split('T')[0];

    // Buscar reservas que se solapen con las fechas solicitadas
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('property_id', propertyId)
      .neq('status', 'cancelled')
      .or(`check_in_date.lte.${checkOutStr},check_out_date.gte.${checkInStr}`);

    if (error) throw error;

    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking existing bookings:', error);
    return false;
  }
};

// Crear una nueva reserva
export const createBooking = async (bookingData: BookingData): Promise<Booking> => {
  try {
    const confirmationCode = generateConfirmationCode();

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        ...bookingData,
        status: 'confirmed', // Auto-confirmar para simplificar
        confirmation_code: confirmationCode,
      })
      .select()
      .single();

    if (error) throw error;

    // Actualizar las fechas bloqueadas de la propiedad
    await blockDatesForBooking(
      bookingData.property_id,
      new Date(bookingData.check_in_date),
      new Date(bookingData.check_out_date)
    );

    // ✅ NOTIFICACIONES: Enviar notificaciones a anfitrión y huésped
    try {
      // Obtener datos de la propiedad y su dueño
      const { data: propertyData } = await supabase
        .from('properties')
        .select('title, owner_id')
        .eq('id', bookingData.property_id)
        .single();

      // Obtener nombre del huésped
      const { data: guestData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', bookingData.guest_id)
        .single();

      if (propertyData && guestData) {
        // Importar dinámicamente para evitar dependencia circular
        const { notifyNewBooking, notifyBookingConfirmed } = await import('./notificationService');

        // Notificar al anfitrión sobre nueva reserva
        await notifyNewBooking(
          propertyData.owner_id,
          guestData.full_name || 'Huésped',
          propertyData.title,
          bookingData.check_in_date,
          bookingData.check_out_date,
          data.id,
          confirmationCode
        );

        // Notificar al huésped sobre confirmación
        await notifyBookingConfirmed(
          bookingData.guest_id,
          propertyData.title,
          bookingData.check_in_date,
          bookingData.check_out_date,
          data.id,
          confirmationCode
        );
      }
    } catch (notifError) {
      console.log('⚠️ Error enviando notificaciones (no crítico):', notifError);
      // No lanzar error - las notificaciones son secundarias
    }

    return data as Booking;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
};

// Bloquear fechas después de una reserva
export const blockDatesForBooking = async (
  propertyId: number,
  checkIn: Date,
  checkOut: Date
): Promise<void> => {
  try {
    // Obtener fechas bloqueadas actuales
    const { data: property, error: fetchError } = await supabase
      .from('properties')
      .select('blocked_dates')
      .eq('id', propertyId)
      .single();

    if (fetchError) throw fetchError;

    const currentBlockedDates: string[] = property?.blocked_dates || [];

    // Generar nuevas fechas a bloquear
    const newBlockedDates: string[] = [];
    const currentDate = new Date(checkIn);
    const endDate = new Date(checkOut);

    while (currentDate < endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (!currentBlockedDates.includes(dateStr)) {
        newBlockedDates.push(dateStr);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Combinar y actualizar
    const updatedBlockedDates = [...currentBlockedDates, ...newBlockedDates];

    const { error: updateError } = await supabase
      .from('properties')
      .update({ blocked_dates: updatedBlockedDates })
      .eq('id', propertyId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error blocking dates:', error);
    throw error;
  }
};

// Desbloquear fechas cuando se cancela una reserva
export const unblockDatesForBooking = async (
  propertyId: number,
  checkIn: Date,
  checkOut: Date
): Promise<void> => {
  try {
    // Obtener fechas bloqueadas actuales
    const { data: property, error: fetchError } = await supabase
      .from('properties')
      .select('blocked_dates')
      .eq('id', propertyId)
      .single();

    if (fetchError) throw fetchError;

    const currentBlockedDates: string[] = property?.blocked_dates || [];

    // Generar fechas a desbloquear
    const datesToUnblock: string[] = [];
    const currentDate = new Date(checkIn);
    const endDate = new Date(checkOut);

    while (currentDate < endDate) {
      datesToUnblock.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Filtrar las fechas que se deben mantener bloqueadas
    const updatedBlockedDates = currentBlockedDates.filter(
      date => !datesToUnblock.includes(date)
    );

    const { error: updateError } = await supabase
      .from('properties')
      .update({ blocked_dates: updatedBlockedDates })
      .eq('id', propertyId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error unblocking dates:', error);
    throw error;
  }
};

// Cancelar una reserva
export const cancelBooking = async (
  bookingId: string,
  cancelledBy: string,
  reason?: string
): Promise<void> => {
  try {
    // Obtener la reserva actual con más información para notificaciones
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('property_id, check_in_date, check_out_date, guest_id')
      .eq('id', bookingId)
      .single();

    if (fetchError) throw fetchError;

    // Actualizar el estado de la reserva
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: cancelledBy,
        cancellation_reason: reason,
      })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    // Desbloquear las fechas
    await unblockDatesForBooking(
      booking.property_id,
      new Date(booking.check_in_date),
      new Date(booking.check_out_date)
    );

    // ✅ NOTIFICACIONES: Notificar a ambas partes sobre la cancelación
    try {
      // Obtener datos de la propiedad y anfitrión
      const { data: propertyData } = await supabase
        .from('properties')
        .select('title, owner_id')
        .eq('id', booking.property_id)
        .single();

      // Obtener nombre del huésped
      const { data: guestData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', booking.guest_id)
        .single();

      // Obtener nombre del anfitrión
      const { data: hostData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', propertyData?.owner_id)
        .single();

      if (propertyData && guestData) {
        const { notifyCancellation } = await import('./notificationService');

        // ✅ Notificar a AMBAS partes sobre la cancelación

        // Notificar al anfitrión
        await notifyCancellation(
          propertyData.owner_id,
          true, // isHost
          guestData.full_name || 'Huésped',
          propertyData.title,
          bookingId
        );

        // Notificar al huésped
        await notifyCancellation(
          booking.guest_id,
          false, // isHost
          hostData?.full_name || 'Anfitrión',
          propertyData.title,
          bookingId
        );
      }
    } catch (notifError) {
      console.log('⚠️ Error enviando notificaciones de cancelación (no crítico):', notifError);
    }
  } catch (error) {
    console.error('Error cancelling booking:', error);
    throw error;
  }
};

// Confirmar una reserva pendiente
export const confirmBooking = async (bookingId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId);

    if (error) throw error;
  } catch (error) {
    console.error('Error confirming booking:', error);
    throw error;
  }
};

// Obtener reservas de un huésped
export const getGuestBookings = async (guestId: string): Promise<Booking[]> => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        property:properties(id, title, images, location, city)
      `)
      .eq('guest_id', guestId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Booking[];
  } catch (error) {
    console.error('Error fetching guest bookings:', error);
    throw error;
  }
};

// Obtener reservas para un anfitrión (de todas sus propiedades)
export const getHostBookings = async (hostId: string): Promise<Booking[]> => {
  try {
    // Primero obtener las propiedades del host
    const { data: properties, error: propsError } = await supabase
      .from('properties')
      .select('id')
      .eq('owner_id', hostId);

    if (propsError) throw propsError;

    const propertyIds = properties.map(p => p.id);

    if (propertyIds.length === 0) return [];

    // Obtener las reservas de esas propiedades
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        property:properties(id, title, images, location),
        guest:profiles!guest_id(id, full_name, avatar_url, phone, email)
      `)
      .in('property_id', propertyIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Booking[];
  } catch (error) {
    console.error('Error fetching host bookings:', error);
    throw error;
  }
};

// Obtener detalle de una reserva
export const getBookingById = async (bookingId: string): Promise<Booking | null> => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        property:properties(id, title, images, location, city, department, price, amenities),
        guest:profiles!guest_id(id, full_name, avatar_url, phone, email)
      `)
      .eq('id', bookingId)
      .single();

    if (error) throw error;
    return data as Booking;
  } catch (error) {
    console.error('Error fetching booking:', error);
    return null;
  }
};

// Formatear fecha para mostrar
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// Formatear precio con separadores de miles
export const formatPrice = (price: number): string => {
  return price.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};
