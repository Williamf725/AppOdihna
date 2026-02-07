// app/enviar-propuesta/[propertyId].tsx
// Premium Proposal Form Screen

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatCurrency } from '@/constants/realEstateData';
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
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

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
        inputBackground: '#F8F8F8',
        success: '#10B981',
    },
    dark: {
        background: '#050505',
        cardBackground: '#121212',
        text: '#F0F0F0',
        textSecondary: '#999999',
        accent: '#6B7B8A',
        accentDark: '#9AABB8',
        border: '#333333',
        inputBackground: '#1A1A1A',
        success: '#10B981',
    },
};

interface PropertyInfo {
    id: string;
    title: string;
    price: number;
    image: string;
    owner_id: string;
}

export default function EnviarPropuestaScreen() {
    const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? Colors.dark : Colors.light;
    const { user } = useAuth();

    const [property, setProperty] = useState<PropertyInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form fields
    const [offeredPrice, setOfferedPrice] = useState('');
    const [message, setMessage] = useState('');

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        loadProperty();
    }, [propertyId]);

    useEffect(() => {
        if (property) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
            ]).start();
        }
    }, [property]);

    const loadProperty = async () => {
        try {
            const { data, error } = await supabase
                .from('sale_properties')
                .select('id, title, price, images, owner_id')
                .eq('id', propertyId)
                .single();

            if (error) throw error;

            setProperty({
                id: data.id,
                title: data.title,
                price: data.price,
                image: data.images?.[0] || '',
                owner_id: data.owner_id,
            });
        } catch (error) {
            console.error('Error loading property:', error);
            Alert.alert('Error', 'No se pudo cargar la información de la propiedad');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const formatInputPrice = (text: string) => {
        // Remove non-numeric characters
        const numericValue = text.replace(/[^0-9]/g, '');
        return numericValue;
    };

    const handlePriceChange = (text: string) => {
        const numericValue = formatInputPrice(text);
        setOfferedPrice(numericValue);
    };

    const handleSubmit = async () => {
        if (!offeredPrice || parseInt(offeredPrice) <= 0) {
            Alert.alert('Error', 'Por favor ingresa un precio de oferta válido');
            return;
        }

        if (!user) {
            Alert.alert('Error', 'Debes iniciar sesión para enviar una propuesta');
            return;
        }

        if (!property) return;

        if (Platform.OS !== 'web') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        setSubmitting(true);

        try {
            // 1. Importar chatService dinámicamente para evitar problemas de circular deps
            const { getOrCreateConversation, sendProposal } = await import('@/lib/chatService');

            // 2. Crear o obtener conversación existente
            const conversation = await getOrCreateConversation(
                user.id,
                property.owner_id,
                property.id,
                property.title,
                property.image
            );

            if (!conversation) {
                throw new Error('No se pudo crear la conversación');
            }

            // 3. Enviar propuesta como mensaje en el chat
            const proposalMessage = await sendProposal(conversation.id, user.id, {
                offered_price: parseInt(offeredPrice),
                property_id: property.id,
                property_title: property.title,
                property_image: property.image,
                message: message.trim() || undefined,
            });

            if (!proposalMessage) {
                throw new Error('No se pudo enviar la propuesta');
            }

            // 4. También crear en tabla proposals para tracking (opcional, mantener compatibilidad)
            await supabase
                .from('proposals')
                .insert({
                    sale_property_id: property.id,
                    user_id: user.id,
                    agent_id: property.owner_id,
                    offered_price: parseInt(offeredPrice),
                    message: message.trim() || null,
                    property_title: property.title,
                    property_image: property.image,
                    status: 'pending',
                });

            // 5. Crear notificaciones
            await Promise.all([
                supabase.from('notifications').insert({
                    user_id: user.id,
                    title: 'Propuesta Enviada',
                    message: `Tu propuesta de ${formatCurrency(parseInt(offeredPrice))} para "${property.title}" ha sido enviada.`,
                    type: 'proposal_sent',
                    property_id: property.id,
                }),
                supabase.from('notifications').insert({
                    user_id: property.owner_id,
                    title: 'Nueva Propuesta Recibida',
                    message: `Has recibido una propuesta de ${formatCurrency(parseInt(offeredPrice))} para "${property.title}".`,
                    type: 'proposal_received',
                    property_id: property.id,
                }),
            ]);

            if (Platform.OS !== 'web') {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            // 6. Navegar directamente al chat
            router.replace({
                pathname: '/chat/[conversationId]',
                params: { conversationId: conversation.id },
            });
        } catch (error) {
            console.error('Error submitting proposal:', error);
            Alert.alert('Error', 'No se pudo enviar tu propuesta. Por favor intenta de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <ThemedView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.accent} />
                <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
                    Cargando...
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

    const priceDifference = property.price - parseInt(offeredPrice || '0');
    const percentageDifference = property.price > 0 ? ((priceDifference / property.price) * 100).toFixed(1) : 0;

    return (
        <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Enviar Propuesta</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                        {/* Property Preview */}
                        <View style={[styles.propertyCard, { backgroundColor: colors.cardBackground }]}>
                            <Image source={{ uri: property.image }} style={styles.propertyImage} contentFit="cover" />
                            <View style={styles.propertyInfo}>
                                <Text style={[styles.propertyTitle, { color: colors.text }]} numberOfLines={2}>
                                    {property.title}
                                </Text>
                                <Text style={[styles.propertyPrice, { color: colors.accent }]}>
                                    Precio de lista: {formatCurrency(property.price)}
                                </Text>
                            </View>
                        </View>

                        {/* Price Offer Section */}
                        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="cash-outline" size={22} color={colors.accent} />
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Tu Oferta</Text>
                            </View>

                            <View style={[styles.priceInputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <Text style={[styles.currencySymbol, { color: colors.accent }]}>$</Text>
                                <TextInput
                                    style={[styles.priceInput, { color: colors.text }]}
                                    placeholder="0"
                                    placeholderTextColor={colors.textSecondary}
                                    value={offeredPrice ? parseInt(offeredPrice).toLocaleString('es-CO') : ''}
                                    onChangeText={handlePriceChange}
                                    keyboardType="numeric"
                                />
                                <Text style={[styles.currencyLabel, { color: colors.textSecondary }]}>COP</Text>
                            </View>

                            {offeredPrice && parseInt(offeredPrice) > 0 && (
                                <View style={styles.priceComparison}>
                                    <View style={[styles.comparisonBadge, { backgroundColor: priceDifference > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)' }]}>
                                        <Ionicons
                                            name={priceDifference > 0 ? 'trending-down' : 'trending-up'}
                                            size={16}
                                            color={priceDifference > 0 ? '#EF4444' : colors.success}
                                        />
                                        <Text style={[styles.comparisonText, { color: priceDifference > 0 ? '#EF4444' : colors.success }]}>
                                            {priceDifference > 0 ? `${percentageDifference}% por debajo` : `${Math.abs(parseFloat(percentageDifference as string))}% por encima`} del precio de lista
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Message Section */}
                        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.accent} />
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Mensaje para el Agente</Text>
                                <Text style={[styles.optionalLabel, { color: colors.textSecondary }]}>Opcional</Text>
                            </View>

                            <TextInput
                                style={[styles.messageInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                                placeholder="Escribe tus preguntas o comentarios para el agente..."
                                placeholderTextColor={colors.textSecondary}
                                value={message}
                                onChangeText={setMessage}
                                multiline
                                numberOfLines={5}
                                textAlignVertical="top"
                            />

                            <Text style={[styles.messageHint, { color: colors.textSecondary }]}>
                                💡 Incluye preguntas sobre financiación, fechas de disponibilidad, o cualquier duda sobre la propiedad.
                            </Text>
                        </View>

                        {/* Info Banner */}
                        <View style={[styles.infoBanner, { backgroundColor: isDark ? 'rgba(107, 123, 138, 0.1)' : 'rgba(107, 123, 138, 0.05)' }]}>
                            <Ionicons name="information-circle" size={20} color={colors.accent} />
                            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                                El agente recibirá una notificación y podrá aceptar, rechazar, o hacer una contraoferta.
                            </Text>
                        </View>

                        <View style={{ height: 100 }} />
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Submit Button */}
            <View style={[styles.bottomActions, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmit}
                    disabled={submitting || !offeredPrice}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={(!submitting && offeredPrice) ? [colors.accent, colors.accentDark] : ['#999', '#777']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.submitGradient}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <>
                                <Ionicons name="paper-plane" size={20} color="#FFF" />
                                <Text style={styles.submitText}>Enviar Propuesta</Text>
                            </>
                        )}
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 50 : 35,
        paddingBottom: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    scrollView: { flex: 1 },
    propertyCard: {
        flexDirection: 'row',
        margin: 16,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    propertyImage: { width: 100, height: 100 },
    propertyInfo: { flex: 1, padding: 16, justifyContent: 'center' },
    propertyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
    propertyPrice: { fontSize: 14, fontWeight: '500' },
    section: { marginHorizontal: 16, marginBottom: 16, padding: 20, borderRadius: 16 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    sectionTitle: { fontSize: 17, fontWeight: '600', flex: 1 },
    optionalLabel: { fontSize: 13, fontStyle: 'italic' },
    priceInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 2,
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    currencySymbol: { fontSize: 28, fontWeight: '700', marginRight: 8 },
    priceInput: { flex: 1, fontSize: 28, fontWeight: '700' },
    currencyLabel: { fontSize: 14, fontWeight: '600' },
    priceComparison: { marginTop: 12 },
    comparisonBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' },
    comparisonText: { fontSize: 13, fontWeight: '500' },
    messageInput: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
        fontSize: 15,
        minHeight: 120,
    },
    messageHint: { marginTop: 12, fontSize: 13, lineHeight: 20 },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 12,
    },
    infoText: { flex: 1, fontSize: 13, lineHeight: 20 },
    bottomActions: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        borderTopWidth: 1,
    },
    submitButton: { borderRadius: 14, overflow: 'hidden' },
    submitGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 10,
    },
    submitText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
