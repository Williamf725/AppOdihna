// lib/bookingService.ts

import { supabase } from './supabase';

export interface BookingData {
  propertyId: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestDocument?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  pricePerNight: number;
  specialRequests?: string;
}

export interface BookingDetails extends BookingData {
  id: number;
  nights: number;
  totalAmount: number;
  cleaningFee: number;
  serviceFee: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: string;
  propertyTitle?: string;
  propertyImage?: string;
  propertyLocation?: string;
}

// Verificar disponibilidad de fechas
export const checkAvailability = async (
  propertyId: number,
  checkIn: string,
  checkOut: string
): Promise<boolean> => {
  try {
    // 1. Obtener fechas bloqueadas del alojamiento
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('blocked_dates')
      .eq('id', propertyId)
      .single();

    if (propertyError) throw propertyError;

    const blockedDates = property.blocked_dates || [];
    const requestedDates = generateDateRange(checkIn, checkOut);

    // 2. Verificar si alguna fecha está bloqueada
    const hasBlockedDate = requestedDates.some(date => 
      blockedDates.includes(date)
    );

    if (hasBlockedDate) return false;

    // 3. Verificar reservas existentes
    const { data: existingBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('check_in, check_out')
      .eq('property_id', propertyId)
      .in('status', ['pending', 'confirmed'])
      .or(`check_in.lte.${checkOut},check_out.gte.${checkIn}`);

    if (bookingsError) throw bookingsError;

    return existingBookings.length === 0;
  } catch (error) {
    console.error('Error checking availability:', error);
    return false;
  }
};

// Calcular precio total
export const calculateTotalPrice = (
  pricePerNight: number,
  nights: number
): { subtotal: number; cleaningFee: number; serviceFee: number; total: number } => {
  const subtotal = pricePerNight * nights;
  const cleaningFee = Math.round(pricePerNight * 0.1); // 10% del precio por noche
  const serviceFee = Math.round(subtotal * 0.05); // 5% de comisión
  const total = subtotal + cleaningFee + serviceFee;

  return { subtotal, cleaningFee, serviceFee, total };
};

// Crear nueva reserva
export const createBooking = async (bookingData: BookingData): Promise<BookingDetails | null> => {
  try {
    const nights = calculateNights(bookingData.checkIn, bookingData.checkOut);
    const { subtotal, cleaningFee, serviceFee, total } = calculateTotalPrice(
      bookingData.pricePerNight,
      nights
    );

    // 1. Verificar disponibilidad antes de crear
    const isAvailable = await checkAvailability(
      bookingData.propertyId,
      bookingData.checkIn,
      bookingData.checkOut
    );

    if (!isAvailable) {
      throw new Error('Las fechas seleccionadas no están disponibles');
    }

    // 2. Crear la reserva
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([{
        property_id: bookingData.propertyId,
        guest_name: bookingData.guestName,
        guest_email: bookingData.guestEmail,
        guest_phone: bookingData.guestPhone,
        guest_document: bookingData.guestDocument,
        check_in: bookingData.checkIn,
        check_out: bookingData.checkOut,
        nights,
        adults: bookingData.adults,
        children: bookingData.children,
        price_per_night: bookingData.pricePerNight,
        total_amount: total,
        cleaning_fee: cleaningFee,
        service_fee: serviceFee,
        special_requests: bookingData.specialRequests,
        status: 'pending',
        payment_status: 'pending',
      }])
      .select()
      .single();

    if (bookingError) throw bookingError;

    // 3. Bloquear fechas en el calendario
    await blockDates(bookingData.propertyId, bookingData.checkIn, bookingData.checkOut);

    return booking as BookingDetails;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
};

// Bloquear fechas en el calendario
const blockDates = async (propertyId: number, checkIn: string, checkOut: string) => {
  try {
    // 1. Obtener fechas bloqueadas actuales
    const { data: property } = await supabase
      .from('properties')
      .select('blocked_dates')
      .eq('id', propertyId)
      .single();

    const currentBlockedDates = property?.blocked_dates || [];
    const newBlockedDates = generateDateRange(checkIn, checkOut);
    const updatedBlockedDates = [...currentBlockedDates, ...newBlockedDates];

    // 2. Actualizar fechas bloqueadas
    await supabase
      .from('properties')
      .update({ blocked_dates: updatedBlockedDates })
      .eq('id', propertyId);
  } catch (error) {
    console.error('Error blocking dates:', error);
  }
};

// Desbloquear fechas (al cancelar)
const unblockDates = async (propertyId: number, checkIn: string, checkOut: string) => {
  try {
    const { data: property } = await supabase
      .from('properties')
      .select('blocked_dates')
      .eq('id', propertyId)
      .single();

    const currentBlockedDates = property?.blocked_dates || [];
    const datesToUnblock = generateDateRange(checkIn, checkOut);
    const updatedBlockedDates = currentBlockedDates.filter(
      (date: string) => !datesToUnblock.includes(date)
    );

    await supabase
      .from('properties')
      .update({ blocked_dates: updatedBlockedDates })
      .eq('id', propertyId);
  } catch (error) {
    console.error('Error unblocking dates:', error);
  }
};

// Obtener todas las reservas de un usuario (por email)
export const getUserBookings = async (guestEmail: string): Promise<BookingDetails[]> => {
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        properties:property_id (
          id,
          title,
          location,
          images
        )
      `)
      .eq('guest_email', guestEmail)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return bookings.map((booking: any) => ({
      ...booking,
      propertyTitle: booking.properties?.title,
      propertyImage: booking.properties?.images?.[0],
      propertyLocation: booking.properties?.location,
    }));
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return [];
  }
};

// Cancelar reserva
export const cancelBooking = async (
  bookingId: number,
  cancellationReason?: string
): Promise<boolean> => {
  try {
    // 1. Obtener detalles de la reserva
    const { data: booking } = await supabase
      .from('bookings')
      .select('property_id, check_in, check_out')
      .eq('id', bookingId)
      .single();

    if (!booking) return false;

    // 2. Actualizar estado de la reserva
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: cancellationReason,
      })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    // 3. Desbloquear fechas en el calendario
    await unblockDates(booking.property_id, booking.check_in, booking.check_out);

    return true;
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return false;
  }
};

// Confirmar reserva (cuando se paga)
export const confirmBooking = async (bookingId: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    return !error;
  } catch (error) {
    console.error('Error confirming booking:', error);
    return false;
  }
};

// Utilidades
const generateDateRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current < end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

const calculateNights = (checkIn: string, checkOut: string): number => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CO', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const getBookingStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
    completed: 'Completada',
  };
  return statusMap[status] || status;
};

export const getBookingStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    pending: '#FFA500',
    confirmed: '#4CAF50',
    cancelled: '#F44336',
    completed: '#2196F3',
  };
  return colorMap[status] || '#999';
};
