// lib/chatService.ts
// Servicio de Chat y Negociación para Odihna

import { supabase } from './supabase';

// ================================
// TIPOS
// ================================

export interface ProposalPayload {
    offered_price: number;
    property_id: string;
    property_title: string;
    property_image?: string;
    message?: string;
    status: 'pending' | 'accepted' | 'rejected' | 'countered';
}

export interface CounterOfferPayload {
    counter_price: number;
    original_proposal_id: string;
    status: 'pending' | 'accepted' | 'rejected';
}

export type MessageType = 'text' | 'proposal' | 'counter_offer' | 'acceptance' | 'rejection' | 'system';

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string | null;
    type: MessageType;
    payload: ProposalPayload | CounterOfferPayload | null;
    is_read: boolean;
    read_at: string | null;
    created_at: string;
    // Joined data
    sender?: {
        id: string;
        full_name: string;
        avatar_url?: string;
    };
}

export interface Conversation {
    id: string;
    user_id: string;
    agent_id: string;
    property_id: string;
    property_title: string;
    property_image?: string;
    last_message_at: string;
    last_message_preview?: string;
    status: 'active' | 'archived' | 'closed';
    created_at: string;
    updated_at: string;
    // Joined data
    user?: {
        id: string;
        full_name: string;
        avatar_url?: string;
    };
    agent?: {
        id: string;
        full_name: string;
        avatar_url?: string;
    };
    unread_count?: number;
}

// ================================
// CONVERSACIONES
// ================================

/**
 * Obtener o crear conversación entre usuario y agente para una propiedad
 */
export async function getOrCreateConversation(
    userId: string,
    agentId: string,
    propertyId: string,
    propertyTitle: string,
    propertyImage?: string
): Promise<Conversation | null> {
    // 1. Buscar conversación existente
    const { data: existing, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .eq('agent_id', agentId)
        .eq('property_id', propertyId)
        .single();

    if (existing && !fetchError) {
        return existing as Conversation;
    }

    // 2. Crear nueva conversación
    const { data: newConv, error: insertError } = await supabase
        .from('conversations')
        .insert({
            user_id: userId,
            agent_id: agentId,
            property_id: propertyId,
            property_title: propertyTitle,
            property_image: propertyImage || null,
        })
        .select()
        .single();

    if (insertError) {
        console.error('Error creating conversation:', insertError);
        return null;
    }

    return newConv as Conversation;
}

/**
 * Obtener todas las conversaciones del usuario
 */
export async function getConversations(userId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
        .from('conversations')
        .select(`
            *,
            user:profiles!conversations_user_id_fkey(id, full_name, avatar_url),
            agent:profiles!conversations_agent_id_fkey(id, full_name, avatar_url)
        `)
        .or(`user_id.eq.${userId},agent_id.eq.${userId}`)
        .order('last_message_at', { ascending: false });

    if (error) {
        console.error('Error fetching conversations:', error);
        return [];
    }

    return (data || []) as Conversation[];
}

/**
 * Obtener una conversación por ID
 */
export async function getConversationById(conversationId: string): Promise<Conversation | null> {
    const { data, error } = await supabase
        .from('conversations')
        .select(`
            *,
            user:profiles!conversations_user_id_fkey(id, full_name, avatar_url),
            agent:profiles!conversations_agent_id_fkey(id, full_name, avatar_url)
        `)
        .eq('id', conversationId)
        .single();

    if (error) {
        console.error('Error fetching conversation:', error);
        return null;
    }

    return data as Conversation;
}

// ================================
// MENSAJES
// ================================

/**
 * Obtener mensajes de una conversación
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
        .from('messages')
        .select(`
            *,
            sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching messages:', error);
        return [];
    }

    return (data || []) as Message[];
}

/**
 * Enviar mensaje de texto
 */
export async function sendTextMessage(
    conversationId: string,
    senderId: string,
    content: string
): Promise<Message | null> {
    const { data, error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            sender_id: senderId,
            type: 'text',
            content: content.trim(),
        })
        .select()
        .single();

    if (error) {
        console.error('Error sending text message:', error);
        return null;
    }

    return data as Message;
}

/**
 * Enviar propuesta de compra
 */
export async function sendProposal(
    conversationId: string,
    senderId: string,
    payload: Omit<ProposalPayload, 'status'>
): Promise<Message | null> {
    const { data, error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            sender_id: senderId,
            type: 'proposal',
            content: payload.message || null,
            payload: {
                ...payload,
                status: 'pending',
            },
        })
        .select()
        .single();

    if (error) {
        console.error('Error sending proposal:', error);
        return null;
    }

    return data as Message;
}

/**
 * Enviar contraoferta
 */
export async function sendCounterOffer(
    conversationId: string,
    senderId: string,
    counterPrice: number,
    originalProposalId: string,
    message?: string
): Promise<Message | null> {
    try {
        // 1. Obtener el mensaje original (propuesta o contraoferta anterior)
        const { data: originalMessage, error: fetchError } = await supabase
            .from('messages')
            .select('*')
            .eq('id', originalProposalId)
            .single();

        if (fetchError || !originalMessage) {
            console.error('Error fetching original message for counter:', fetchError);
            return null;
        }

        // 2. Actualizar el estado de la propuesta original a 'countered'
        const updatedPayload = {
            ...originalMessage.payload,
            status: 'countered'
        };

        const { error: updateError } = await supabase
            .from('messages')
            .update({ payload: updatedPayload })
            .eq('id', originalProposalId);

        if (updateError) {
            console.error('Error updating original proposal status:', updateError);
            // Non-blocking error, we still try to send the counter offer
        }

        // 3. Insertar el mensaje de contraoferta
        const { data, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: senderId,
                type: 'counter_offer',
                content: message || null,
                payload: {
                    counter_price: counterPrice,
                    original_proposal_id: originalProposalId,
                    status: 'pending',
                },
            })
            .select()
            .single();

        if (error) {
            console.error('Error sending counter offer:', error);
            return null;
        }

        return data as Message;
    } catch (e) {
        console.error('Exception in sendCounterOffer:', e);
        return null;
    }
}

