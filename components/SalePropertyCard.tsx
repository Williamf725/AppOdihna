// components/SalePropertyCard.tsx
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Linking,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SaleProperty, formatCurrency } from '../constants/realEstateData';
import { ModeColors } from '../contexts/AppModeContext';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = height * 0.55;
const CARD_WIDTH = width - 40;

interface SalePropertyCardProps {
    property: SaleProperty;
    index: number;
    isDark: boolean;
    onPress?: () => void;
}

const Colors = {
    light: {
        cardBackground: '#FFFFFF',
        text: '#121212',
        textSecondary: '#666666',
        border: '#E0E0E0',
    },
    dark: {
        cardBackground: '#121212',
        text: '#F0F0F0',
        textSecondary: '#999999',
        border: '#2A2A2A',
    },
};

export function SalePropertyCard({ property, index, isDark, onPress }: SalePropertyCardProps) {
    const colors = isDark ? Colors.dark : Colors.light;
    const modeColors = ModeColors.comprar;

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Staggered entrance animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                delay: index * 100,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                delay: index * 100,
                useNativeDriver: true,
            }),
        ]).start();
    }, [index]);

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.97,
            useNativeDriver: true,
            friction: 8,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 5,
        }).start();
    };

    const handleContactAgent = async () => {
        if (Platform.OS !== 'web') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        const message = encodeURIComponent(
            `¡Hola! Me interesa la propiedad "${property.title}" en ${property.barrio}. ¿Podemos agendar una visita?`
        );
        const whatsappUrl = `https://wa.me/${property.agent.whatsapp}?text=${message}`;

        Linking.openURL(whatsappUrl).catch(err => {
            console.log('Error opening WhatsApp:', err);
        });
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    transform: [
                        { translateY: slideAnim },
                        { scale: scaleAnim },
                    ],
                },
            ]}
        >
            <TouchableOpacity
                activeOpacity={0.95}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={onPress}
                style={[styles.card, { backgroundColor: colors.cardBackground }]}
            >
                {/* Image container */}
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: property.images[0] }}
                        style={styles.image}
                        contentFit="cover"
                        transition={400}
                    />

                    {/* Gradient overlay */}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.7)']}
                        locations={[0, 0.4, 1]}
                        style={styles.gradient}
                    />

                    {/* Badges */}
                    <View style={styles.badgesContainer}>
                        {property.isFeatured && (
                            <LinearGradient
                                colors={modeColors.gradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.badge}
                            >
                                <Ionicons name="diamond" size={12} color="#FFF" />
                                <Text style={styles.badgeText}>Destacado</Text>
                            </LinearGradient>
                        )}
                        {property.isNew && (
                            <View style={[styles.badge, { backgroundColor: '#10B981' }]}>
                                <Ionicons name="sparkles" size={12} color="#FFF" />
                                <Text style={styles.badgeText}>Nuevo</Text>
                            </View>
                        )}
                    </View>

                    {/* Property type badge */}
                    <View style={styles.typeBadge}>
                        <Ionicons
                            name={
                                property.propertyType === 'casa' ? 'home' :
                                    property.propertyType === 'apartamento' ? 'business' :
                                        property.propertyType === 'lote' ? 'map' :
                                            property.propertyType === 'finca' ? 'leaf' : 'storefront'
                            }
                            size={14}
                            color="#FFF"
                        />
                        <Text style={styles.typeText}>
                            {property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)}
                        </Text>
                    </View>

                    {/* Price on image */}
                    <View style={styles.priceOverlay}>
                        <Text style={styles.priceText}>{formatCurrency(property.price)}</Text>
                        {property.pricePerMeter && (
                            <Text style={styles.pricePerMeter}>
                                {formatCurrency(property.pricePerMeter)}/m²
                            </Text>
                        )}
                    </View>
                </View>

                {/* Content */}
                <View style={styles.content}>
                    <Text
                        style={[styles.title, { color: colors.text }]}
                        numberOfLines={2}
                    >
                        {property.title}
                    </Text>

                    <View style={styles.locationRow}>
                        <Ionicons name="location" size={14} color={modeColors.accent} />
                        <Text
                            style={[styles.location, { color: colors.textSecondary }]}
                            numberOfLines={1}
                        >
                            {property.barrio}, {property.city}
                        </Text>
                        <View style={styles.estratoBadge}>
                            <Text style={styles.estratoText}>Estrato {property.estrato}</Text>
                        </View>
                    </View>

                    {/* Specs row */}
                    <View style={styles.specsRow}>
                        {property.bedrooms > 0 && (
                            <View style={styles.specItem}>
                                <Ionicons name="bed-outline" size={16} color={colors.textSecondary} />
                                <Text style={[styles.specText, { color: colors.textSecondary }]}>
                                    {property.bedrooms}
                                </Text>
                            </View>
                        )}
                        {property.bathrooms > 0 && (
                            <View style={styles.specItem}>
                                <Ionicons name="water-outline" size={16} color={colors.textSecondary} />
                                <Text style={[styles.specText, { color: colors.textSecondary }]}>
                                    {property.bathrooms}
                                </Text>
                            </View>
                        )}
                        {property.garages > 0 && (
                            <View style={styles.specItem}>
                                <Ionicons name="car-outline" size={16} color={colors.textSecondary} />
                                <Text style={[styles.specText, { color: colors.textSecondary }]}>
                                    {property.garages}
                                </Text>
                            </View>
                        )}
                        <View style={styles.specItem}>
                            <Ionicons name="resize-outline" size={16} color={colors.textSecondary} />
                            <Text style={[styles.specText, { color: colors.textSecondary }]}>
                                {property.metraje >= 10000
                                    ? `${(property.metraje / 10000).toFixed(1)} Ha`
                                    : `${property.metraje} m²`
                                }
                            </Text>
                        </View>
                    </View>

                    {/* Agent + CTA */}
                    <View style={styles.footer}>
                        <View style={styles.agentInfo}>
                            <Image
                                source={{ uri: property.agent.avatar }}
                                style={styles.agentAvatar}
                                contentFit="cover"
                            />
                            <View>
                                <Text style={[styles.agentName, { color: colors.text }]}>
                                    {property.agent.name}
                                </Text>
                                <View style={styles.agentRating}>
                                    <Ionicons name="star" size={10} color={modeColors.accent} />
                                    <Text style={[styles.agentRatingText, { color: colors.textSecondary }]}>
                                        {property.agent.rating}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.ctaButton}
                            onPress={handleContactAgent}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={modeColors.gradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.ctaGradient}
                            >
                                <Ionicons name="logo-whatsapp" size={16} color="#FFF" />
                                <Text style={styles.ctaText}>Agendar</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 20,
        marginBottom: 20,
    },
    card: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    imageContainer: {
        height: CARD_HEIGHT * 0.55,
        width: '100%',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },
    badgesContainer: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        gap: 8,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
    typeBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    typeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '600',
    },
    priceOverlay: {
        position: 'absolute',
        bottom: 12,
        left: 12,
    },
    priceText: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: '800',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    pricePerMeter: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        fontWeight: '500',
        marginTop: 2,
    },
    content: {
        padding: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 4,
    },
    location: {
        fontSize: 13,
        flex: 1,
    },
    estratoBadge: {
        backgroundColor: 'rgba(142, 142, 147, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    estratoText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#8E8E93',
    },
    specsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(142, 142, 147, 0.2)',
    },
    specItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    specText: {
        fontSize: 13,
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    agentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    agentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    agentName: {
        fontSize: 13,
        fontWeight: '600',
    },
    agentRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 2,
    },
    agentRatingText: {
        fontSize: 11,
    },
    ctaButton: {
        borderRadius: 25,
        overflow: 'hidden',
    },
    ctaGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 6,
    },
    ctaText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
    },
});

export default SalePropertyCard;
