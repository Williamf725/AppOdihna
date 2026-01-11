// app/editar-alojamiento/[id].tsx

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { availableAmenities, colombianDepartments } from '@/constants/mockData';
import { useAuth } from '@/hooks/useAuth';
import { isPropertyOwner, supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function EditarAlojamientoScreen() {
  return (
    <ProtectedRoute requireRole="host">
      <EditarAlojamientoContent />
    </ProtectedRoute>
  );
}

function EditarAlojamientoContent() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  // Estados del formulario
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState('');
  const [department, setDepartment] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [bedrooms, setBedrooms] = useState(1);
  const [maxGuests, setMaxGuests] = useState(2);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [checkingOwnership, setCheckingOwnership] = useState(true);

  // Categorías disponibles para tags
  const tagOptions = [
    'cabaña',
    'lago',
    'montaña',
    'romantico',
    'familiar',
    'playa',
    'ciudad',
    'naturaleza',
    'bosque',
    'lujo',
  ];

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
        Alert.alert('Acceso denegado', 'No tienes permiso para editar este alojamiento', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    };

    checkOwnership();
  }, [id, user]);

  // Cargar propiedad desde Supabase
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
          Alert.alert('Error', 'No tienes permiso para editar este alojamiento', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }

        // ✅ Cargar datos con nombres correctos de columnas
        setTitle(data.title);
        setDescription(data.description);
        setPrice(data.price.toString());
        setCity(data.city);
        setDepartment(data.department);
        setSelectedAmenities(data.amenities || []);
        setImages(data.images || []);
        setBedrooms(data.bedrooms || 1);
        setMaxGuests(data.max_guests || 2); // ✅ max_guests con guion bajo
        setSelectedTags(data.tags || []);
      } catch (error) {
        console.error('Error loading property:', error);
        Alert.alert('Error', 'No se pudo cargar el alojamiento');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadProperty();
  }, [id, user]);

  // Función para seleccionar imágenes
  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para subir fotos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset) => asset.uri);
      setImages([...images, ...newImages].slice(0, 10));
    }
  };

  // Función para remover imagen
  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // Función para toggle amenities
  const toggleAmenity = (amenityName: string) => {
    if (selectedAmenities.includes(amenityName)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== amenityName));
    } else {
      setSelectedAmenities([...selectedAmenities, amenityName]);
    }
  };

  // Función para toggle tags
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Validar formulario
  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Por favor ingresa el nombre del alojamiento');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Por favor ingresa una descripción');
      return false;
    }
    if (!price.trim() || isNaN(Number(price))) {
      Alert.alert('Error', 'Por favor ingresa un precio válido');
      return false;
    }
    if (!city.trim()) {
      Alert.alert('Error', 'Por favor ingresa la ciudad');
      return false;
    }
    if (!department) {
      Alert.alert('Error', 'Por favor selecciona el departamento');
      return false;
    }
    if (images.length === 0) {
      Alert.alert('Error', 'Por favor sube al menos una foto');
      return false;
    }
    if (selectedAmenities.length === 0) {
      Alert.alert('Error', 'Por favor selecciona al menos una comodidad');
      return false;
    }
    if (selectedTags.length === 0) {
      Alert.alert('Error', 'Por favor selecciona al menos una categoría');
      return false;
    }
    return true;
  };

  // Función para subir nuevas imágenes a Supabase Storage
  const uploadNewImages = async (newImageUris: string[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (let i = 0; i < newImageUris.length; i++) {
      try {
        const imageUri = newImageUris[i];

        // Si la imagen ya es una URL de Supabase, no la subimos de nuevo
        if (imageUri.includes('supabase.co')) {
          uploadedUrls.push(imageUri);
          continue;
        }

        const timestamp = Date.now();
        const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.jpg`;
        const filePath = `properties/${fileName}`;

        console.log(`📤 Subiendo imagen ${i + 1}/${newImageUris.length}`);

        const response = await fetch(imageUri);
        const blob = await response.blob();

        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(blob);
        });

        const { data, error } = await supabase.storage
          .from('property-images')
          .upload(filePath, arrayBuffer, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (error) {
          console.error('Supabase upload error:', error);
          throw error;
        }

        const { data: publicUrlData } = supabase.storage
          .from('property-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrlData.publicUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
      }
    }

    return uploadedUrls;
  };

  // ✅ FUNCIÓN CORREGIDA: Actualizar alojamiento sin updated_at
  const handleUpdate = async () => {
    if (!validateForm()) return;

    setUploading(true);

    try {
      console.log('Procesando imágenes...');
      const finalImageUrls = await uploadNewImages(images);
      console.log('Imágenes procesadas:', finalImageUrls);

      console.log('Actualizando propiedad...');
      const { data, error } = await supabase
        .from('properties')
        .update({
          title: title.trim(),
          description: description.trim(),
          location: `${city}, ${department}`,
          city: city.trim(),
          department: department,
          price: Number(price),
          images: finalImageUrls,
          amenities: selectedAmenities,
          tags: selectedTags,
          max_guests: maxGuests, // ✅ max_guests con guion bajo
          bedrooms: bedrooms,
          // ❌ REMOVIDO: updated_at (no existe en tu tabla)
        })
        .eq('id', id)
        .eq('owner_id', user?.id) // ✅ owner_id con guion bajo
        .select();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Propiedad actualizada:', data);
      setUploading(false);

      Alert.alert('¡Éxito!', 'Tu alojamiento ha sido actualizado correctamente', [
        {
          text: 'Ver alojamiento',
          onPress: () => router.replace(`/${id}`),
        },
        {
          text: 'Volver a mis alojamientos',
          onPress: () => router.replace('/mis-alojamientos'),
        },
      ]);
    } catch (error: any) {
      setUploading(false);
      console.error('Error updating property:', error);
      Alert.alert(
        'Error',
        `Hubo un problema al actualizar tu alojamiento: ${
          error.message || 'Por favor intenta de nuevo.'
        }`
      );
    }
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
        <ThemedText style={styles.loadingText}>Cargando alojamiento...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <ThemedText style={styles.headerTitle}>Editar Alojamiento</ThemedText>
            <ThemedText style={styles.headerSubtitle}>Actualiza la información</ThemedText>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Nombre del alojamiento */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Nombre del alojamiento</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Ej: Cabaña romántica en las montañas"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#999"
            editable={!uploading}
          />
        </View>

        {/* Descripción */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Descripción</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe tu alojamiento..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            placeholderTextColor="#999"
            editable={!uploading}
          />
        </View>

        {/* Precio */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Precio por noche (COP)</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="280000"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholderTextColor="#999"
            editable={!uploading}
          />
        </View>

        {/* Ubicación */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Ubicación</ThemedText>

          <TextInput
            style={[styles.input, styles.marginBottom]}
            placeholder="Ciudad"
            value={city}
            onChangeText={setCity}
            placeholderTextColor="#999"
            editable={!uploading}
          />

          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowDepartmentModal(true)}
            disabled={uploading}
          >
            <ThemedText
              style={department ? styles.selectButtonTextFilled : styles.selectButtonText}
            >
              {department || 'Seleccionar departamento'}
            </ThemedText>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Fotos */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Fotos del alojamiento</ThemedText>
          <ThemedText style={styles.sectionSubtitle}>Sube hasta 10 fotos (mínimo 1)</ThemedText>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
            <TouchableOpacity
              style={styles.addImageButton}
              onPress={pickImages}
              disabled={uploading}
            >
              <Ionicons name="camera-outline" size={32} color="#2C5F7C" />
              <ThemedText style={styles.addImageText}>Agregar fotos</ThemedText>
            </TouchableOpacity>

            {images.map((uri, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri }} style={styles.uploadedImage} />
                {!uploading && (
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Habitaciones y Huéspedes */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Capacidad</ThemedText>

          <View style={styles.capacityRow}>
            <View style={styles.capacityItem}>
              <ThemedText style={styles.capacityLabel}>Habitaciones</ThemedText>
              <View style={styles.counterContainer}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setBedrooms(Math.max(1, bedrooms - 1))}
                  disabled={uploading}
                >
                  <Ionicons name="remove" size={20} color="#2C5F7C" />
                </TouchableOpacity>
                <ThemedText style={styles.counterValue}>{bedrooms}</ThemedText>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setBedrooms(bedrooms + 1)}
                  disabled={uploading}
                >
                  <Ionicons name="add" size={20} color="#2C5F7C" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.capacityItem}>
              <ThemedText style={styles.capacityLabel}>Huéspedes máx.</ThemedText>
              <View style={styles.counterContainer}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setMaxGuests(Math.max(1, maxGuests - 1))}
                  disabled={uploading}
                >
                  <Ionicons name="remove" size={20} color="#2C5F7C" />
                </TouchableOpacity>
                <ThemedText style={styles.counterValue}>{maxGuests}</ThemedText>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setMaxGuests(maxGuests + 1)}
                  disabled={uploading}
                >
                  <Ionicons name="add" size={20} color="#2C5F7C" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Categorías/Tags */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Categorías</ThemedText>
          <ThemedText style={styles.sectionSubtitle}>
            Selecciona las categorías que describen tu alojamiento
          </ThemedText>
          <View style={styles.tagsContainer}>
            {tagOptions.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, selectedTags.includes(tag) && styles.tagChipSelected]}
                onPress={() => toggleTag(tag)}
                disabled={uploading}
              >
                <ThemedText
                  style={[
                    styles.tagChipText,
                    selectedTags.includes(tag) && styles.tagChipTextSelected,
                  ]}
                >
                  {tag}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Comodidades */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Comodidades</ThemedText>
          <ThemedText style={styles.sectionSubtitle}>Selecciona todas las que apliquen</ThemedText>
          <View style={styles.amenitiesGrid}>
            {availableAmenities.map((amenity) => (
              <TouchableOpacity
                key={amenity.id}
                style={[
                  styles.amenityCard,
                  selectedAmenities.includes(amenity.name) && styles.amenityCardSelected,
                ]}
                onPress={() => toggleAmenity(amenity.name)}
                disabled={uploading}
              >
                <Ionicons
                  name={amenity.icon as any}
                  size={24}
                  color={selectedAmenities.includes(amenity.name) ? '#fff' : '#2C5F7C'}
                />
                <ThemedText
                  style={[
                    styles.amenityName,
                    selectedAmenities.includes(amenity.name) && styles.amenityNameSelected,
                  ]}
                >
                  {amenity.name}
                </ThemedText>
                {selectedAmenities.includes(amenity.name) && (
                  <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.checkmark} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Botón de actualizar */}
        <TouchableOpacity
          style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
          onPress={handleUpdate}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <ThemedText style={styles.submitButtonText}>Actualizando...</ThemedText>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
              <ThemedText style={styles.submitButtonText}>Guardar Cambios</ThemedText>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Modal de departamentos */}
      <Modal
        visible={showDepartmentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDepartmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Seleccionar Departamento</ThemedText>
              <TouchableOpacity onPress={() => setShowDepartmentModal(false)}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={colombianDepartments}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.departmentItem}
                  onPress={() => {
                    setDepartment(item);
                    setShowDepartmentModal(false);
                  }}
                >
                  <ThemedText style={styles.departmentText}>{item}</ThemedText>
                  {department === item && <Ionicons name="checkmark" size={24} color="#2C5F7C" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Overlay de carga */}
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <View style={styles.uploadingContent}>
            <ActivityIndicator size="large" color="#2C5F7C" />
            <ThemedText style={styles.uploadingText}>Actualizando alojamiento...</ThemedText>
            <ThemedText style={styles.uploadingSubtext}>Por favor espera</ThemedText>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  headerContainer: {
    backgroundColor: '#02111aff',
    paddingTop: 50,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  headerTitleContainer: { flex: 1, alignItems: 'center', marginLeft: -40 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  headerSubtitle: { fontSize: 14, color: '#D4AF37', textAlign: 'center', marginTop: 4 },
  scrollView: { flex: 1 },
  section: { paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  sectionSubtitle: { fontSize: 14, color: '#666', marginBottom: 15 },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: { height: 120, paddingTop: 15 },
  marginBottom: { marginBottom: 15 },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectButtonText: { fontSize: 16, color: '#999' },
  selectButtonTextFilled: { fontSize: 16, color: '#000' },
  imagesScroll: { marginTop: 10 },
  addImageButton: {
    width: 120,
    height: 120,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    marginRight: 10,
  },
  addImageText: { marginTop: 8, fontSize: 12, color: '#2C5F7C', fontWeight: '600' },
  imageContainer: { position: 'relative', marginRight: 10 },
  uploadedImage: { width: 120, height: 120, borderRadius: 12 },
  removeImageButton: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: 12 },
  capacityRow: { flexDirection: 'row', gap: 15 },
  capacityItem: { flex: 1 },
  capacityLabel: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 10,
  },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2C5F7C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: { fontSize: 18, fontWeight: 'bold' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tagChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tagChipSelected: { backgroundColor: '#2C5F7C', borderColor: '#2C5F7C' },
  tagChipText: { fontSize: 14, color: '#333', textTransform: 'capitalize' },
  tagChipTextSelected: { color: '#fff', fontWeight: '600' },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amenityCard: {
    width: '48%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  amenityCardSelected: { backgroundColor: '#2C5F7C', borderColor: '#2C5F7C' },
  amenityName: { marginTop: 8, fontSize: 12, textAlign: 'center', color: '#333' },
  amenityNameSelected: { color: '#fff', fontWeight: '600' },
  checkmark: { position: 'absolute', top: 5, right: 5 },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C5F7C',
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 20,
    gap: 10,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  bottomSpacing: { height: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  departmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  departmentText: { fontSize: 16 },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingContent: { backgroundColor: '#fff', borderRadius: 20, padding: 40, alignItems: 'center' },
  uploadingText: { marginTop: 20, fontSize: 18, fontWeight: 'bold' },
  uploadingSubtext: { marginTop: 8, fontSize: 14, color: '#666' },
});
