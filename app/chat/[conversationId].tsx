// app/chat/[conversationId].tsx
// Pantalla de Chat con soporte para propuestas y negociación

import { useAuth } from '@/hooks/useAuth';
import {
    acceptProposal,
    CounterOfferPayload,
    formatChatPrice,
    getConversationById,
    getMessages,
    markMessagesAsRead,
    Message,
    ProposalPayload,
    rejectProposal,
    sendCounterOffer,
    sendTextMessage,
    subscribeToMessages,
} from '@/lib/chatService';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/formatters';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// ================================
// COLORES
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
        ownBubble: '#1e3c72',
        otherBubble: '#E8E8E8',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        gold: '#C9B896',
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
        ownBubble: '#1e3c72',
        otherBubble: '#2A2A2A',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        gold: '#C9B896',
    },
};

export default function ChatScreen() {
    const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? Colors.dark : Colors.light;
    const { user } = useAuth();

    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [inputText, setInputText] = useState('');
    const [conversationInfo, setConversationInfo] = useState<any>(null);

    // Modal de contraoferta
    const [showCounterModal, setShowCounterModal] = useState(false);
    const [counterPrice, setCounterPrice] = useState('');
    const [counterMessage, setCounterMessage] = useState('');
    const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);

    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (conversationId) {
            loadConversationAndMessages();
            const unsubscribe = subscribeToMessages(conversationId, handleNewMessage);
            return unsubscribe;
        }
    }, [conversationId]);

    const loadConversationAndMessages = async () => {
        try {
            const [convData, msgsData] = await Promise.all([
                getConversationById(conversationId),
                getMessages(conversationId),
            ]);
            setConversationInfo(convData);
            setMessages(msgsData);

            // Marcar mensajes como leídos
            if (user?.id) {
                markMessagesAsRead(conversationId, user.id);
            }
        } catch (error) {
            console.error('Error loading chat:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNewMessage = (newMessage: Message) => {
        setMessages((prev) => [...prev, newMessage]);
        // Scroll to bottom
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        // Marcar como leído si no es del usuario actual
        if (newMessage.sender_id !== user?.id) {
            markMessagesAsRead(conversationId, user?.id || '');
        }
    };

    const handleSendText = async () => {
        if (!inputText.trim() || !user || sending) return;

        if (Platform.OS !== 'web') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        setSending(true);
        const text = inputText.trim();
        setInputText('');

        try {
            await sendTextMessage(conversationId, user.id, text);
        } catch (error) {
            console.error('Error sending message:', error);
            setInputText(text); // Restore on error
            Alert.alert('Error', 'No se pudo enviar el mensaje');
        } finally {
            setSending(false);
        }
    };

    const handleCounterOffer = async () => {
        if (!counterPrice || !selectedProposalId || !user) return;

        setSending(true);
        try {
            await sendCounterOffer(
                conversationId,
                user.id,
                parseCurrencyInput(counterPrice),
                selectedProposalId,
                counterMessage.trim() || undefined
            );
            setShowCounterModal(false);
            setCounterPrice('');
            setCounterMessage('');
            setSelectedProposalId(null);
        } catch (error) {
            console.error('Error sending counter offer:', error);
            Alert.alert('Error', 'No se pudo enviar la contraoferta');
        } finally {
            setSending(false);
        }
    };

    const handleAcceptProposal = async (messageId: string) => {
        if (!user || sending) return;

        Alert.alert(
            'Confirmar Aceptación',
            '¿Estás seguro de que deseas aceptar esta propuesta? Esta acción notificará a la otra parte.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Aceptar',
                    style: 'default',
                    onPress: async () => {
                        setSending(true);
                        try {
                            await acceptProposal(conversationId, user.id, messageId);
                        } catch (error) {
                            console.error('Error accepting proposal:', error);
                            Alert.alert('Error', 'No se pudo aceptar la propuesta');
                        } finally {
                            setSending(false);
                        }
                    }
                }
            ]
        );
    };

    const handleRejectProposal = async (messageId: string) => {
        if (!user || sending) return;

        Alert.alert(
            'Rechazar Propuesta',
            '¿Estás seguro de que deseas rechazar esta propuesta?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Rechazar',
                    style: 'destructive',
                    onPress: async () => {
                        setSending(true);
                        try {
                            await rejectProposal(conversationId, user.id, messageId);
                        } catch (error) {
                            console.error('Error rejecting proposal:', error);
                            Alert.alert('Error', 'No se pudo rechazar la propuesta');
                        } finally {
                            setSending(false);
                        }
                    }
                }
            ]
        );
    };

    const openCounterModal = (proposalId: string) => {
        setSelectedProposalId(proposalId);
        setShowCounterModal(true);
    };

    // Determinar el otro participante
    const otherParticipant = conversationInfo
        ? (user?.id === conversationInfo.user_id ? conversationInfo.agent : conversationInfo.user)
        : null;

    // ================================
    // RENDERIZADO DE MENSAJES
    // ================================
    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        const isOwnMessage = item.sender_id === user?.id;
        const showAvatar = index === 0 || messages[index - 1]?.sender_id !== item.sender_id;

        // Mensaje de texto
        if (item.type === 'text') {
            return (
                <View style={[styles.messageRow, isOwnMessage && styles.ownMessageRow]}>
                    {!isOwnMessage && showAvatar && (
                        <View style={styles.avatarContainer}>
                            {item.sender?.avatar_url ? (
                                <Image source={{ uri: item.sender.avatar_url }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.accent }]}>
                                    <Text style={styles.avatarInitial}>
                                        {item.sender?.full_name?.charAt(0) || '?'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                    {!isOwnMessage && !showAvatar && <View style={styles.avatarSpacer} />}

                    <View style={[
                        styles.messageBubble,
                        isOwnMessage
                            ? { backgroundColor: colors.ownBubble }
                            : { backgroundColor: colors.otherBubble }
                    ]}>
                        <Text style={[
                            styles.messageText,
                            { color: isOwnMessage ? '#fff' : colors.text }
                        ]}>
                            {item.content}
                        </Text>
                        <Text style={[styles.messageTime, { color: isOwnMessage ? 'rgba(255,255,255,0.6)' : colors.textSecondary }]}>
                            {formatTime(item.created_at)}
                        </Text>
                    </View>
                </View>
            );
        }

        // Card de Propuesta
        if (item.type === 'proposal' && item.payload) {
            const payload = item.payload as ProposalPayload;
            return (
                <View style={[styles.messageRow, isOwnMessage && styles.ownMessageRow]}>
                    <View style={[styles.proposalCard, { backgroundColor: colors.cardBackground, borderColor: colors.gold }]}>
                        <View style={styles.proposalHeader}>
                            <View style={styles.proposalLabelContainer}>
                                <Ionicons name="cash" size={18} color={colors.gold} />
                                <Text style={[styles.proposalLabel, { color: colors.gold }]}>
                                    Propuesta de Compra
                                </Text>
                            </View>
                            <StatusBadge status={payload.status} colors={colors} />
                        </View>

                        {payload.property_image && (
                            <Image
                                source={{ uri: payload.property_image }}
                                style={styles.propertyThumb}
                                contentFit="cover"
                            />
                        )}

                        <Text style={[styles.propertyTitle, { color: colors.text }]} numberOfLines={2}>
                            {payload.property_title}
                        </Text>

                        <Text style={[styles.priceText, { color: colors.success }]}>
                            {formatChatPrice(payload.offered_price)}
                        </Text>

                        {payload.message && (
                            <Text style={[styles.proposalMessage, { color: colors.textSecondary }]}>
                                "{payload.message}"
                            </Text>
                        )}

                        {/* Botones de acción para el agente */}
                        {!isOwnMessage && payload.status === 'pending' && (
                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: colors.success }]}
                                    onPress={() => handleAcceptProposal(item.id)}
                                >
                                    <Ionicons name="checkmark" size={18} color="#fff" />
                                    <Text style={styles.actionButtonText}>Aceptar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: colors.warning }]}
                                    onPress={() => openCounterModal(item.id)}
                                >
                                    <Ionicons name="swap-horizontal" size={18} color="#fff" />
                                    <Text style={styles.actionButtonText}>Contraoferta</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: colors.error }]}
                                    onPress={() => handleRejectProposal(item.id)}
                                >
                                    <Ionicons name="close" size={18} color="#fff" />
                                    <Text style={styles.actionButtonText}>Rechazar</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <Text style={[styles.messageTime, { color: colors.textSecondary, marginTop: 8 }]}>
                            {formatTime(item.created_at)}
                        </Text>
                    </View>
                </View>
            );
        }

        // Card de Contraoferta
        if (item.type === 'counter_offer' && item.payload) {
            const payload = item.payload as CounterOfferPayload;
            return (
                <View style={[styles.messageRow, isOwnMessage && styles.ownMessageRow]}>
                    <View style={[styles.proposalCard, { backgroundColor: colors.cardBackground, borderColor: colors.warning }]}>
                        <View style={styles.proposalHeader}>
                            <View style={styles.proposalLabelContainer}>
                                <Ionicons name="swap-horizontal" size={18} color={colors.warning} />
                                <Text style={[styles.proposalLabel, { color: colors.warning }]}>
                                    Contraoferta
                                </Text>
                            </View>
                            <StatusBadge status={payload.status} colors={colors} />
                        </View>

                        <Text style={[styles.priceText, { color: colors.warning }]}>
                            {formatChatPrice(payload.counter_price)}
                        </Text>

                        {item.content && (
                            <Text style={[styles.proposalMessage, { color: colors.textSecondary }]}>
                                "{item.content}"
                            </Text>
                        )}

                        {/* Botones de acción para Contraoferta */}
                        {!isOwnMessage && payload.status === 'pending' && (
                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: colors.success }]}
                                    onPress={() => handleAcceptProposal(item.id)}
                                >
                                    <Ionicons name="checkmark" size={18} color="#fff" />
                                    <Text style={styles.actionButtonText}>Aceptar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: colors.warning }]}
                                    onPress={() => openCounterModal(item.id)}
                                >
                                    <Ionicons name="swap-horizontal" size={18} color="#fff" />
                                    <Text style={styles.actionButtonText}>Contraoferta</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: colors.error }]}
                                    onPress={() => handleRejectProposal(item.id)}
                                >
                                    <Ionicons name="close" size={18} color="#fff" />
                                    <Text style={styles.actionButtonText}>Rechazar</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <Text style={[styles.messageTime, { color: colors.textSecondary, marginTop: 8 }]}>
                            {formatTime(item.created_at)}
                        </Text>
                    </View>
                </View>
            );
        }

        // Mensajes de sistema (aceptación, rechazo)
        if (item.type === 'acceptance' || item.type === 'rejection') {
            const isAcceptance = item.type === 'acceptance';
            return (
                <View style={styles.systemMessageContainer}>
                    <View style={[
                        styles.systemMessage,
                        { backgroundColor: isAcceptance ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
                    ]}>
                        <Ionicons
                            name={isAcceptance ? 'checkmark-circle' : 'close-circle'}
                            size={20}
                            color={isAcceptance ? colors.success : colors.error}
                        />
                        <Text style={[styles.systemMessageText, { color: isAcceptance ? colors.success : colors.error }]}>
                            {item.content}
                        </Text>
                    </View>
                </View>
            );
        }

        return null;
    };

    // ================================
    // LOADING STATE
    // ================================
    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>

                <View style={styles.headerInfo}>
                    {otherParticipant?.avatar_url ? (
                        <Image source={{ uri: otherParticipant.avatar_url }} style={styles.headerAvatar} />
                    ) : (
                        <View style={[styles.headerAvatarPlaceholder, { backgroundColor: colors.accent }]}>
                            <Text style={styles.headerAvatarInitial}>
                                {otherParticipant?.full_name?.charAt(0) || '?'}
                            </Text>
                        </View>
                    )}
                    <View style={styles.headerTextContainer}>
                        <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
                            {otherParticipant?.full_name || 'Chat'}
                        </Text>
                        <Text style={[styles.headerProperty, { color: colors.textSecondary }]} numberOfLines={1}>
                            {conversationInfo?.property_title || ''}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.moreButton}>
                    <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
                </TouchableOpacity>
            </View>

            {/* Messages List */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.chatContainer}
                keyboardVerticalOffset={0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messagesList}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                />

                {/* Input Area */}
                <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
                    <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground }]}>
                        <TextInput
                            style={[styles.textInput, { color: colors.text }]}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="Escribe un mensaje..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            maxLength={1000}
                        />
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            { backgroundColor: inputText.trim() ? colors.accent : colors.border }
                        ]}
                        onPress={handleSendText}
                        disabled={!inputText.trim() || sending}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="send" size={20} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Modal de Contraoferta */}
            <Modal
                visible={showCounterModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCounterModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                Enviar Contraoferta
                            </Text>
                            <TouchableOpacity onPress={() => setShowCounterModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.priceInputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <Text style={[styles.currencySymbol, { color: colors.accent }]}>$</Text>
                            <TextInput
                                style={[styles.priceInput, { color: colors.text }]}
                                value={counterPrice}
                                onChangeText={(text) => setCounterPrice(formatCurrencyInput(text))}
                                placeholder="0"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="numeric"
                            />
                            <Text style={[styles.currencyLabel, { color: colors.textSecondary }]}>COP</Text>
                        </View>

                        <TextInput
                            style={[styles.counterMessageInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                            value={counterMessage}
                            onChangeText={setCounterMessage}
                            placeholder="Mensaje opcional..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={3}
                        />

                        <TouchableOpacity
                            style={[styles.submitCounterButton, { opacity: counterPrice ? 1 : 0.5 }]}
                            onPress={handleCounterOffer}
                            disabled={!counterPrice || sending}
                        >
                            <LinearGradient
                                colors={[colors.warning, '#D97706']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.submitCounterGradient}
                            >
                                {sending ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="swap-horizontal" size={20} color="#fff" />
                                        <Text style={styles.submitCounterText}>Enviar Contraoferta</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ================================
// COMPONENTES AUXILIARES
// ================================

const StatusBadge = ({ status, colors }: { status: string; colors: any }) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
        pending: { bg: 'rgba(245, 158, 11, 0.15)', text: colors.warning, label: 'Pendiente' },
        accepted: { bg: 'rgba(16, 185, 129, 0.15)', text: colors.success, label: 'Aceptada' },
        rejected: { bg: 'rgba(239, 68, 68, 0.15)', text: colors.error, label: 'Rechazada' },
        countered: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', label: 'Contraofertada' },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
        <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusText, { color: config.text }]}>{config.label}</Text>
        </View>
    );
};

const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

// ================================
// ESTILOS
// ================================
const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: { padding: 8 },
    headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
    headerAvatar: { width: 40, height: 40, borderRadius: 20 },
    headerAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    headerAvatarInitial: { fontSize: 16, fontWeight: '600', color: '#fff' },
    headerTextContainer: { marginLeft: 12, flex: 1 },
    headerName: { fontSize: 16, fontWeight: '600' },
    headerProperty: { fontSize: 12, marginTop: 2 },
    moreButton: { padding: 8 },

    // Chat
    chatContainer: { flex: 1 },
    messagesList: { padding: 16, paddingBottom: 8 },

    // Message Row
    messageRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end' },
    ownMessageRow: { justifyContent: 'flex-end' },
    avatarContainer: { marginRight: 8 },
    avatar: { width: 32, height: 32, borderRadius: 16 },
    avatarPlaceholder: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    avatarInitial: { fontSize: 12, fontWeight: '600', color: '#fff' },
    avatarSpacer: { width: 40 },

    // Message Bubble
    messageBubble: { maxWidth: width * 0.7, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
    messageText: { fontSize: 15, lineHeight: 20 },
    messageTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },

    // Proposal Card
    proposalCard: {
        maxWidth: width * 0.85,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    proposalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    proposalLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    proposalLabel: { fontSize: 14, fontWeight: '600' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 11, fontWeight: '600' },
    propertyThumb: { width: '100%', height: 120, borderRadius: 10, marginBottom: 12 },
    propertyTitle: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
    priceText: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
    proposalMessage: { fontSize: 13, fontStyle: 'italic', lineHeight: 18 },

    // Action Buttons
    actionButtons: { flexDirection: 'row', gap: 8, marginTop: 12 },
    actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 4 },
    actionButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },

    // System Message
    systemMessageContainer: { alignItems: 'center', marginVertical: 12 },
    systemMessage: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 8 },
    systemMessageText: { fontSize: 13, fontWeight: '500' },

    // Input
    inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12, borderTopWidth: 1 },
    inputWrapper: { flex: 1, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, marginRight: 10, maxHeight: 100 },
    textInput: { fontSize: 15, maxHeight: 80 },
    sendButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '700' },
    priceInputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 2, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16 },
    currencySymbol: { fontSize: 24, fontWeight: '700', marginRight: 8 },
    priceInput: { flex: 1, fontSize: 24, fontWeight: '700' },
    currencyLabel: { fontSize: 14, fontWeight: '600' },
    counterMessageInput: { borderRadius: 12, borderWidth: 1, padding: 16, fontSize: 15, minHeight: 80, textAlignVertical: 'top', marginBottom: 20 },
    submitCounterButton: { borderRadius: 14, overflow: 'hidden' },
    submitCounterGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
    submitCounterText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
