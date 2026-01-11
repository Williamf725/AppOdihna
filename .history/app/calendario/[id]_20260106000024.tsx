// app/calendario/[id].tsx

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/useAuth';
import { isPropertyOwner, supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';

interface PropertyCalendar {
  id: number;
  title: string;
  blockedDates: string[];
}

export default function CalendarioScreen() {
  return (
    <ProtectedRoute requireRole="host">
      <CalendarioContent />
    </ProtectedRoute>
  );
}

function CalendarioContent() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  const [property, setProperty] = useState<PropertyCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [isOwner, setIsOwner] = useState(false);
  const [checkingOwnership, setCheckingOwnership] = useState(true);

  // Verificar propiedad del alojamiento
  useEffect(() => {
    const checkOwnership = async () => {
      if (!id || !user) {
        setCheckingOwnership(false);
        return;
      }

      const ownerCheck = await isPropertyOwner(Number(id), user?.id || '');
      setIsOwner(ownerCheck);
      setCheckingOwnership(false);

      if (!ownerCheck) {
        Alert.alert(
          'Acceso denegado',
          'No tienes permiso para gestionar el calendario de este alojamiento',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    };

    checkOwnership();
  }, [id, user]);

  // Cargar propiedad
  useEffect(() => {
    const loadProperty = async () => {
      if (!id) return;

      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        // Verificar propiedad
        if (data.owner_id !== user?.id) {
          Alert.alert('Error', 'No tienes permiso para gestionar este calendario', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }

        const propertyData: PropertyCalendar = {
          id: data.id,
          title: data.title,
          blockedDates: Array.isArray(data.blocked_dates) ? data.blocked_dates : [],
        };

        setProperty(propertyData);
        updateMarkedDates(propertyData.blockedDates);
      } catch (error) {
        console.error('Error loading property:', error);
        Alert.alert('Error', 'No se pudo cargar el calendario');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadProperty();
  }, [id, user]);

  // Actualizar fechas marcadas en el calendario
  const updateMarkedDates = (blockedDates: string[]) => {
    const marked: any = {};

    blockedDates.forEach((date) => {
      marked[date] = {
        selected: true,
        marked: true,
        selectedColor: '#DC2626',
        dotColor: '#DC2626',
      };
    });

    setMarkedDates(marked);
  };

  // Manejar selección de fecha
  const handleDayPress = (day: DateData) => {
    if (!property) return;

    const dateString = day.dateString;
    const isBlocked = property.blockedDates.includes(dateString);

    let updatedBlockedDates: string[];

    if (isBlocked) {
      // Desbloquear fecha
      updatedBlockedDates = property.blockedDates.filter((date) => date !== dateString);
    } else {
      // Bloquear fecha
      updatedBlockedDates = [...property.blockedDates, dateString];
    }

    // Actualizar estado local
    setProperty({
      ...property,
      blockedDates: updatedBlockedDates,
    });

    updateMarkedDates(updatedBlockedDates);
  };

  // Guardar cambios en la base de datos
  // En app/calendario/[id].tsx, busca handleSaveChanges y cámbialo:

const handleSaveChanges = async () => {
  if (!property) return;

  Alert.alert('Guardar cambios', '¿Deseas guardar los cambios en el calendario?', [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Guardar',
      onPress: async () => {
        try {
          setSaving(true);
          const { error } = await supabase
            .from('properties')
            .update({
              blocked_dates: property.blockedDates, // ✅ blocked_dates con guion bajo
              // ❌ REMOVIDO: updated_at
            })
            .eq('id', id)
            .eq('owner_id', user?.id); // ✅ owner_id con guion bajo

          if (error) throw error;

          Alert.alert('¡Éxito!', 'El calendario ha sido actualizado correctamente');
        } catch (error: any) {
          console.error('Error saving calendar:', error);
          Alert.alert('Error', 'No se pudo guardar el calendario');
        } finally {
          setSaving(false);
        }
      },
    },
  ]);
};


  // Bloquear rango de fechas
  const handleBlockRange = () => {
    Alert.alert(
      'Bloquear rango de fechas',
      'Selecciona las fechas en el calendario para bloquearlas una por una, o usa esta opción para bloquear un rango completo.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Próximamente',
          onPress: () => {
            Alert.alert(
              'Función en desarrollo',
              'Esta función estará disponible próximamente para bloquear rangos de fechas de forma rápida.'
            );
          },
        },
      ]
    );
  };

  // Limpiar todas las fechas bloqueadas
  const handleClearAll = () => {
    Alert.alert(
      'Limpiar calendario',
      '¿Estás seguro que deseas desbloquear todas las fechas?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: () => {
            if (property) {
              setProperty({
                ...property,
                blockedDates: [],
              });
              setMarkedDates({});
            }
          },
        },
      ]
    );
  };

  // Verificación de permisos
  if (checkingOwnership) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C5F7C" />
        <ThemedText style={styles.loadingText}>Verificando permisos...</ThemedText>
      </ThemedView>
    );
  }

  if (!isOwner) {
    return null;
  }

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C5F7C" />
        <ThemedText style={styles.loadingText}>Cargando calendario...</ThemedText>
      </ThemedView>
    );
  }

  if (!property) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
          <ThemedText style={styles.errorText}>No se pudo cargar el calendario</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <ThemedText style={styles.headerTitle}>Calendario</ThemedText>
          <ThemedText style={styles.headerSubtitle} numberOfLines={1}>
            {property.title}
          </ThemedText>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Instrucciones */}
        <View style={styles.instructionsCard}>
          <Ionicons name="information-circle" size={24} color="#2C5F7C" />
          <View style={styles.instructionsTextContainer}>
            <ThemedText style={styles.instructionsTitle}>
              Gestiona tu disponibilidad
            </ThemedText>
            <ThemedText style={styles.instructionsText}>
              Toca las fechas en rojo para desbloquearlas. Toca fechas disponibles para
              bloquearlas.
            </ThemedText>
          </View>
        </View>

        {/* Estadísticas */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="calendar-outline" size={24} color="#10B981" />
            <ThemedText style={styles.statValue}>
              {property.blockedDates.length}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Días bloqueados</ThemedText>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#2C5F7C" />
            <ThemedText style={styles.statValue}>Disponible</ThemedText>
            <ThemedText style={styles.statLabel}>Estado general</ThemedText>
          </View>
        </View>

        {/* Calendario */}
        <View style={styles.calendarContainer}>
          <Calendar
            markedDates={markedDates}
            onDayPress={handleDayPress}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#2C5F7C',
              selectedDayBackgroundColor: '#DC2626',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#2C5F7C',
              dayTextColor: '#2d4150',
              textDisabledColor: '#d9e1e8',
              dotColor: '#DC2626',
              selectedDotColor: '#ffffff',
              arrowColor: '#2C5F7C',
              monthTextColor: '#2C5F7C',
              textDayFontWeight: '500',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
            }}
            minDate={new Date().toISOString().split('T')[0]}
            enableSwipeMonths={true}
          />
        </View>

        {/* Leyenda */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
            <ThemedText style={styles.legendText}>Fecha bloqueada</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <ThemedText style={styles.legendText}>Fecha disponible</ThemedText>
          </View>
        </View>

        {/* Acciones rápidas */}
        <View style={styles.quickActionsContainer}>
          <ThemedText style={styles.quickActionsTitle}>Acciones rápidas</ThemedText>

          <TouchableOpacity style={styles.quickActionButton} onPress={handleBlockRange}>
            <Ionicons name="calendar" size={20} color="#2C5F7C" />
            <ThemedText style={styles.quickActionText}>Bloquear rango de fechas</ThemedText>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionButton, styles.dangerButton]}
            onPress={handleClearAll}
          >
            <Ionicons name="trash-outline" size={20} color="#DC2626" />
            <ThemedText style={styles.dangerActionText}>
              Limpiar todas las fechas bloqueadas
            </ThemedText>
            <Ionicons name="chevron-forward" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>

        {/* Botón de guardar */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveChanges}
          disabled={saving}
        >
          {saving ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <ThemedText style={styles.saveButtonText}>Guardando...</ThemedText>
            </>
          ) : (
            <>
              <Ionicons name="save-outline" size={24} color="#fff" />
              <ThemedText style={styles.saveButtonText}>Guardar Cambios</ThemedText>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
  },
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#D4AF37',
    marginTop: 4,
  },
  instructionsCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2C5F7C',
  },
  instructionsTextContainer: {
    flex: 1,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C5F7C',
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 15,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C5F7C',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  dangerButton: {
    backgroundColor: '#FEE2E2',
  },
  dangerActionText: {
    flex: 1,
    fontSize: 15,
    color: '#DC2626',
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C5F7C',
    marginHorizontal: 20,
    marginTop: 30,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 40,
  },
});