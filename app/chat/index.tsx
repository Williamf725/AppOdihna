// app/chat/index.tsx
// Lista de Conversaciones / Inbox

import { useAuth } from '@/hooks/useAuth';
import {
    Conversation,
    getConversations,
    subscribeToConversations
} from '@/lib/chatService';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
        border: '#E0E0E0',
        gold: '#C9B896',
        success: '#10B981',
    },
    dark: {
        background: '#050505',
        cardBackground: '#121212',
        text: '#F0F0F0',
        textSecondary: '#999999',
        accent: '#6B7B8A',
        border: '#333333',
        gold: '#C9B896',
        success: '#10B981',
    },
};

export default function ConversationsListScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? Colors.dark : Colors.light;
    const { user } = useAuth();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Cargar conversaciones al enfocar la pantalla
    useFocusEffect(
        useCallback(() => {
            if (user?.id) {
                loadConversations();
            }
        }, [user?.id])
    );

    // Suscripción a actualizaciones
    useEffect(() => {
        if (user?.id) {
            const unsubscribe = subscribeToConversations(user.id, (updatedConv) => {
                setConversations((prev) => {
                    const index = prev.findIndex((c) => c.id === updatedConv.id);
                    if (index >= 0) {
                        const updated = [...prev];
                        updated[index] = { ...updated[index], ...updatedConv };
                        return updated.sort((a, b) =>
                            new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
                        );
                    }
                    return [updatedConv, ...prev];
                });
            });
            return unsubscribe;
        }
    }, [user?.id]);

    const loadConversations = async () => {
        try {
            const data = await getConversations(user!.id);
            setConversations(data);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadConversations();
    };

    const navigateToChat = (conversationId: string) => {
        router.push({
            pathname: '/chat/[conversationId]',
            params: { conversationId },
        });
    };

    const renderConversation = ({ item }: { item: Conversation }) => {
        // Determinar el otro participante
        const isUserTheAgent = user?.id === item.agent_id;
        const otherParticipant = isUserTheAgent ? item.user : item.agent;

        return (
            <TouchableOpacity
                style={[styles.conversationCard, { backgroundColor: colors.cardBackground }]}
                onPress={() => navigateToChat(item.id)}
                activeOpacity={0.7}
            >
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                    {otherParticipant?.avatar_url ? (
                        <Image source={{ uri: otherParticipant.avatar_url }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.accent }]}>
                            <Text style={styles.avatarInitial}>
                                {otherParticipant?.full_name?.charAt(0) || '?'}
                            </Text>
                        </View>
                    )}
                    {/* Badge de tipo (Comprador/Agente) */}
                    <View style={[styles.roleBadge, { backgroundColor: isUserTheAgent ? colors.gold : colors.success }]}>
                        <Ionicons
                            name={isUserTheAgent ? 'person' : 'business'}
                            size={10}
                            color="#fff"
                        />
                    </View>
                </View>

                {/* Info */}
                <View style={styles.conversationInfo}>
                    <View style={styles.nameRow}>
                        <Text style={[styles.participantName, { color: colors.text }]} numberOfLines={1}>
                            {otherParticipant?.full_name || 'Usuario'}
                        </Text>
                        <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                            {formatRelativeTime(item.last_message_at)}
                        </Text>
                    </View>

                    <Text style={[styles.propertyTitle, { color: colors.accent }]} numberOfLines={1}>
                        🏠 {item.property_title}
                    </Text>

                    <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.last_message_preview || 'Sin mensajes'}
                    </Text>
                </View>

                {/* Chevron */}
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
        );
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
                <Text style={[styles.headerTitle, { color: colors.text }]}>Mensajes</Text>
                <View style={{ width: 44 }} />
            </View>

            {/* Lista de conversaciones */}
            {conversations.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="chatbubbles-outline" size={64} color={colors.accent} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                        No hay conversaciones
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                        Envía una propuesta a una propiedad para iniciar un chat con el agente
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item.id}
                    renderItem={renderConversation}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.accent}
                        />
                    }
                    ItemSeparatorComponent={() => (
                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                    )}
                />
            )}
        </SafeAreaView>
    );
}

// ================================
// UTILIDADES
// ================================
const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
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
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
    headerTitle: { fontSize: 20, fontWeight: '700' },

    // List
    listContent: { paddingVertical: 8 },
    separator: { height: 1, marginLeft: 80 },

    // Conversation Card
    conversationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    avatarContainer: { position: 'relative' },
    avatar: { width: 52, height: 52, borderRadius: 26 },
    avatarPlaceholder: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
    avatarInitial: { fontSize: 20, fontWeight: '600', color: '#fff' },
    roleBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },

    conversationInfo: { flex: 1, marginLeft: 14 },
    nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    participantName: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: 8 },
    timestamp: { fontSize: 12 },
    propertyTitle: { fontSize: 13, marginBottom: 4 },
    lastMessage: { fontSize: 14 },

    // Empty State
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 },
    emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
