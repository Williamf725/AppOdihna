// app/edit-profile.tsx
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
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
  
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [city, setCity] = useState(profile?.city || '');
  const [work, setWork] = useState(profile?.work || '');
  const [school, setSchool] = useState(profile?.school || '');
  const [avatarUri, setAvatarUri] = useState(profile?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Estados para fecha de nacimiento
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [birthMonth, setBirthMonth] = useState<number | null>(null);
  const [birthDay, setBirthDay] = useState<number | null>(null);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);

  // Generar años (desde 1920 hasta el año actual)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1919 }, (_, i) => currentYear - i);
  
  // Meses
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

  // Obtener días según el mes y año
  const getDaysInMonth = (month: number | null, year: number | null): number[] => {
    if (!month || !year) return Array.from({ length: 31 }, (_, i) => i + 1);
    
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  const days = getDaysInMonth(birthMonth, birthYear);

  // Parsear fecha de nacimiento existente
  useEffect(() => {
    if (profile?.date_of_birth) {
      const dateParts = profile.date_of_birth.split('-');
      if (dateParts.length === 3) {
        setBirthYear(parseInt(dateParts[0], 10));
        setBirthMonth(parseInt(dateParts[1], 10));
        setBirthDay(parseInt(dateParts[2], 10));
      }
    }
  }, [profile?.date_of_birth]);

  // Actualizar dateOfBirth cuando cambian año, mes o día
  useEffect(() => {
    if (birthYear && birthMonth && birthDay) {
      const formattedDate = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;
      setDateOfBirth(formattedDate);
    } else {
      setDateOfBirth('');
    }
  }, [birthYear, birthMonth, birthDay]);

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

      // Si ya es una URL de Supabase, no subir de nuevo
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

      // Eliminar avatar anterior si existe
      if (profile?.avatar_url && profile.avatar_url.includes('supabase.co')) {
        const oldPath = profile.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`avatars/${oldPath}`]);
        }
      }

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', 'No se pudo subir la foto de perfil');
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Guardar cambios
  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }

    setSaving(true);

    try {
      let finalAvatarUrl = avatarUri;

      // Subir nueva foto si cambió
      if (avatarUri && avatarUri !== profile?.avatar_url) {
        const uploadedUrl = await uploadAvatar(avatarUri);
        if (uploadedUrl) {
          finalAvatarUrl = uploadedUrl;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          bio: bio.trim(),
          date_of_birth: dateOfBirth || null,
          address: address.trim(),
          city: city.trim(),
          work: work.trim(),
          school: school.trim(),
          avatar_url: finalAvatarUrl,
        })
        .eq('id', user?.id);

      if (error) throw error;

      Alert.alert('¡Éxito!', 'Tu perfil ha sido actualizado', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'No se pudo actualizar el perfil');
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Fecha de nacimiento</Text>
              <View style={styles.datePickerContainer}>
                <TouchableOpacity
                  style={[styles.datePickerButton, !birthYear && styles.datePickerButtonEmpty]}
                  onPress={() => setShowYearPicker(true)}
                  disabled={saving}
                >
                  <Text style={[styles.datePickerText, !birthYear && styles.datePickerTextPlaceholder]}>
                    {birthYear ? birthYear.toString() : 'Año'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#64748B" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.datePickerButton, !birthMonth && styles.datePickerButtonEmpty]}
                  onPress={() => setShowMonthPicker(true)}
                  disabled={saving}
                >
                  <Text style={[styles.datePickerText, !birthMonth && styles.datePickerTextPlaceholder]}>
                    {birthMonth ? months[birthMonth - 1].label : 'Mes'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#64748B" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.datePickerButton, !birthDay && styles.datePickerButtonEmpty]}
                  onPress={() => setShowDayPicker(true)}
                  disabled={saving || !birthMonth || !birthYear}
                >
                  <Text style={[styles.datePickerText, !birthDay && styles.datePickerTextPlaceholder]}>
                    {birthDay ? birthDay.toString() : 'Día'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Teléfono</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+57 300 123 4567"
                keyboardType="phone-pad"
                editable={!saving}
              />
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Trabajo</Text>
              <TextInput
                style={styles.input}
                value={work}
                onChangeText={setWork}
                placeholder="Cargo y empresa"
                editable={!saving}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Educación</Text>
              <TextInput
                style={styles.input}
                value={school}
                onChangeText={setSchool}
                placeholder="Universidad o institución"
                editable={!saving}
              />
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
                placeholder="Bogotá"
                editable={!saving}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Dirección</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Calle 123 # 45-67"
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

      {/* Modal para seleccionar año */}
      <Modal
        visible={showYearPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowYearPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar año</Text>
              <TouchableOpacity onPress={() => setShowYearPicker(false)}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerScrollView}>
              {years.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.pickerItem,
                    birthYear === year && styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setBirthYear(year);
                    setShowYearPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      birthYear === year && styles.pickerItemTextSelected,
                    ]}
                  >
                    {year}
                  </Text>
                  {birthYear === year && (
                    <Ionicons name="checkmark" size={20} color="#2C5F7C" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal para seleccionar mes */}
      <Modal
        visible={showMonthPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar mes</Text>
              <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerScrollView}>
              {months.map((month) => (
                <TouchableOpacity
                  key={month.value}
                  style={[
                    styles.pickerItem,
                    birthMonth === month.value && styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setBirthMonth(month.value);
                    // Si el día seleccionado no es válido para el nuevo mes, resetearlo
                    const daysInNewMonth = new Date(birthYear || currentYear, month.value, 0).getDate();
                    if (birthDay && birthDay > daysInNewMonth) {
                      setBirthDay(null);
                    }
                    setShowMonthPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      birthMonth === month.value && styles.pickerItemTextSelected,
                    ]}
                  >
                    {month.label}
                  </Text>
                  {birthMonth === month.value && (
                    <Ionicons name="checkmark" size={20} color="#2C5F7C" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal para seleccionar día */}
      <Modal
        visible={showDayPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDayPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar día</Text>
              <TouchableOpacity onPress={() => setShowDayPicker(false)}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerScrollView}>
              {days.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.pickerItem,
                    birthDay === day && styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setBirthDay(day);
                    setShowDayPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      birthDay === day && styles.pickerItemTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                  {birthDay === day && (
                    <Ionicons name="checkmark" size={20} color="#2C5F7C" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
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
  datePickerContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  datePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  datePickerButtonEmpty: {
    borderColor: '#CBD5E1',
  },
  datePickerText: {
    fontSize: 16,
    color: '#1E293B',
  },
  datePickerTextPlaceholder: {
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  pickerScrollView: {
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerItemSelected: {
    backgroundColor: '#F0F9FF',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#1E293B',
  },
  pickerItemTextSelected: {
    color: '#2C5F7C',
    fontWeight: '600',
  },
});
