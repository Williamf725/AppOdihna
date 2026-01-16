// app/edit-profile.tsx
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

export default function EditProfileScreen() {
  const { user, profile } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [avatarUri, setAvatarUri] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Estados para fecha de nacimiento
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear | null>(null);

  // ✅ Cargar datos del perfil al iniciar
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setBio(profile.bio || '');
      setCity(profile.city || '');
      setAvatarUri(profile.avatar_url || '');

      // Cargar fecha de nacimiento si existe
      if (profile.date_of_birth) {
        const date = new Date(profile.date_of_birth);
        setSelectedYear(date.getFullYear());
        setSelectedMonth(date.getMonth() + 1);
        setSelectedDay(date.getDate());
      }
    }
  }, [profile]);

  // Generar arrays para los selectores
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
  ];
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  // Formatear fecha de nacimiento
  const getFormattedBirthDate = (): string | null => {
    if (selectedYear && selectedMonth && selectedDay) {
      return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    }
    return null;
  };

  const getDisplayBirthDate = (): string => {
    if (selectedYear && selectedMonth && selectedDay) {
      const monthName = months.find(m => m.value === selectedMonth)?.label;
      return `${selectedDay} de ${monthName} de ${selectedYear}`;
    }
    return 'Seleccionar fecha';
  };

  // Seleccionar foto de perfil
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar tu foto');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  // Subir avatar a Supabase Storage
  const uploadAvatar = async (imageUri: string): Promise<string | null> => {
    try {
      setUploading(true);

      if (imageUri.includes('supabase.co')) {
        return imageUri;
      }

      const timestamp = Date.now();
      const fileName = `avatar_${user?.id}_${timestamp}.jpg`;
      const filePath = `avatars/${fileName}`;

      const response = await fetch(imageUri);
      const blob = await response.blob();

      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      if (profile?.avatar_url && profile.avatar_url.includes('supabase.co')) {
        const oldPath = profile.avatar_url.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', 'No se pudo subir la foto de perfil');
      return null;
    } finally {
      setUploading(false);
    }
  };

  // ✅ FUNCIÓN CORREGIDA: Guardar cambios
  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }

    if (phone && phone.length < 10) {
      Alert.alert('Error', 'El número de teléfono debe tener al menos 10 dígitos');
      return;
    }

    setSaving(true);

    try {
      let finalAvatarUrl = avatarUri;

      // Subir nueva foto si cambió
      if (avatarUri && avatarUri !== profile?.avatar_url && !avatarUri.includes('supabase.co')) {
        console.log('📤 Subiendo nueva foto de perfil...');
        const uploadedUrl = await uploadAvatar(avatarUri);
        if (uploadedUrl) {
          finalAvatarUrl = uploadedUrl;
          console.log('✅ Foto subida:', uploadedUrl);
        }
      }

      const updateData = {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        date_of_birth: getFormattedBirthDate(),
        city: city.trim() || null,
        avatar_url: finalAvatarUrl || null,
      };

      console.log('💾 Guardando perfil:', updateData);

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user?.id)
        .select(); // ✅ IMPORTANTE: Agregar .select() para verificar

      if (error) {
        console.error('❌ Error de Supabase:', error);
        throw error;
      }

      console.log('✅ Perfil actualizado en DB:', data);

      Alert.alert('¡Éxito!', 'Tu perfil ha sido actualizado correctamente', [
        { 
          text: 'OK', 
          onPress: () => {
            // ✅ Recargar la app para reflejar cambios
            router.back();
          }
        },
      ]);
    } catch (error: any) {
      console.error('❌ Error completo:', error);
      Alert.alert('Error', `No se pudo actualizar el perfil: ${error.message || 'Intenta de nuevo'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={28} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar perfil</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || uploading}
          style={styles.saveButton}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#2C5F7C" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Foto de perfil */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickImage} disabled={uploading}>
              <View style={styles.avatarContainer}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <Ionicons name="person-circle" size={120} color="#CBD5E1" />
                )}
                <View style={styles.cameraIcon}>
                  {uploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={20} color="#fff" />
                  )}
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Toca para cambiar tu foto</Text>
          </View>

          {/* Información básica */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información básica</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre completo *</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Tu nombre completo"
                editable={!saving}
              />
            </View>

            {/* Selector de fecha de nacimiento */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Fecha de nacimiento</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
                disabled={saving}
              >
                <Ionicons name="calendar-outline" size={20} color="#64748B" />
                <Text style={[styles.datePickerText, (selectedYear && selectedMonth && selectedDay) && styles.datePickerTextFilled]}>
                  {getDisplayBirthDate()}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#64748B" />
              </TouchableOpacity>
              <Text style={styles.hint}>Debes ser mayor de 18 años</Text>
            </View>

            {/* Campo de teléfono editable */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Teléfono</Text>
              <View style={styles.phoneInputContainer}>
                <Text style={styles.phonePrefix}>+57</Text>
                <TextInput
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
                  placeholder="300 123 4567"
                  keyboardType="phone-pad"
                  maxLength={10}
                  editable={!saving}
                />
              </View>
              <Text style={styles.hint}>Tu número de celular en Colombia</Text>
            </View>
          </View>

          {/* Sobre ti */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sobre ti</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Biografía</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Cuéntanos sobre ti, tus intereses, tu estilo de viaje..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!saving}
                maxLength={500}
              />
              <Text style={styles.hint}>{bio.length}/500 caracteres</Text>
            </View>
          </View>

          {/* Ubicación */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ubicación</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ciudad</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="Bogotá, Medellín, Cali..."
                editable={!saving}
              />
            </View>
          </View>

          {/* Información de cuenta (solo lectura) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información de cuenta</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo electrónico</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText}>{user?.email}</Text>
                <Ionicons name="lock-closed" size={16} color="#94A3B8" />
              </View>
              <Text style={styles.hint}>El correo no se puede cambiar</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tipo de cuenta</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText}>
                  {profile?.role === 'host' ? 'Anfitrión' : 'Huésped'}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal: Selector de fecha */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.modalCancel}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Fecha de nacimiento</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.modalDone}>Listo</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerContainer}>
              {/* Selector de Día */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Día</Text>
                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                  {days.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[styles.pickerItem, selectedDay === day && styles.pickerItemSelected]}
                      onPress={() => setSelectedDay(day)}
                    >
                      <Text style={[styles.pickerItemText, selectedDay === day && styles.pickerItemTextSelected]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Selector de Mes */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Mes</Text>
                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                  {months.map((month) => (
                    <TouchableOpacity
                      key={month.value}
                      style={[styles.pickerItem, selectedMonth === month.value && styles.pickerItemSelected]}
                      onPress={() => setSelectedMonth(month.value)}
                    >
                      <Text style={[styles.pickerItemText, selectedMonth === month.value && styles.pickerItemTextSelected]}>
                        {month.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Selector de Año */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Año</Text>
                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[styles.pickerItem, selectedYear === year && styles.pickerItemSelected]}
                      onPress={() => setSelectedYear(year)}
                    >
                      <Text style={[styles.pickerItemText, selectedYear === year && styles.pickerItemTextSelected]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
  saveButton: { padding: 4 },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#2C5F7C' },
  content: { flex: 1 },
  avatarSection: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#fff' },
  avatarContainer: { position: 'relative' },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2C5F7C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarHint: { marginTop: 12, fontSize: 14, color: '#64748B' },
  section: { backgroundColor: '#fff', marginTop: 16, paddingHorizontal: 20, paddingVertical: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1E293B',
  },
  textArea: { height: 100, paddingTop: 14 },
  hint: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  datePickerText: { flex: 1, fontSize: 16, color: '#94A3B8' },
  datePickerTextFilled: { color: '#1E293B' },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  phonePrefix: { fontSize: 16, color: '#475569', fontWeight: '600', marginRight: 8 },
  phoneInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#1E293B' },
  readOnlyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  readOnlyText: { fontSize: 16, color: '#64748B' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalCancel: { fontSize: 16, color: '#94A3B8' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
  modalDone: { fontSize: 16, fontWeight: '600', color: '#2C5F7C' },
  datePickerContainer: { flexDirection: 'row', padding: 20, gap: 12 },
  pickerColumn: { flex: 1 },
  pickerLabel: { fontSize: 14, fontWeight: '600', color: '#64748B', marginBottom: 12, textAlign: 'center' },
  pickerScroll: { maxHeight: 250 },
  pickerItem: { paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8, marginBottom: 4 },
  pickerItemSelected: { backgroundColor: '#EFF6FF' },
  pickerItemText: { fontSize: 16, color: '#475569', textAlign: 'center' },
  pickerItemTextSelected: { color: '#2C5F7C', fontWeight: '600' },
});