/**
 * Aceptar propuesta o contraoferta
 */
export async function acceptProposal(
    conversationId: string,
    senderId: string,
    originalMessageId: string
): Promise<Message | null> {
    try {
        // 1. Obtener el mensaje original
        const { data: originalMessage, error: fetchError } = await supabase
            .from('messages')
            .select('*')
            .eq('id', originalMessageId)
            .single();

        if (fetchError || !originalMessage) {
            console.error('Error fetching original message:', fetchError);
            return null;
        }

        // 2. Actualizar el estado en el payload
        const updatedPayload = {
            ...originalMessage.payload,
            status: 'accepted'
        };

        const { error: updateError } = await supabase
            .from('messages')
            .update({ payload: updatedPayload })
            .eq('id', originalMessageId);

        if (updateError) {
            console.error('Error updating proposal status:', updateError);
            return null;
        }

        // 3. Enviar mensaje de aceptación
        const { data, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: senderId,
                type: 'acceptance',
                content: '¡Propuesta aceptada! 🎉',
                payload: { original_message_id: originalMessageId },
            })
            .select()
            .single();

        if (error) {
            console.error('Error acceptance message:', error);
            return null;
        }

        return data as Message;
    } catch (e) {
        console.error('Exception in acceptProposal:', e);
        return null;
    }
}

/**
 * Rechazar propuesta o contraoferta
 */
export async function rejectProposal(
    conversationId: string,
    senderId: string,
    originalMessageId: string,
    reason?: string
): Promise<Message | null> {
    try {
        // 1. Obtener el mensaje original
        const { data: originalMessage, error: fetchError } = await supabase
            .from('messages')
            .select('*')
            .eq('id', originalMessageId)
            .single();

        if (fetchError || !originalMessage) {
            console.error('Error fetching original message:', fetchError);
            return null;
        }

        // 2. Actualizar el estado en el payload
        const updatedPayload = {
            ...originalMessage.payload,
            status: 'rejected'
        };

        const { error: updateError } = await supabase
            .from('messages')
            .update({ payload: updatedPayload })
            .eq('id', originalMessageId);

        if (updateError) {
            console.error('Error updating proposal status:', updateError);
            return null;
        }

        // 3. Enviar mensaje de rechazo
        const { data, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: senderId,
                type: 'rejection',
                content: reason || 'Propuesta rechazada',
                payload: { original_message_id: originalMessageId },
            })
            .select()
            .single();

        if (error) {
            console.error('Error rejecting proposal:', error);
            return null;
        }

        return data as Message;
    } catch (e) {
        console.error('Exception in rejectProposal:', e);
        return null;
    }
}

/**
 * Marcar mensajes como leídos
 */
export async function markMessagesAsRead(
    conversationId: string,
    userId: string
): Promise<void> {
    await supabase
        .from('messages')
        .update({
            is_read: true,
            read_at: new Date().toISOString()
        })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .eq('is_read', false);
}

// ================================
// REALTIME SUBSCRIPTIONS
// ================================

/**
 * Suscripción a nuevos mensajes de una conversación
 */
export function subscribeToMessages(
    conversationId: string,
    onNewMessage: (message: Message) => void
): () => void {
    const channel = supabase
        .channel(`messages:${conversationId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`,
            },
            async (payload) => {
                // Obtener mensaje con datos del sender
                const { data } = await supabase
                    .from('messages')
                    .select(`
                        *,
                        sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
                    `)
                    .eq('id', payload.new.id)
                    .single();

                if (data) {
                    onNewMessage(data as Message);
                }
            }
        )
        .subscribe();

    // Retornar función de cleanup
    return () => {
        supabase.removeChannel(channel);
    };
}

/**
 * Suscripción a actualizaciones de conversaciones
 */
export function subscribeToConversations(
    userId: string,
    onUpdate: (conversation: Conversation) => void
): () => void {
    const channel = supabase
        .channel(`conversations:${userId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'conversations',
            },
            async (payload) => {
                if (payload.new) {
                    const conv = payload.new as Conversation;
                    if (conv.user_id === userId || conv.agent_id === userId) {
                        onUpdate(conv);
                    }
                }
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

// ================================
// UTILIDADES
// ================================

/**
 * Obtener conteo de mensajes no leídos
 */
export async function getUnreadMessagesCount(
    userId: string
): Promise<number> {
    // Obtener conversaciones del usuario
    const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .or(`user_id.eq.${userId},agent_id.eq.${userId}`);

    if (!conversations || conversations.length === 0) return 0;

    const conversationIds = conversations.map(c => c.id);

    // Contar mensajes no leídos
    const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .neq('sender_id', userId)
        .eq('is_read', false);

    if (error) {
        console.error('Error counting unread messages:', error);
        return 0;
    }

    return count || 0;
}

/**
 * Formatear precio para mostrar
 */
export function formatChatPrice(price: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(price);
}
