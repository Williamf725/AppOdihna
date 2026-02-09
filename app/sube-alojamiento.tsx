// app/sube-alojamiento.tsx

import { ModeSwitcher } from '@/components/ModeSwitcher';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { availableAmenities, colombianDepartments } from '@/constants/mockData';
import {
  Estrato,
  estratoOptions,
  propertyTypeOptions,
  Zona,
  zonaOptions
} from '@/constants/realEstateData';
import { useAuth } from '@/hooks/useAuth';
import { isCloudinaryConfigured, uploadMultipleImages } from '@/lib/cloudinaryService';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/formatters';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';
import { ModeColors } from '../contexts/AppModeContext';

// ================================
// NOCTURNE LUXURY PALETTE
// ================================
const Colors = {
  light: {
    background: '#F5F5F0',
    cardBackground: '#FFFFFF',
    text: '#121212',
    textSecondary: '#666666',
    accent: '#D4AF37',
    accentDark: '#AA8C2C',
    border: '#E0E0E0',
    divider: '#EBEBEB',
    inputBackground: '#F8F8F8',
  },
  dark: {
    background: '#050505',
    cardBackground: '#121212',
    text: '#F0F0F0',
    textSecondary: '#999999',
    accent: '#D4AF37',
    accentDark: '#F2D06B',
    border: '#333333',
    divider: '#222222',
    inputBackground: '#1A1A1A',
  },
};

// Real estate features options
const realEstateFeatures = [
  'Vista panorámica', 'Piscina', 'Gimnasio', 'Portería 24h', 'Ascensor',
  'Parqueadero cubierto', 'Depósito', 'Terraza', 'Balcón', 'Chimenea',
  'Jardín', 'BBQ', 'Cuarto de servicio', 'Estudio', 'Zona verde',
  'Vigilancia', 'Cocina integral', 'Closets', 'Jacuzzi', 'Sauna'
];

type PublishMode = 'estadia' | 'comprar';

export default function SubeAlojamientoScreen() {
  return (
    <ProtectedRoute requireRole="host">
      <SubeAlojamientoContent />
    </ProtectedRoute>
  );
}

