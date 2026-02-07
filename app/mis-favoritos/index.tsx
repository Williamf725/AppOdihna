// app/mis-favoritos/index.tsx
import { ThemedText } from '@/components/themed-text';
import { Property } from '@/constants/mockData';
import { useFavorites } from '@/hooks/useFavorites';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';

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
    },
};

// ================================
// ANIMATED FAVORITE CARD
// ================================
function AnimatedFavoriteCard({
    property,
    index,
    onPress,
    onRemove,
    colors,
}: {
    property: Property;
    index: number;
    onPress: () => void;
    onRemove: () => void;
    colors: typeof Colors.light;
}) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                delay: index * 80,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 500,
                delay: index * 80,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.cardContainer,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
                },
            ]}
        >
            <Pressable
                style={[styles.card, { backgroundColor: colors.cardBackground, shadowColor: colors.accent }]}
                onPress={onPress}
                onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
            >
                <Image source={{ uri: property.images[0] }} style={styles.cardImage} contentFit="cover" />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={styles.cardImageGradient}
                />

                {/* Botón de quitar de favoritos */}
                <TouchableOpacity style={styles.removeButton} onPress={onRemove} activeOpacity={0.8}>
                    <Ionicons name="heart" size={22} color={colors.accent} />
                </TouchableOpacity>

                {/* Rating */}
                <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color={colors.accent} />
                    <ThemedText style={styles.ratingText}>{property.rating}</ThemedText>
                </View>

                <View style={styles.cardContent}>
                    <ThemedText style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                        {property.title}
                    </ThemedText>
                    <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={14} color={colors.accent} />
                        <ThemedText style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {property.location}
                        </ThemedText>
                    </View>
                    <View style={styles.priceRow}>
                        <ThemedText style={[styles.priceSymbol, { color: colors.accent }]}>$</ThemedText>
                        <ThemedText style={[styles.priceValue, { color: colors.text }]}>
                            {property.price.toLocaleString()}
                        </ThemedText>
                        <ThemedText style={[styles.priceNight, { color: colors.textSecondary }]}> /noche</ThemedText>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

export default function MisFavoritosScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? Colors.dark : Colors.light;

    const { favorites, loading: favoritesLoading, removeFavorite, refreshFavorites } = useFavorites();
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadFavoriteProperties = async () => {
        if (favorites.length === 0) {
            setProperties([]);
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('properties')
                .select('id, title, location, price, rating, images')
                .in('id', favorites);

            if (error) throw error;

            const formattedProperties: Property[] = (data || []).map((p: any) => ({
                id: p.id,
                title: p.title,
                location: p.location,
                city: p.city,
                department: p.department,
                price: p.price,
                rating: p.rating,
                reviewCount: p.review_count,
                images: p.images,
                description: p.description,
                amenities: p.amenities,
                tags: p.tags,
                maxGuests: p.max_guests,
                bedrooms: p.bedrooms,
                blockedDates: p.blocked_dates || [],
                host: { name: '', joinedDate: '', avatar: '' },
                reviews: [],
            }));

            setProperties(formattedProperties);
        } catch (error) {
            console.error('Error loading favorite properties:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!favoritesLoading) {
            loadFavoriteProperties();
        }
    }, [favorites, favoritesLoading]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await refreshFavorites();
        await loadFavoriteProperties();
        setRefreshing(false);
    };

    const handleRemoveFavorite = async (propertyId: string) => {
        await removeFavorite(propertyId);
    };

    if (loading || favoritesLoading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: '#050505' }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <ThemedText style={styles.headerTitle}>Mis Favoritos</ThemedText>
                    <ThemedText style={styles.headerSubtitle}>{properties.length} alojamientos</ThemedText>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.accent}
                    />
                }
            >
                {properties.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={[styles.emptyIconContainer, { backgroundColor: `${colors.accent}15` }]}>
                            <Ionicons name="heart-outline" size={60} color={colors.accent} />
                        </View>
                        <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
                            Sin favoritos aún
                        </ThemedText>
                        <ThemedText style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                            Explora alojamientos y pulsa el corazón para guardarlos aquí
                        </ThemedText>
                        <TouchableOpacity
                            style={styles.exploreButton}
                            onPress={() => router.push('/(tabs)')}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[colors.accent, colors.accentDark]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.exploreButtonGradient}
                            >
                                <ThemedText style={styles.exploreButtonText}>Explorar Alojamientos</ThemedText>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.grid}>
                        {properties.map((property, index) => (
                            <AnimatedFavoriteCard
                                key={property.id}
                                property={property}
                                index={index}
                                onPress={() => router.push(`/${property.id}`)}
                                onRemove={() => handleRemoveFavorite(String(property.id))}
                                colors={colors}
                            />
                        ))}
                    </View>
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { justifyContent: 'center', alignItems: 'center' },
    header: {
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
    headerSubtitle: { fontSize: 13, color: '#D4AF37', marginTop: 2 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
    grid: { gap: 16 },
    cardContainer: { marginBottom: 0 },
    card: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    cardImage: { width: '100%', height: 200 },
    cardImageGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 100,
    },
    removeButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    ratingBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 4,
    },
    ratingText: { fontSize: 13, fontWeight: '600', color: '#fff' },
    cardContent: { padding: 16 },
    cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
    locationText: { fontSize: 14, flex: 1 },
    priceRow: { flexDirection: 'row', alignItems: 'baseline' },
    priceSymbol: { fontSize: 16, fontWeight: '600' },
    priceValue: { fontSize: 22, fontWeight: '700' },
    priceNight: { fontSize: 14 },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: { fontSize: 22, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
    emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 30 },
    exploreButton: { borderRadius: 14, overflow: 'hidden' },
    exploreButtonGradient: { paddingHorizontal: 28, paddingVertical: 14 },
    exploreButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
