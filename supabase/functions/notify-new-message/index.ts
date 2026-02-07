// Supabase Edge Function: notify-new-message
// Deploy: supabase functions deploy notify-new-message
// Configure Database Webhook: messages table -> INSERT -> notify-new-message

// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MessagePayload {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string | null;
    type: 'text' | 'proposal' | 'counter_offer' | 'acceptance' | 'rejection' | 'system';
    payload: Record<string, any> | null;
    created_at: string;
}

interface WebhookPayload {
    type: 'INSERT';
    table: 'messages';
    record: MessagePayload;
    schema: 'public';
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const webhookPayload: WebhookPayload = await req.json();
        const message = webhookPayload.record;

        console.log('📩 New message received:', message.id, 'Type:', message.type);

        // @ts-ignore
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        // @ts-ignore
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Obtener información de la conversación
        const { data: conversation, error: convError } = await supabase
            .from('conversations')
            .select('user_id, agent_id, property_title')
            .eq('id', message.conversation_id)
            .single();

        if (convError || !conversation) {
            console.error('❌ Conversation not found:', convError);
            return new Response(
                JSON.stringify({ error: 'Conversation not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 2. Determinar el destinatario (el que NO envió el mensaje)
        const recipientId = message.sender_id === conversation.user_id
            ? conversation.agent_id
            : conversation.user_id;

        // 3. Obtener nombre del remitente
        const { data: sender } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', message.sender_id)
            .single();

        const senderName = sender?.full_name || 'Usuario';

        // 4. Obtener push_token del destinatario
        const { data: recipient, error: recipientError } = await supabase
            .from('profiles')
            .select('push_token, full_name')
            .eq('id', recipientId)
            .single();

        if (recipientError || !recipient?.push_token) {
            console.log('⚠️ No push token for recipient:', recipientId);
            return new Response(
                JSON.stringify({ message: 'No push token available' }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 5. Preparar contenido de notificación según tipo de mensaje
        let title = '💬 Nuevo mensaje';
        let body = message.content || 'Tienes un nuevo mensaje';

        switch (message.type) {
            case 'proposal':
                title = '💰 Nueva propuesta recibida';
                const proposalPrice = message.payload?.offered_price;
                body = proposalPrice
                    ? `${senderName} envió una propuesta de $${proposalPrice.toLocaleString('es-CO')} para "${conversation.property_title}"`
                    : `${senderName} envió una propuesta para "${conversation.property_title}"`;
                break;

            case 'counter_offer':
                title = '🔄 Contraoferta recibida';
                const counterPrice = message.payload?.counter_price;
                body = counterPrice
                    ? `${senderName} hace una contraoferta de $${counterPrice.toLocaleString('es-CO')}`
                    : `${senderName} te hizo una contraoferta`;
                break;

            case 'acceptance':
                title = '✅ ¡Propuesta aceptada!';
                body = `${senderName} aceptó tu propuesta para "${conversation.property_title}"`;
                break;

            case 'rejection':
                title = '❌ Propuesta rechazada';
                body = `${senderName} rechazó tu propuesta para "${conversation.property_title}"`;
                break;

            case 'text':
            default:
                title = `💬 ${senderName}`;
                body = message.content || 'Nuevo mensaje';
                break;
        }

        // 6. Enviar notificación push via Expo Push API
        const expoPushUrl = 'https://exp.host/--/api/v2/push/send';

        const pushPayload = {
            to: recipient.push_token,
            title,
            body,
            data: {
                conversationId: message.conversation_id,
                messageId: message.id,
                type: message.type,
                screen: 'chat',
            },
            sound: 'default',
            badge: 1,
            priority: 'high',
            channelId: 'default',
        };

        console.log('📤 Sending push notification:', pushPayload);

        const pushResponse = await fetch(expoPushUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate',
            },
            body: JSON.stringify(pushPayload),
        });

        const pushResult = await pushResponse.json();
        console.log('📱 Push result:', pushResult);

        // Verificar si hubo error en el push
        if (pushResult.data?.[0]?.status === 'error') {
            console.error('❌ Push error:', pushResult.data[0].message);

            // Si el token es inválido, limpiarlo del perfil
            if (pushResult.data[0].details?.error === 'DeviceNotRegistered') {
                await supabase
                    .from('profiles')
                    .update({ push_token: null })
                    .eq('id', recipientId);
                console.log('🗑️ Removed invalid push token for user:', recipientId);
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                recipient: recipientId,
                pushResult
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('❌ Edge function error:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    }
});
