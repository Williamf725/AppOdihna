// components/RealEstateView.tsx
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SaleProperty } from '../constants/realEstateData';
import { ModeColors, TransitionConfig } from '../contexts/AppModeContext';
import { supabase } from '../lib/supabase';
import { FilterState, RealEstateFilters } from './RealEstateFilters';
import { SalePropertyCard } from './SalePropertyCard';

const { width, height } = Dimensions.get('window');

interface RealEstateViewProps {
    isDark: boolean;
    isFiltersVisible: boolean;
    onToggleFilters: () => void;
}

const Colors = {
    light: {
        background: '#F5F5F0',
        text: '#121212',
        textSecondary: '#666666',
    },
    dark: {
        background: '#050505',
        text: '#F0F0F0',
        textSecondary: '#999999',
    },
};

export function RealEstateView({ isDark, isFiltersVisible, onToggleFilters }: RealEstateViewProps) {
    const colors = isDark ? Colors.dark : Colors.light;
    const modeColors = ModeColors.comprar;

    // Data state
    const [properties, setProperties] = useState<SaleProperty[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<FilterState>({
        priceMin: 0,
        priceMax: Infinity,
        zona: null,
        estrato: null,
        metrajeMin: null,
    });

    // ================================
    // LOAD DATA FROM SUPABASE
    // ================================
    const loadProperties = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('sale_properties')
                .select('*')
                .order('is_featured', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formatted: SaleProperty[] = (data || []).map((p: any) => ({
                id: p.id,
                title: p.title,
                description: p.description,
                price: p.price,
                pricePerMeter: p.price_per_meter,
                location: p.location || '',
                city: p.city,
                zona: p.zona,
                barrio: p.barrio,
                estrato: p.estrato,
                metraje: p.metraje,
                metrajeConstruido: p.metraje_construido,
                bedrooms: p.bedrooms,
                bathrooms: p.bathrooms,
                garages: p.garages,
                yearBuilt: p.year_built,
                propertyType: p.property_type,
                images: p.images || [],
                features: p.features || [],
                agent: { id: '', name: 'Agente', avatar: '', phone: '', whatsapp: '', email: '', verified: false, propertiesSold: 0, rating: 0 },
                isNew: p.is_new,
                isFeatured: p.is_featured,
                createdAt: p.created_at,
            }));

            setProperties(formatted);
        } catch (error) {
            console.error('Error loading sale properties:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // ================================
    // ELEGANT ANIMATIONS - Smooth & Premium
    // ================================

    // Container fade
    const containerOpacity = useRef(new Animated.Value(0)).current;

    // Header section - smooth slide
    const headerY = useRef(new Animated.Value(-30)).current;
    const headerOpacity = useRef(new Animated.Value(0)).current;

    // Divider - elegant width expansion
    const dividerScale = useRef(new Animated.Value(0)).current;

    // Content area
    const contentOpacity = useRef(new Animated.Value(0)).current;
    const contentY = useRef(new Animated.Value(20)).current;

    // Ambient shimmer (subtle luxury effect)
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    // Card animations - dynamically created based on properties count
    const [cardAnimations, setCardAnimations] = useState<Array<{
        opacity: Animated.Value;
        translateY: Animated.Value;
        scale: Animated.Value;
    }>>([]);

    useEffect(() => {
        // Single haptic on mode enter
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        const elegantEase = Easing.bezier(0.25, 0.46, 0.45, 0.94);

        // Container fade in
        Animated.timing(containerOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();

        // Header smooth entrance
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(headerY, {
                    toValue: 0,
                    duration: 400,
                    easing: elegantEase,
                    useNativeDriver: true,
                }),
                Animated.timing(headerOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]).start();
        }, 100);

        // Divider elegant expansion
        setTimeout(() => {
            Animated.timing(dividerScale, {
                toValue: 1,
                duration: 500,
                easing: elegantEase,
                useNativeDriver: true,
            }).start();
        }, 200);

        // Content reveal
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(contentOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(contentY, {
                    toValue: 0,
                    duration: 400,
                    easing: elegantEase,
                    useNativeDriver: true,
                }),
            ]).start();
        }, 250);

        // Cards - elegant staggered reveal
        setTimeout(() => {
            cardAnimations.forEach((anim, index) => {
                const delay = index * TransitionConfig.cardStagger;

                setTimeout(() => {
                    Animated.parallel([
                        Animated.timing(anim.opacity, {
                            toValue: 1,
                            duration: 450,
                            easing: elegantEase,
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim.translateY, {
                            toValue: 0,
                            duration: 500,
                            easing: elegantEase,
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim.scale, {
                            toValue: 1,
                            duration: 450,
                            easing: elegantEase,
                            useNativeDriver: true,
                        }),
                    ]).start();
                }, delay);
            });
        }, TransitionConfig.cardRevealDelay);

        // Subtle ambient shimmer (luxury feel)
        Animated.loop(
            Animated.timing(shimmerAnim, {
                toValue: 1,
                duration: 4000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

    }, []);

    // Load properties on mount
    useEffect(() => {
        loadProperties();
    }, [loadProperties]);

    // Initialize card animations when properties change
    useEffect(() => {
        if (properties.length > 0) {
            const anims = properties.map(() => ({
                opacity: new Animated.Value(0),
                translateY: new Animated.Value(60),
                scale: new Animated.Value(0.95),
            }));
            setCardAnimations(anims);

            // Animate cards after a short delay
            const elegantEase = Easing.bezier(0.25, 0.46, 0.45, 0.94);
            setTimeout(() => {
                anims.forEach((anim, index) => {
                    const delay = index * TransitionConfig.cardStagger;
                    setTimeout(() => {
                        Animated.parallel([
                            Animated.timing(anim.opacity, { toValue: 1, duration: 450, easing: elegantEase, useNativeDriver: true }),
                            Animated.timing(anim.translateY, { toValue: 0, duration: 500, easing: elegantEase, useNativeDriver: true }),
                            Animated.timing(anim.scale, { toValue: 1, duration: 450, easing: elegantEase, useNativeDriver: true }),
                        ]).start();
                    }, delay);
                });
            }, 200);
        }
    }, [properties]);

    const onRefresh = () => {
        setRefreshing(true);
        loadProperties();
    };

    const filteredProperties = useMemo(() => {
        let result = [...properties];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (p) =>
                    p.title.toLowerCase().includes(query) ||
                    p.barrio.toLowerCase().includes(query) ||
                    p.city.toLowerCase().includes(query) ||
                    p.location.toLowerCase().includes(query)
            );
        }

        if (filters.priceMin > 0 || filters.priceMax < Infinity) {
            result = result.filter(
                (p) => p.price >= filters.priceMin && p.price <= filters.priceMax
            );
        }

        if (filters.zona) {
            result = result.filter((p) => p.zona === filters.zona);
        }

        if (filters.estrato) {
            result = result.filter((p) => p.estrato === filters.estrato);
        }

        result.sort((a, b) => {
            if (a.isFeatured && !b.isFeatured) return -1;
            if (!a.isFeatured && b.isFeatured) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return result;
    }, [properties, searchQuery, filters]);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (searchQuery.trim()) count++;
        if (filters.zona) count++;
        if (filters.estrato) count++;
        if (filters.priceMin > 0 || filters.priceMax < Infinity) count++;
        return count;
    }, [searchQuery, filters]);

    const shimmerTranslate = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-width, width * 2],
    });

    // Loading state
    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={modeColors.accent} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando inmuebles...</Text>
            </View>
        );
    }

    return (
        <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
            {/* Subtle shimmer overlay */}
            <Animated.View
                style={[
                    styles.shimmerContainer,
                    { transform: [{ translateX: shimmerTranslate }] },
                ]}
            >
                <LinearGradient
                    colors={['transparent', 'rgba(154, 171, 184, 0.06)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.shimmerGradient}
                />
            </Animated.View>

            {/* Filters */}
            <RealEstateFilters
                isDark={isDark}
                onFiltersChange={setFilters}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                isVisible={isFiltersVisible}
            />

            {/* Results header */}
            <Animated.View
                style={[
                    styles.resultsHeader,
                    {
                        opacity: headerOpacity,
                        transform: [{ translateY: headerY }],
                    }
                ]}
            >
                <View style={styles.resultsRow}>
                    <View style={[styles.accentBar, { backgroundColor: modeColors.accent }]} />
                    <Text style={[styles.resultsCount, { color: colors.text }]}>
                        {filteredProperties.length}{' '}
                        {filteredProperties.length === 1 ? 'propiedad' : 'propiedades'} en venta
                    </Text>
                    {activeFiltersCount > 0 && (
                        <View style={[styles.activeFiltersBadge, { backgroundColor: modeColors.accent }]}>
                            <Text style={styles.activeFiltersBadgeText}>{activeFiltersCount}</Text>
                        </View>
                    )}
                </View>
            </Animated.View>

            {/* Elegant divider */}
            <Animated.View
                style={[
                    styles.divider,
                    {
                        backgroundColor: modeColors.accent,
                        transform: [{ scaleX: dividerScale }],
                    }
                ]}
            />

            {/* Content */}
            <Animated.View
                style={[
                    styles.scrollWrapper,
                    {
                        opacity: contentOpacity,
                        transform: [{ translateY: contentY }],
                    }
                ]}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={modeColors.accent}
                        />
                    }
                >
                    {filteredProperties.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={[styles.emptyIconContainer, { backgroundColor: `${modeColors.accent}15` }]}>
                                <Ionicons name="business-outline" size={48} color={modeColors.accent} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>
                                No encontramos propiedades
                            </Text>
                            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                                Intenta ajustar los filtros
                            </Text>
                        </View>
                    ) : (
                        <>
                            {/* Featured header */}
                            {filteredProperties.some((p) => p.isFeatured) && (
                                <Animated.View style={[styles.sectionHeader, { opacity: headerOpacity }]}>
                                    <LinearGradient
                                        colors={modeColors.gradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.sectionIcon}
                                    >
                                        <Ionicons name="diamond" size={14} color="#FFF" />
                                    </LinearGradient>
                                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                        Propiedades Destacadas
                                    </Text>
                                </Animated.View>
                            )}

                            {/* Cards with elegant staggered entrance */}
                            {filteredProperties.map((property, index) => {
                                const anim = cardAnimations[index];
                                if (!anim) return null;

                                return (
                                    <Animated.View
                                        key={property.id}
                                        style={{
                                            opacity: anim.opacity,
                                            transform: [
                                                { translateY: anim.translateY },
                                                { scale: anim.scale },
                                            ],
                                        }}
                                    >
                                        <SalePropertyCard
                                            property={property}
                                            index={index}
                                            isDark={isDark}
                                            onPress={() => {
                                                router.push(`/sale-property/${property.id}`);
                                            }}
                                        />
                                    </Animated.View>
                                );
                            })}

                            <View style={{ height: 40 }} />
                        </>
                    )}
                </ScrollView>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
    },
    shimmerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
    },
    shimmerGradient: {
        width: width * 0.4,
        height: '100%',
    },
    resultsHeader: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    resultsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    accentBar: {
        width: 4,
        height: 20,
        borderRadius: 2,
    },
    resultsCount: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    activeFiltersBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    activeFiltersBadgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },
    divider: {
        height: 2,
        marginHorizontal: 20,
        borderRadius: 1,
    },
    scrollWrapper: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 12,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingTop: height * 0.15,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        gap: 10,
    },
    sectionIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});

export default RealEstateView;