function SubeAlojamientoContent() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const { user } = useAuth();

  // Mode switch
  const [publishMode, setPublishMode] = useState<PublishMode>('estadia');

  // Shared states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [department, setDepartment] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);

  // Estadía states
  const [price, setPrice] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [bedrooms, setBedrooms] = useState(1);
  const [maxGuests, setMaxGuests] = useState(2);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Comprar/Real Estate states
  const [salePrice, setSalePrice] = useState('');
  const [propertyType, setPropertyType] = useState<string>('apartamento');
  const [zona, setZona] = useState<Zona | null>(null);
  const [estrato, setEstrato] = useState<Estrato | null>(null);
  const [metraje, setMetraje] = useState('');
  const [metrajeConstruido, setMetrajeConstruido] = useState('');
  const [saleBedrooms, setSaleBedrooms] = useState(0);
  const [bathrooms, setBathrooms] = useState(0);
  const [garages, setGarages] = useState(0);
  const [yearBuilt, setYearBuilt] = useState('');
  const [barrio, setBarrio] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [showZonaModal, setShowZonaModal] = useState(false);
  const [showEstratoModal, setShowEstratoModal] = useState(false);
  const [showPropertyTypeModal, setShowPropertyTypeModal] = useState(false);

  const tagOptions = ["cabaña", "lago", "montaña", "romantico", "familiar", "playa", "ciudad", "naturaleza", "bosque", "lujo"];

  // Get accent color based on mode
  const accentColor = publishMode === 'estadia' ? ModeColors.estadia.accent : ModeColors.comprar.accent;

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

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const toggleAmenity = (amenityName: string) => {
    if (selectedAmenities.includes(amenityName)) {
      setSelectedAmenities(selectedAmenities.filter(a => a !== amenityName));
    } else {
      setSelectedAmenities([...selectedAmenities, amenityName]);
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const toggleFeature = (feature: string) => {
    if (selectedFeatures.includes(feature)) {
      setSelectedFeatures(selectedFeatures.filter(f => f !== feature));
    } else {
      setSelectedFeatures([...selectedFeatures, feature]);
    }
  };

  // Validate Estadía form
  const validateEstadiaForm = () => {
    if (!title.trim()) { Alert.alert('Error', 'Por favor ingresa el nombre del alojamiento'); return false; }
    if (!description.trim()) { Alert.alert('Error', 'Por favor ingresa una descripción'); return false; }
    if (!price.trim() || isNaN(Number(price))) { Alert.alert('Error', 'Por favor ingresa un precio válido'); return false; }
    if (!city.trim()) { Alert.alert('Error', 'Por favor ingresa la ciudad'); return false; }
    if (!department) { Alert.alert('Error', 'Por favor selecciona el departamento'); return false; }
    if (images.length === 0) { Alert.alert('Error', 'Por favor sube al menos una foto'); return false; }
    if (selectedAmenities.length === 0) { Alert.alert('Error', 'Por favor selecciona al menos una comodidad'); return false; }
    if (selectedTags.length === 0) { Alert.alert('Error', 'Por favor selecciona al menos una categoría'); return false; }
    return true;
  };

  // Validate Comprar form
  const validateComprarForm = () => {
    if (!title.trim()) { Alert.alert('Error', 'Por favor ingresa el título del inmueble'); return false; }
    if (!description.trim()) { Alert.alert('Error', 'Por favor ingresa una descripción'); return false; }
    if (!salePrice.trim() || isNaN(Number(salePrice))) { Alert.alert('Error', 'Por favor ingresa un precio de venta válido'); return false; }
    if (!city.trim()) { Alert.alert('Error', 'Por favor ingresa la ciudad'); return false; }
    if (!department) { Alert.alert('Error', 'Por favor selecciona el departamento'); return false; }
    if (!zona) { Alert.alert('Error', 'Por favor selecciona la zona'); return false; }
    if (!estrato) { Alert.alert('Error', 'Por favor selecciona el estrato'); return false; }
    if (!metraje.trim() || isNaN(Number(metraje))) { Alert.alert('Error', 'Por favor ingresa el metraje'); return false; }
    if (images.length === 0) { Alert.alert('Error', 'Por favor sube al menos una foto'); return false; }
    return true;
  };

  const uploadImages = async (): Promise<string[]> => {
    if (isCloudinaryConfigured()) {
      console.log('☁️ Usando Cloudinary para subir imágenes...');
      const folder = publishMode === 'estadia' ? 'properties' : 'sale_properties';
      const cloudinaryUrls = await uploadMultipleImages(images, folder);
      if (cloudinaryUrls.length === 0) throw new Error('No se pudieron subir las imágenes a Cloudinary');
      return cloudinaryUrls;
    }

    console.log('📦 Usando Supabase Storage');
    const uploadedUrls: string[] = [];
    const bucket = publishMode === 'estadia' ? 'property-images' : 'sale-property-images';

    for (let i = 0; i < images.length; i++) {
      try {
        const imageUri = images[i];
        const timestamp = Date.now();
        const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.jpg`;
        const filePath = `${publishMode}/${fileName}`;

        const response = await fetch(imageUri);
        const blob = await response.blob();
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(blob);
        });

        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(filePath, arrayBuffer, { contentType: 'image/jpeg', upsert: false });

        if (error) throw error;

        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
        uploadedUrls.push(publicUrlData.publicUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
      }
    }

    return uploadedUrls;
  };

  // Submit Estadía
  const handleEstadiaSubmit = async () => {
    if (!validateEstadiaForm()) return;
    if (!user) { Alert.alert('Error', 'Debes iniciar sesión'); return; }

    setUploading(true);
    try {
      const uploadedImageUrls = await uploadImages();

      const { data, error } = await supabase
        .from('properties')
        .insert([{
          title: title.trim(),
          description: description.trim(),
          location: `${city}, ${department}`,
          city: city.trim(),
          department: department,
          price: parseCurrencyInput(price),
          rating: 5.0,
          review_count: 0,
          images: uploadedImageUrls,
          amenities: selectedAmenities,
          tags: selectedTags,
          max_guests: maxGuests,
          bedrooms: bedrooms,
          owner_id: user.id,
          blocked_dates: [],
        }])
        .select();

      if (error) throw error;

      setUploading(false);
      Alert.alert('¡Éxito!', 'Tu alojamiento ha sido publicado', [
        { text: 'Ver alojamiento', onPress: () => router.replace(`/${data[0].id}`) },
        { text: 'Ir al inicio', onPress: () => router.replace('/(tabs)') }
      ]);
      clearForm();
    } catch (error: any) {
      setUploading(false);
      Alert.alert('Error', `Hubo un problema: ${error.message}`);
    }
  };

  // Submit Comprar (Real Estate)
  const handleComprarSubmit = async () => {
    if (!validateComprarForm()) return;
    if (!user) { Alert.alert('Error', 'Debes iniciar sesión'); return; }

    setUploading(true);
    try {
      const uploadedImageUrls = await uploadImages();
      const priceNum = parseCurrencyInput(salePrice);
      const metrajeNum = Number(metraje);
      const pricePerMeter = metrajeNum > 0 ? Math.round(priceNum / metrajeNum) : null;

      const { data, error } = await supabase
        .from('sale_properties')
        .insert([{
          owner_id: user.id,
          title: title.trim(),
          description: description.trim(),
          price: priceNum,
          price_per_meter: pricePerMeter,
          city: city.trim(),
          department: department,
          location: `${barrio ? barrio + ', ' : ''}${city}`,
          zona: zona,
          barrio: barrio.trim(),
          estrato: estrato,
          metraje: metrajeNum,
          metraje_construido: metrajeConstruido ? Number(metrajeConstruido) : null,
          bedrooms: saleBedrooms,
          bathrooms: bathrooms,
          garages: garages,
          year_built: yearBuilt ? Number(yearBuilt) : null,
          property_type: propertyType,
          images: uploadedImageUrls,
          features: selectedFeatures,
          is_new: true,
        }])
        .select();

      if (error) throw error;

      setUploading(false);
      Alert.alert('¡Éxito!', 'Tu inmueble ha sido publicado para venta', [
        { text: 'Ir al inicio', onPress: () => router.replace('/(tabs)') }
      ]);
      clearForm();
    } catch (error: any) {
      setUploading(false);
      Alert.alert('Error', `Hubo un problema: ${error.message}`);
    }
  };

  const handleSubmit = () => {
    if (publishMode === 'estadia') {
      handleEstadiaSubmit();
    } else {
      handleComprarSubmit();
    }
  };

  const clearForm = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    setSalePrice('');
    setCity('');
    setDepartment('');
    setImages([]);
    setSelectedAmenities([]);
    setSelectedTags([]);
    setSelectedFeatures([]);
    setBedrooms(1);
    setMaxGuests(2);
    setSaleBedrooms(0);
    setBathrooms(0);
    setGarages(0);
    setMetraje('');
    setMetrajeConstruido('');
    setYearBuilt('');
    setBarrio('');
    setZona(null);
    setEstrato(null);
    setPropertyType('apartamento');
  };

  const headerTitle = publishMode === 'estadia' ? 'Publicar Alojamiento' : 'Publicar Inmueble';
  const headerSubtitle = publishMode === 'estadia' ? 'Comparte tu espacio' : 'Vende tu propiedad';

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerContainer, { backgroundColor: publishMode === 'comprar' ? '#1A202C' : '#050505' }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <ThemedText style={styles.headerTitle}>{headerTitle}</ThemedText>
            <ThemedText style={[styles.headerSubtitle, { color: accentColor }]}>{headerSubtitle}</ThemedText>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Mode Switcher */}
        <ModeSwitcher
          mode={publishMode}
          onModeChange={setPublishMode}
          isDark={isDark}
          disabled={uploading}
        />

        {/* Title */}
        <View style={[styles.section, { borderBottomColor: colors.divider }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            {publishMode === 'estadia' ? 'Nombre del alojamiento' : 'Título del inmueble'}
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
            placeholder={publishMode === 'estadia' ? "Ej: Cabaña romántica en las montañas" : "Ej: Apartamento moderno en Chapinero"}
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={colors.textSecondary}
            editable={!uploading}
          />
        </View>

        {/* Description */}
        <View style={[styles.section, { borderBottomColor: colors.divider }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Descripción</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
            placeholder="Describe tu propiedad..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            placeholderTextColor={colors.textSecondary}
            editable={!uploading}
          />
        </View>

        {/* Price - Different for each mode */}
        <View style={[styles.section, { borderBottomColor: colors.divider }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            {publishMode === 'estadia' ? 'Precio por noche (COP)' : 'Precio de venta (COP)'}
          </ThemedText>
          <View style={[styles.priceInputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <ThemedText style={[styles.currencySymbol, { color: accentColor }]}>$</ThemedText>
            <TextInput
              style={[styles.priceInput, { color: colors.text }]}
              placeholder={publishMode === 'estadia' ? "280000" : "350000000"}
              value={publishMode === 'estadia' ? price : salePrice}
              onChangeText={text => publishMode === 'estadia' ? setPrice(formatCurrencyInput(text)) : setSalePrice(formatCurrencyInput(text))}
              keyboardType="numeric"
              placeholderTextColor={colors.textSecondary}
              editable={!uploading}
            />
          </View>
        </View>

        {/* COMPRAR MODE: Property Type */}
        {publishMode === 'comprar' && (
          <View style={[styles.section, { borderBottomColor: colors.divider }]}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Tipo de inmueble</ThemedText>
            <TouchableOpacity
              style={[styles.selectButton, { backgroundColor: colors.inputBackground, borderColor: accentColor }]}
              onPress={() => setShowPropertyTypeModal(true)}
              disabled={uploading}
            >
              <Ionicons
                name={(propertyTypeOptions.find(p => p.value === propertyType)?.icon || 'home-outline') as any}
                size={20}
                color={accentColor}
              />
              <ThemedText style={[styles.selectButtonTextFilled, { color: colors.text, flex: 1, marginLeft: 10 }]}>
                {propertyTypeOptions.find(p => p.value === propertyType)?.label || 'Seleccionar'}
              </ThemedText>
              <Ionicons name="chevron-down" size={20} color={accentColor} />
            </TouchableOpacity>
          </View>
        )}

        {/* Location */}
        <View style={[styles.section, { borderBottomColor: colors.divider }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Ubicación</ThemedText>
          <TextInput
            style={[styles.input, styles.marginBottom, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
            placeholder="Ciudad"
            value={city}
            onChangeText={setCity}
            placeholderTextColor={colors.textSecondary}
            editable={!uploading}
          />
          <TouchableOpacity
            style={[styles.selectButton, { backgroundColor: colors.inputBackground, borderColor: department ? accentColor : colors.border }]}
            onPress={() => setShowDepartmentModal(true)}
            disabled={uploading}
          >
            <ThemedText style={department ? [styles.selectButtonTextFilled, { color: colors.text }] : [styles.selectButtonText, { color: colors.textSecondary }]}>
              {department || 'Seleccionar departamento'}
            </ThemedText>
            <Ionicons name="chevron-down" size={20} color={accentColor} />
          </TouchableOpacity>

          {/* COMPRAR: Barrio */}
          {publishMode === 'comprar' && (
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text, marginTop: 15 }]}
              placeholder="Barrio"
              value={barrio}
              onChangeText={setBarrio}
              placeholderTextColor={colors.textSecondary}
              editable={!uploading}
            />
          )}
        </View>

        {/* COMPRAR MODE: Zona & Estrato */}
        {publishMode === 'comprar' && (
          <View style={[styles.section, { borderBottomColor: colors.divider }]}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Zona y Estrato</ThemedText>
            <View style={styles.rowContainer}>
              <TouchableOpacity
                style={[styles.halfSelectButton, { backgroundColor: colors.inputBackground, borderColor: zona ? accentColor : colors.border }]}
                onPress={() => setShowZonaModal(true)}
                disabled={uploading}
              >
                <Ionicons name="compass-outline" size={18} color={accentColor} />
                <ThemedText style={[styles.selectButtonTextFilled, { color: zona ? colors.text : colors.textSecondary, flex: 1 }]}>
                  {zona ? zonaOptions.find(z => z.value === zona)?.label : 'Zona'}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.halfSelectButton, { backgroundColor: colors.inputBackground, borderColor: estrato ? accentColor : colors.border }]}
                onPress={() => setShowEstratoModal(true)}
                disabled={uploading}
              >
                <Ionicons name="layers-outline" size={18} color={accentColor} />
                <ThemedText style={[styles.selectButtonTextFilled, { color: estrato ? colors.text : colors.textSecondary, flex: 1 }]}>
                  {estrato ? `Estrato ${estrato}` : 'Estrato'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* COMPRAR MODE: Metraje */}
        {publishMode === 'comprar' && (
          <View style={[styles.section, { borderBottomColor: colors.divider }]}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Área (m²)</ThemedText>
            <View style={styles.rowContainer}>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.inputLabel, { color: colors.textSecondary }]}>Total</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                  placeholder="120"
                  value={metraje}
                  onChangeText={setMetraje}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                  editable={!uploading}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.inputLabel, { color: colors.textSecondary }]}>Construido</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                  placeholder="100"
                  value={metrajeConstruido}
                  onChangeText={setMetrajeConstruido}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                  editable={!uploading}
                />
              </View>
            </View>
          </View>
        )}

        {/* Photos */}
        <View style={[styles.section, { borderBottomColor: colors.divider }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Fotos</ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Sube hasta 10 fotos (mínimo 1)
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
            <TouchableOpacity
              style={[styles.addImageButton, { borderColor: accentColor }]}
              onPress={pickImages}
              disabled={uploading}
            >
              <Ionicons name="camera-outline" size={32} color={accentColor} />
              <ThemedText style={[styles.addImageText, { color: accentColor }]}>Agregar fotos</ThemedText>
            </TouchableOpacity>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri }} style={styles.uploadedImage} />
                {!uploading && (
                  <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
                    <Ionicons name="close-circle" size={24} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ESTADÍA MODE: Capacity */}
        {publishMode === 'estadia' && (
          <View style={[styles.section, { borderBottomColor: colors.divider }]}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Capacidad</ThemedText>
            <View style={styles.capacityRow}>
              <View style={[styles.capacityItem, { backgroundColor: colors.inputBackground }]}>
                <ThemedText style={[styles.capacityLabel, { color: colors.text }]}>Habitaciones</ThemedText>
                <View style={styles.counterContainer}>
                  <TouchableOpacity style={[styles.counterButton, { borderColor: accentColor }]} onPress={() => setBedrooms(Math.max(1, bedrooms - 1))} disabled={uploading}>
                    <Ionicons name="remove" size={18} color={accentColor} />
                  </TouchableOpacity>
                  <ThemedText style={[styles.counterValue, { color: colors.text }]}>{bedrooms}</ThemedText>
                  <TouchableOpacity style={[styles.counterButton, { borderColor: accentColor }]} onPress={() => setBedrooms(bedrooms + 1)} disabled={uploading}>
                    <Ionicons name="add" size={18} color={accentColor} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[styles.capacityItem, { backgroundColor: colors.inputBackground }]}>
                <ThemedText style={[styles.capacityLabel, { color: colors.text }]}>Huéspedes máx.</ThemedText>
                <View style={styles.counterContainer}>
                  <TouchableOpacity style={[styles.counterButton, { borderColor: accentColor }]} onPress={() => setMaxGuests(Math.max(1, maxGuests - 1))} disabled={uploading}>
                    <Ionicons name="remove" size={18} color={accentColor} />
                  </TouchableOpacity>
                  <ThemedText style={[styles.counterValue, { color: colors.text }]}>{maxGuests}</ThemedText>
                  <TouchableOpacity style={[styles.counterButton, { borderColor: accentColor }]} onPress={() => setMaxGuests(maxGuests + 1)} disabled={uploading}>
                    <Ionicons name="add" size={18} color={accentColor} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* COMPRAR MODE: Bedrooms, Bathrooms, Garages, Year */}
        {publishMode === 'comprar' && (
          <View style={[styles.section, { borderBottomColor: colors.divider }]}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Espacios</ThemedText>
            <View style={styles.capacityGrid}>
              {/* Habitaciones */}
              <View style={[styles.capacityItemSmall, { backgroundColor: colors.inputBackground }]}>
                <Ionicons name="bed-outline" size={20} color={accentColor} />
                <ThemedText style={[styles.capacityLabelSmall, { color: colors.textSecondary }]}>Hab.</ThemedText>
                <View style={styles.counterContainerSmall}>
                  <TouchableOpacity onPress={() => setSaleBedrooms(Math.max(0, saleBedrooms - 1))} disabled={uploading}>
                    <Ionicons name="remove-circle-outline" size={24} color={accentColor} />
                  </TouchableOpacity>
                  <ThemedText style={[styles.counterValue, { color: colors.text }]}>{saleBedrooms}</ThemedText>
                  <TouchableOpacity onPress={() => setSaleBedrooms(saleBedrooms + 1)} disabled={uploading}>
                    <Ionicons name="add-circle-outline" size={24} color={accentColor} />
                  </TouchableOpacity>
                </View>
              </View>
              {/* Baños */}
              <View style={[styles.capacityItemSmall, { backgroundColor: colors.inputBackground }]}>
                <Ionicons name="water-outline" size={20} color={accentColor} />
                <ThemedText style={[styles.capacityLabelSmall, { color: colors.textSecondary }]}>Baños</ThemedText>
                <View style={styles.counterContainerSmall}>
                  <TouchableOpacity onPress={() => setBathrooms(Math.max(0, bathrooms - 1))} disabled={uploading}>
                    <Ionicons name="remove-circle-outline" size={24} color={accentColor} />
                  </TouchableOpacity>
                  <ThemedText style={[styles.counterValue, { color: colors.text }]}>{bathrooms}</ThemedText>
                  <TouchableOpacity onPress={() => setBathrooms(bathrooms + 1)} disabled={uploading}>
                    <Ionicons name="add-circle-outline" size={24} color={accentColor} />
                  </TouchableOpacity>
                </View>
              </View>
              {/* Garajes */}
              <View style={[styles.capacityItemSmall, { backgroundColor: colors.inputBackground }]}>
                <Ionicons name="car-outline" size={20} color={accentColor} />
                <ThemedText style={[styles.capacityLabelSmall, { color: colors.textSecondary }]}>Garajes</ThemedText>
                <View style={styles.counterContainerSmall}>
                  <TouchableOpacity onPress={() => setGarages(Math.max(0, garages - 1))} disabled={uploading}>
                    <Ionicons name="remove-circle-outline" size={24} color={accentColor} />
                  </TouchableOpacity>
                  <ThemedText style={[styles.counterValue, { color: colors.text }]}>{garages}</ThemedText>
                  <TouchableOpacity onPress={() => setGarages(garages + 1)} disabled={uploading}>
                    <Ionicons name="add-circle-outline" size={24} color={accentColor} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            {/* Año de construcción */}
            <View style={{ marginTop: 15 }}>
              <ThemedText style={[styles.inputLabel, { color: colors.textSecondary }]}>Año de construcción (opcional)</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                placeholder="2020"
                value={yearBuilt}
                onChangeText={setYearBuilt}
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
                editable={!uploading}
              />
            </View>
          </View>
        )}

        {/* ESTADÍA MODE: Tags */}
        {publishMode === 'estadia' && (
          <View style={[styles.section, { borderBottomColor: colors.divider }]}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Categorías</ThemedText>
            <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Selecciona las categorías que describen tu alojamiento
            </ThemedText>
            <View style={styles.tagsContainer}>
              {tagOptions.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagChip,
                    { backgroundColor: isDark ? colors.inputBackground : '#f5f5f5', borderColor: colors.border },
                    selectedTags.includes(tag) && { backgroundColor: accentColor, borderColor: accentColor }
                  ]}
                  onPress={() => toggleTag(tag)}
                  disabled={uploading}
                >
                  <ThemedText style={[
                    styles.tagChipText,
                    { color: colors.textSecondary },
                    selectedTags.includes(tag) && { color: '#fff', fontWeight: '600' }
                  ]}>
                    {tag}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ESTADÍA MODE: Amenities */}
        {publishMode === 'estadia' && (
          <View style={[styles.section, { borderBottomColor: colors.divider }]}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Comodidades</ThemedText>
            <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Selecciona todas las que apliquen
            </ThemedText>
            <View style={styles.amenitiesGrid}>
              {availableAmenities.map((amenity) => (
                <TouchableOpacity
                  key={amenity.id}
                  style={[
                    styles.amenityCard,
                    { backgroundColor: isDark ? colors.inputBackground : '#f5f5f5', borderColor: colors.border },
                    selectedAmenities.includes(amenity.name) && { backgroundColor: accentColor, borderColor: accentColor }
                  ]}
                  onPress={() => toggleAmenity(amenity.name)}
                  disabled={uploading}
                >
                  <Ionicons
                    name={amenity.icon as any}
                    size={22}
                    color={selectedAmenities.includes(amenity.name) ? '#fff' : accentColor}
                  />
                  <ThemedText style={[
                    styles.amenityName,
                    { color: colors.textSecondary },
                    selectedAmenities.includes(amenity.name) && { color: '#fff', fontWeight: '600' }
                  ]}>
                    {amenity.name}
                  </ThemedText>
                  {selectedAmenities.includes(amenity.name) && (
                    <Ionicons name="checkmark-circle" size={18} color="#fff" style={styles.checkmark} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* COMPRAR MODE: Features */}
        {publishMode === 'comprar' && (
          <View style={[styles.section, { borderBottomColor: colors.divider }]}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Características</ThemedText>
            <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Selecciona las características de tu inmueble
            </ThemedText>
            <View style={styles.tagsContainer}>
              {realEstateFeatures.map((feature) => (
                <TouchableOpacity
                  key={feature}
                  style={[
                    styles.tagChip,
                    { backgroundColor: isDark ? colors.inputBackground : '#f5f5f5', borderColor: colors.border },
                    selectedFeatures.includes(feature) && { backgroundColor: accentColor, borderColor: accentColor }
                  ]}
                  onPress={() => toggleFeature(feature)}
                  disabled={uploading}
                >
                  <ThemedText style={[
                    styles.tagChipText,
                    { color: colors.textSecondary },
                    selectedFeatures.includes(feature) && { color: '#fff', fontWeight: '600' }
                  ]}>
                    {feature}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={uploading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={uploading ? ['#666', '#555'] : publishMode === 'estadia'
              ? [ModeColors.estadia.accent, ModeColors.estadia.accentDark]
              : [ModeColors.comprar.accent, ModeColors.comprar.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitButtonGradient}
          >
            {uploading ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <ThemedText style={styles.submitButtonText}>Publicando...</ThemedText>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                <ThemedText style={styles.submitButtonText}>
                  {publishMode === 'estadia' ? 'Publicar Alojamiento' : 'Publicar Inmueble'}
                </ThemedText>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Department Modal */}
      <Modal visible={showDepartmentModal} transparent animationType="slide" onRequestClose={() => setShowDepartmentModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
              <ThemedText style={[styles.modalTitle, { color: colors.text }]}>Seleccionar Departamento</ThemedText>
              <TouchableOpacity onPress={() => setShowDepartmentModal(false)}>
                <Ionicons name="close" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={colombianDepartments}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.departmentItem, { borderBottomColor: colors.divider }]}
                  onPress={() => { setDepartment(item); setShowDepartmentModal(false); }}
                >
                  <ThemedText style={[styles.departmentText, { color: colors.text }]}>{item}</ThemedText>
                  {department === item && <Ionicons name="checkmark" size={22} color={accentColor} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Zona Modal */}
      <Modal visible={showZonaModal} transparent animationType="slide" onRequestClose={() => setShowZonaModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.smallModal, { backgroundColor: colors.cardBackground }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
              <ThemedText style={[styles.modalTitle, { color: colors.text }]}>Seleccionar Zona</ThemedText>
              <TouchableOpacity onPress={() => setShowZonaModal(false)}>
                <Ionicons name="close" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>
            {zonaOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.departmentItem, { borderBottomColor: colors.divider }]}
                onPress={() => { setZona(option.value); setShowZonaModal(false); }}
              >
                <ThemedText style={[styles.departmentText, { color: colors.text }]}>{option.label}</ThemedText>
                {zona === option.value && <Ionicons name="checkmark" size={22} color={accentColor} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Estrato Modal */}
      <Modal visible={showEstratoModal} transparent animationType="slide" onRequestClose={() => setShowEstratoModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.smallModal, { backgroundColor: colors.cardBackground }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
              <ThemedText style={[styles.modalTitle, { color: colors.text }]}>Seleccionar Estrato</ThemedText>
              <TouchableOpacity onPress={() => setShowEstratoModal(false)}>
                <Ionicons name="close" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>
            {estratoOptions.map((e) => (
              <TouchableOpacity
                key={e}
                style={[styles.departmentItem, { borderBottomColor: colors.divider }]}
                onPress={() => { setEstrato(e); setShowEstratoModal(false); }}
              >
                <ThemedText style={[styles.departmentText, { color: colors.text }]}>Estrato {e}</ThemedText>
                {estrato === e && <Ionicons name="checkmark" size={22} color={accentColor} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Property Type Modal */}
      <Modal visible={showPropertyTypeModal} transparent animationType="slide" onRequestClose={() => setShowPropertyTypeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.smallModal, { backgroundColor: colors.cardBackground }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
              <ThemedText style={[styles.modalTitle, { color: colors.text }]}>Tipo de Inmueble</ThemedText>
              <TouchableOpacity onPress={() => setShowPropertyTypeModal(false)}>
                <Ionicons name="close" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>
            {propertyTypeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.departmentItem, { borderBottomColor: colors.divider }]}
                onPress={() => { setPropertyType(option.value); setShowPropertyTypeModal(false); }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Ionicons name={option.icon as any} size={20} color={accentColor} />
                  <ThemedText style={[styles.departmentText, { color: colors.text }]}>{option.label}</ThemedText>
                </View>
                {propertyType === option.value && <Ionicons name="checkmark" size={22} color={accentColor} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Uploading Overlay */}
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <View style={[styles.uploadingContent, { backgroundColor: colors.cardBackground }]}>
            <ActivityIndicator size="large" color={accentColor} />
            <ThemedText style={[styles.uploadingText, { color: colors.text }]}>
              {publishMode === 'estadia' ? 'Subiendo alojamiento...' : 'Subiendo inmueble...'}
            </ThemedText>
            <ThemedText style={[styles.uploadingSubtext, { color: colors.textSecondary }]}>Por favor espera</ThemedText>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  backButton: {
    width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 22,
  },
  headerTitleContainer: { flex: 1, alignItems: 'center', marginLeft: -44 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 13, marginTop: 3, letterSpacing: 0.3 },
  scrollView: { flex: 1 },
  section: { paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  sectionSubtitle: { fontSize: 14, marginBottom: 15 },
  inputLabel: { fontSize: 12, marginBottom: 6, fontWeight: '500' },
  input: { borderRadius: 14, padding: 16, fontSize: 16, borderWidth: 1 },
  textArea: { height: 120, paddingTop: 16 },
  priceInputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 16 },
  currencySymbol: { fontSize: 20, fontWeight: 'bold', marginRight: 8 },
  priceInput: { flex: 1, fontSize: 18, fontWeight: '600', paddingVertical: 16 },
  marginBottom: { marginBottom: 15 },
  selectButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 14, padding: 16, borderWidth: 1.5,
  },
  halfSelectButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 14, padding: 14, borderWidth: 1.5,
  },
  selectButtonText: { fontSize: 16 },
  selectButtonTextFilled: { fontSize: 16, fontWeight: '500' },
  rowContainer: { flexDirection: 'row', gap: 12 },
  imagesScroll: { marginTop: 10 },
  addImageButton: {
    width: 120, height: 120, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  addImageText: { marginTop: 8, fontSize: 12, fontWeight: '500' },
  imageContainer: { position: 'relative', marginRight: 12 },
  uploadedImage: { width: 120, height: 120, borderRadius: 14 },
  removeImageButton: { position: 'absolute', top: -8, right: -8, backgroundColor: '#EF4444', borderRadius: 12 },
  capacityRow: { flexDirection: 'row', gap: 12 },
  capacityItem: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  capacityLabel: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  counterContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counterButton: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  counterValue: { fontSize: 18, fontWeight: 'bold', minWidth: 30, textAlign: 'center' },
  capacityGrid: { flexDirection: 'row', gap: 10 },
  capacityItemSmall: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  capacityLabelSmall: { fontSize: 11, marginTop: 4, marginBottom: 8 },
  counterContainerSmall: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tagChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  tagChipText: { fontSize: 14 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amenityCard: {
    width: '47%', flexDirection: 'row', alignItems: 'center', borderRadius: 12,
    padding: 14, borderWidth: 1, gap: 10,
  },
  amenityName: { fontSize: 13, flex: 1 },
  checkmark: { position: 'absolute', top: 8, right: 8 },
  submitButton: { marginHorizontal: 20, marginTop: 20, borderRadius: 16, overflow: 'hidden' },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  submitButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  bottomSpacing: { height: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { maxHeight: '70%', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  smallModal: { maxHeight: '50%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  departmentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1 },
  departmentText: { fontSize: 16 },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center',
  },
  uploadingContent: { padding: 30, borderRadius: 20, alignItems: 'center' },
  uploadingText: { marginTop: 16, fontSize: 16, fontWeight: '600' },
  uploadingSubtext: { marginTop: 4, fontSize: 14 },
});