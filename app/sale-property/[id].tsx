// app/sale-property/[id].tsx
// Sale Property Detail Screen with Agent profile and Action buttons

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatCurrency, SaleProperty } from '@/constants/realEstateData';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// ================================
// LUXURY PALETTE - VENTAS MODE
// ================================
const Colors = {
    light: {
        background: '#F5F5F0',
        cardBackground: '#FFFFFF',
        text: '#121212',
        textSecondary: '#666666',
        accent: '#6B7B8A',
        accentDark: '#3D4852',
        border: '#E0E0E0',
        divider: '#EBEBEB',
    },
    dark: {
        background: '#050505',
        cardBackground: '#121212',
        text: '#F0F0F0',
        textSecondary: '#999999',
        accent: '#6B7B8A',
        accentDark: '#9AABB8',
        border: '#333333',
        divider: '#222222',
    },
};

interface AgentInfo {
    id: string;
    name: string;
    avatar: string;
    phone: string;
    email: string;
}

export default function SalePropertyDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? Colors.dark : Colors.light;
    const { user } = useAuth();

    const [property, setProperty] = useState<SaleProperty | null>(null);
    const [agent, setAgent] = useState<AgentInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        loadProperty();
    }, [id]);

    useEffect(() => {
        if (property) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
            ]).start();
        }
    }, [property]);

    const loadProperty = async () => {
        if (!id || id === 'undefined') return;

        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('sale_properties')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            const formatted: SaleProperty = {
                id: data.id,
                title: data.title,
                description: data.description,
                price: data.price,
                pricePerMeter: data.price_per_meter,
                location: data.location || '',
                city: data.city,
                zona: data.zona,
                barrio: data.barrio,
                estrato: data.estrato,
                metraje: data.metraje,
                metrajeConstruido: data.metraje_construido,
                bedrooms: data.bedrooms,
                bathrooms: data.bathrooms,
                garages: data.garages,
                yearBuilt: data.year_built,
                propertyType: data.property_type,
                images: data.images || [],
                features: data.features || [],
                agent: { id: '', name: '', avatar: '', phone: '', whatsapp: '', email: '', verified: false, propertiesSold: 0, rating: 0 },
                isNew: data.is_new,
                isFeatured: data.is_featured,
                createdAt: data.created_at,
            };

            setProperty(formatted);

            // Load agent info
            if (data.owner_id) {
                const { data: agentData } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, phone, email')
                    .eq('id', data.owner_id)
                    .single();

                if (agentData) {
                    setAgent({
                        id: agentData.id,
                        name: agentData.full_name || 'Agente',
                        avatar: agentData.avatar_url || '',
                        phone: agentData.phone || '',
                        email: agentData.email || '',
                    });
                }
            }
        } catch (error) {
            console.error('Error loading property:', error);
            Alert.alert('Error', 'No se pudo cargar la propiedad');
        } finally {
            setLoading(false);
        }
    };

    const handleSchedule = async () => {
        if (Platform.OS !== 'web') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        if (agent?.phone) {
            const message = `Hola, me interesa agendar una visita para ver "${property?.title}"`;
            const url = `whatsapp://send?phone=${agent.phone}&text=${encodeURIComponent(message)}`;
            Linking.openURL(url).catch(() => {
                Alert.alert('Error', 'No se pudo abrir WhatsApp');
            });
        } else {
            Alert.alert('Información', 'El agente no tiene número de WhatsApp configurado');
        }
    };

    const handleSendProposal = async () => {
        if (Platform.OS !== 'web') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        if (!user) {
            Alert.alert('Iniciar Sesión', 'Debes iniciar sesión para enviar una propuesta', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Iniciar Sesión', onPress: () => router.push('/auth/login') },
            ]);
            return;
        }

        router.push(`/enviar-propuesta/${id}`);
    };

    const propertyTypeLabels: Record<string, string> = {
        casa: 'Casa',
        apartamento: 'Apartamento',
        lote: 'Lote',
        local: 'Local Comercial',
        oficina: 'Oficina',
        finca: 'Finca',
    };

    if (loading) {
        return (
            <ThemedView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.accent} />
                <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
                    Cargando propiedad...
                </ThemedText>
            </ThemedView>
        );
    }

    if (!property) {
        return (
            <ThemedView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <Ionicons name="alert-circle-outline" size={60} color={colors.accent} />
                <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
                    Propiedad no encontrada
                </ThemedText>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerBadges}>
                    <View style={[styles.typeBadge, { backgroundColor: colors.accent }]}>
                        <Text style={styles.typeBadgeText}>
                            {propertyTypeLabels[property.propertyType] || 'Inmueble'}
                        </Text>
                    </View>
                    <View style={[styles.estratoBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                        <Text style={styles.estratoBadgeText}>Estrato {property.estrato}</Text>
                    </View>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Image Gallery */}
                <View style={styles.imageGallery}>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(e) => {
                            const index = Math.round(e.nativeEvent.contentOffset.x / width);
                            setCurrentImageIndex(index);
                        }}
                    >
                        {property.images.map((uri, index) => (
                            <Image key={index} source={{ uri }} style={styles.galleryImage} contentFit="cover" />
                        ))}
                    </ScrollView>
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.imageGradient} />

                    {/* Image indicators */}
                    <View style={styles.imageIndicators}>
                        {property.images.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.indicator,
                                    { backgroundColor: index === currentImageIndex ? colors.accent : 'rgba(255,255,255,0.5)' },
                                ]}
                            />
                        ))}
                    </View>
                </View>

                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                    {/* Price Section */}
                    <View style={[styles.priceSection, { backgroundColor: colors.cardBackground }]}>
                        <Text style={[styles.price, { color: colors.accent }]}>{formatCurrency(property.price)}</Text>
                        {property.pricePerMeter && (
                            <Text style={[styles.pricePerMeter, { color: colors.textSecondary }]}>
                                {formatCurrency(property.pricePerMeter)} / m²
                            </Text>
                        )}
                    </View>

                    {/* Title & Location */}
                    <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
                        <Text style={[styles.title, { color: colors.text }]}>{property.title}</Text>
                        <View style={styles.locationRow}>
                            <Ionicons name="location" size={18} color={colors.accent} />
                            <Text style={[styles.location, { color: colors.textSecondary }]}>
                                {property.barrio}, {property.city} - Zona {property.zona?.charAt(0).toUpperCase()}{property.zona?.slice(1)}
                            </Text>
                        </View>
                    </View>

                    {/* Property Stats */}
                    <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Características</Text>
                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                <Ionicons name="resize-outline" size={24} color={colors.accent} />
                                <Text style={[styles.statValue, { color: colors.text }]}>{property.metraje} m²</Text>
                                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
                            </View>
                            {property.metrajeConstruido && (
                                <View style={styles.statItem}>
                                    <Ionicons name="cube-outline" size={24} color={colors.accent} />
                                    <Text style={[styles.statValue, { color: colors.text }]}>{property.metrajeConstruido} m²</Text>
                                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Construidos</Text>
                                </View>
                            )}
                            {property.bedrooms > 0 && (
                                <View style={styles.statItem}>
                                    <Ionicons name="bed-outline" size={24} color={colors.accent} />
                                    <Text style={[styles.statValue, { color: colors.text }]}>{property.bedrooms}</Text>
                                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Habitaciones</Text>
                                </View>
                            )}
                            {property.bathrooms > 0 && (
                                <View style={styles.statItem}>
                                    <Ionicons name="water-outline" size={24} color={colors.accent} />
                                    <Text style={[styles.statValue, { color: colors.text }]}>{property.bathrooms}</Text>
                                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Baños</Text>
                                </View>
                            )}
                            {property.garages > 0 && (
                                <View style={styles.statItem}>
                                    <Ionicons name="car-outline" size={24} color={colors.accent} />
                                    <Text style={[styles.statValue, { color: colors.text }]}>{property.garages}</Text>
                                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Garajes</Text>
                                </View>
                            )}
                            {property.yearBuilt && (
                                <View style={styles.statItem}>
                                    <Ionicons name="calendar-outline" size={24} color={colors.accent} />
                                    <Text style={[styles.statValue, { color: colors.text }]}>{property.yearBuilt}</Text>
                                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Año</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Description */}
                    <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Descripción</Text>
                        <Text style={[styles.description, { color: colors.textSecondary }]}>{property.description}</Text>
                    </View>

                    {/* Features */}
                    {property.features.length > 0 && (
                        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Amenidades</Text>
                            <View style={styles.featuresGrid}>
                                {property.features.map((feature, index) => (
                                    <View key={index} style={[styles.featureItem, { backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5' }]}>
                                        <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                                        <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Agent Section */}
                    {agent && (
                        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Agente</Text>
                            <View style={styles.agentCard}>
                                <View style={styles.agentAvatar}>
                                    {agent.avatar ? (
                                        <Image source={{ uri: agent.avatar }} style={styles.avatarImage} />
                                    ) : (
                                        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.accent }]}>
                                            <Ionicons name="person" size={30} color="#FFF" />
                                        </View>
                                    )}
                                </View>
                                <View style={styles.agentInfo}>
                                    <Text style={[styles.agentName, { color: colors.text }]}>{agent.name}</Text>
                                    <Text style={[styles.agentRole, { color: colors.accent }]}>Agente Inmobiliario</Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.agentCallButton, { backgroundColor: colors.accent }]}
                                    onPress={() => agent.phone && Linking.openURL(`tel:${agent.phone}`)}
                                >
                                    <Ionicons name="call" size={20} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <View style={{ height: 120 }} />
                </Animated.View>
            </ScrollView>

            {/* Bottom Action Buttons */}
            <View style={[styles.bottomActions, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
                <TouchableOpacity style={styles.actionButtonSecondary} onPress={handleSchedule}>
                    <LinearGradient
                        colors={['#25D366', '#128C7E']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.actionButtonGradient}
                    >
                        <Ionicons name="calendar" size={20} color="#FFF" />
                        <Text style={styles.actionButtonText}>Agendar</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButtonPrimary} onPress={handleSendProposal}>
                    <LinearGradient
                        colors={[colors.accent, colors.accentDark]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.actionButtonGradient}
                    >
                        <Ionicons name="document-text" size={20} color="#FFF" />
                        <Text style={styles.actionButtonText}>Enviar Propuesta</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 16 },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingTop: Platform.OS === 'ios' ? 50 : 35,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerBadges: { flexDirection: 'row', gap: 8 },
    typeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    typeBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
    estratoBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    estratoBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
    imageGallery: { position: 'relative', height: height * 0.45 },
    galleryImage: { width, height: height * 0.45 },
    imageGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 },
    imageIndicators: { position: 'absolute', bottom: 20, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
    indicator: { width: 8, height: 8, borderRadius: 4 },
    priceSection: { padding: 20, marginHorizontal: 16, marginTop: -30, borderRadius: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
    price: { fontSize: 28, fontWeight: '800' },
    pricePerMeter: { fontSize: 14, marginTop: 4 },
    section: { padding: 20, marginHorizontal: 16, marginTop: 12, borderRadius: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
    title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    location: { fontSize: 15, flex: 1 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    statItem: { alignItems: 'center', minWidth: 80 },
    statValue: { fontSize: 18, fontWeight: '700', marginTop: 8 },
    statLabel: { fontSize: 12, marginTop: 2 },
    description: { fontSize: 15, lineHeight: 24 },
    featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    featureItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
    featureText: { fontSize: 13 },
    agentCard: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    agentAvatar: {},
    avatarImage: { width: 60, height: 60, borderRadius: 30 },
    avatarPlaceholder: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
    agentInfo: { flex: 1 },
    agentName: { fontSize: 17, fontWeight: '600' },
    agentRole: { fontSize: 14, marginTop: 2 },
    agentCallButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    bottomActions: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 16, gap: 12, borderTopWidth: 1 },
    actionButtonSecondary: { flex: 1, borderRadius: 14, overflow: 'hidden' },
    actionButtonPrimary: { flex: 1.5, borderRadius: 14, overflow: 'hidden' },
    actionButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
    actionButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
