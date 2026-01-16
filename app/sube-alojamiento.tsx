// app/sube-alojamiento.tsx

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { availableAmenities, colombianDepartments } from '@/constants/mockData';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';

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
  View
} from 'react-native';

export default function SubeAlojamientoScreen() {

  return (
    <ProtectedRoute requireRole="host">
      <SubeAlojamientoContent />
    </ProtectedRoute>
  );
}

function SubeAlojamientoContent() {
  const { user } = useAuth(); // Agregar esto

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
  const [uploading, setUploading] = useState(false);

  // Categorías disponibles para tags
  const tagOptions = [
    "cabaña", "lago", "montaña", "romantico", "familiar", "playa",
    "ciudad", "naturaleza", "bosque", "lujo"
  ];

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
      const newImages = result.assets.map(asset => asset.uri);
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
      setSelectedAmenities(selectedAmenities.filter(a => a !== amenityName));
    } else {
      setSelectedAmenities([...selectedAmenities, amenityName]);
    }
  };

  // Función para toggle tags
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
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

  // Función SIMPLIFICADA para subir imágenes a Supabase Storage
  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (let i = 0; i < images.length; i++) {
      try {
        const imageUri = images[i];
        const timestamp = Date.now();
        const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.jpg`;
        const filePath = `properties/${fileName}`;

        console.log(`📤 Subiendo imagen ${i + 1}/${images.length}`);

        // Convertir la imagen a blob usando fetch
        const response = await fetch(imageUri);
        const blob = await response.blob();

        // Crear ArrayBuffer desde el blob
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(blob);
        });

        // Subir a Supabase Storage
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

        // Obtener URL pública
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

  // Función para guardar alojamiento en Supabase
  // Función para guardar alojamiento en Supabase
  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Verificar que haya un usuario autenticado
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para publicar un alojamiento');
      return;
    }

    setUploading(true);

    try {
      // 1. Subir imágenes
      console.log('Subiendo imágenes...');
      const uploadedImageUrls = await uploadImages();
      console.log('Imágenes subidas:', uploadedImageUrls);

      // 2. Guardar propiedad en la base de datos
      console.log('Guardando propiedad...');
      const { data, error } = await supabase
        .from('properties')
        .insert([
          {
            title: title.trim(),
            description: description.trim(),
            location: `${city}, ${department}`,
            city: city.trim(),
            department: department,
            price: Number(price),
            rating: 5.0,
            review_count: 0,
            images: uploadedImageUrls,
            amenities: selectedAmenities,
            tags: selectedTags,
            max_guests: maxGuests,
            bedrooms: bedrooms,
            // host_name ya no es necesario, se obtiene del perfil
            owner_id: user.id,
            blocked_dates: [],
          }
        ])
        .select();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Propiedad guardada:', data);
      setUploading(false);

      Alert.alert(
        '¡Éxito!',
        'Tu alojamiento ha sido publicado correctamente',
        [
          {
            text: 'Ver alojamiento',
            onPress: () => router.replace(`/${data[0].id}`)
          },
          {
            text: 'Ir al inicio',
            onPress: () => router.replace('/(tabs)')
          }
        ]
      );

      // Limpiar formulario
      setTitle('');
      setDescription('');
      setPrice('');
      setCity('');
      setDepartment('');
      setSelectedAmenities([]);
      setImages([]);
      setBedrooms(1);
      setMaxGuests(2);
      setSelectedTags([]);

    } catch (error: any) {
      setUploading(false);
      console.error('Error submitting property:', error);
      Alert.alert(
        'Error',
        `Hubo un problema al publicar tu alojamiento: ${error.message || 'Por favor intenta de nuevo.'}`
      );
    }
  };


  return (
    <ThemedView style={styles.container}>
      {/* Header Mejorado */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <ThemedText style={styles.headerTitle}>Publicar Alojamiento</ThemedText>
            <ThemedText style={styles.headerSubtitle}>Comparte tu espacio</ThemedText>
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
            placeholder="Describe tu alojamiento, qué lo hace especial, qué pueden disfrutar los huéspedes..."
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
            <ThemedText style={department ? styles.selectButtonTextFilled : styles.selectButtonText}>
              {department || 'Seleccionar departamento'}
            </ThemedText>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Fotos */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Fotos del alojamiento</ThemedText>
          <ThemedText style={styles.sectionSubtitle}>
            Sube hasta 10 fotos (mínimo 1)
          </ThemedText>

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
                style={[
                  styles.tagChip,
                  selectedTags.includes(tag) && styles.tagChipSelected
                ]}
                onPress={() => toggleTag(tag)}
                disabled={uploading}
              >
                <ThemedText style={[
                  styles.tagChipText,
                  selectedTags.includes(tag) && styles.tagChipTextSelected
                ]}>
                  {tag}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Comodidades */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Comodidades</ThemedText>
          <ThemedText style={styles.sectionSubtitle}>
            Selecciona todas las que apliquen
          </ThemedText>
          <View style={styles.amenitiesGrid}>
            {availableAmenities.map((amenity) => (
              <TouchableOpacity
                key={amenity.id}
                style={[
                  styles.amenityCard,
                  selectedAmenities.includes(amenity.name) && styles.amenityCardSelected
                ]}
                onPress={() => toggleAmenity(amenity.name)}
                disabled={uploading}
              >
                <Ionicons
                  name={amenity.icon as any}
                  size={24}
                  color={selectedAmenities.includes(amenity.name) ? '#fff' : '#2C5F7C'}
                />
                <ThemedText style={[
                  styles.amenityName,
                  selectedAmenities.includes(amenity.name) && styles.amenityNameSelected
                ]}>
                  {amenity.name}
                </ThemedText>
                {selectedAmenities.includes(amenity.name) && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#fff"
                    style={styles.checkmark}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Botón de publicar */}
        <TouchableOpacity
          style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <ThemedText style={styles.submitButtonText}>Publicando...</ThemedText>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
              <ThemedText style={styles.submitButtonText}>Publicar Alojamiento</ThemedText>
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
                  {department === item && (
                    <Ionicons name="checkmark" size={24} color="#2C5F7C" />
                  )}
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
            <ThemedText style={styles.uploadingText}>Subiendo alojamiento...</ThemedText>
            <ThemedText style={styles.uploadingSubtext}>Por favor espera</ThemedText>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginLeft: -40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#D4AF37',
    textAlign: 'center',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 120,
    paddingTop: 15,
  },
  marginBottom: {
    marginBottom: 15,
  },
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
  selectButtonText: {
    fontSize: 16,
    color: '#999',
  },
  selectButtonTextFilled: {
    fontSize: 16,
    color: '#000',
  },
  imagesScroll: {
    marginTop: 10,
  },
  addImageButton: {
    width: 120,
    height: 120,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2C5F7C',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  addImageText: {
    marginTop: 8,
    fontSize: 12,
    color: '#2C5F7C',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 10,
  },
  uploadedImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4444',
    borderRadius: 12,
  },
  capacityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  capacityItem: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 15,
  },
  capacityLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2C5F7C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tagChipSelected: {
    backgroundColor: '#2C5F7C',
    borderColor: '#2C5F7C',
  },
  tagChipText: {
    fontSize: 14,
    color: '#333',
    textTransform: 'capitalize',
  },
  tagChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  amenityCard: {
    width: '48%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  amenityCardSelected: {
    backgroundColor: '#2C5F7C',
    borderColor: '#2C5F7C',
  },
  amenityName: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
  },
  amenityNameSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  checkmark: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C5F7C',
    marginHorizontal: 20,
    marginTop: 30,
    padding: 18,
    borderRadius: 12,
    gap: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 40,
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  departmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  departmentText: {
    fontSize: 16,
  },
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
  uploadingContent: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 200,
  },
  uploadingText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: 'bold',
  },
  uploadingSubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#666',
  },
});