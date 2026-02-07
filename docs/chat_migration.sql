-- SQL Migration: Chat and Negotiation System
-- Run this in Supabase SQL Editor

-- ================================
-- CONVERSATIONS TABLE
-- ================================
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Participantes
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Propiedad relacionada
    property_id UUID NOT NULL REFERENCES sale_properties(id) ON DELETE CASCADE,
    property_title TEXT NOT NULL,
    property_image TEXT,
    
    -- Metadatos
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_preview TEXT,
    
    -- Estado
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Evitar duplicados de conversación
    UNIQUE(user_id, agent_id, property_id)
);

-- Índices para conversaciones
CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_agent ON conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_conv_property ON conversations(property_id);
CREATE INDEX IF NOT EXISTS idx_conv_last_msg ON conversations(last_message_at DESC);

-- ================================
-- MESSAGES TABLE
-- ================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Contenido del mensaje
    content TEXT,
    
    -- Tipo de mensaje (clave para renderizado condicional)
    type TEXT NOT NULL DEFAULT 'text' 
        CHECK (type IN ('text', 'proposal', 'counter_offer', 'acceptance', 'rejection', 'system')),
    
    -- Payload JSONB para propuestas/contraofertas
    -- Ejemplo para 'proposal':
    -- {
    --   "offered_price": 450000000,
    --   "property_id": "uuid",
    --   "property_title": "Casa Campestre",
    --   "property_image": "https://...",
    --   "message": "Estoy interesado...",
    --   "status": "pending" | "accepted" | "rejected" | "countered"
    -- }
    payload JSONB,
    
    -- Estado de lectura
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mensajes
CREATE INDEX IF NOT EXISTS idx_msg_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_msg_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_msg_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_msg_type ON messages(type);
CREATE INDEX IF NOT EXISTS idx_msg_unread ON messages(conversation_id, is_read) WHERE is_read = FALSE;

-- ================================
-- ROW LEVEL SECURITY (RLS)
-- ================================

-- Conversations RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations" ON conversations
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = agent_id);

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Participants can update conversations" ON conversations
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = agent_id);

-- Messages RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations c 
            WHERE c.id = messages.conversation_id 
            AND (c.user_id = auth.uid() OR c.agent_id = auth.uid())
        )
    );

CREATE POLICY "Participants can send messages" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM conversations c 
            WHERE c.id = messages.conversation_id 
            AND (c.user_id = auth.uid() OR c.agent_id = auth.uid())
        )
    );

CREATE POLICY "Sender can update own messages" ON messages
    FOR UPDATE USING (auth.uid() = sender_id);

-- ================================
-- TRIGGERS
-- ================================

-- Trigger para actualizar last_message_at en conversación
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET 
        last_message_at = NEW.created_at,
        last_message_preview = CASE 
            WHEN NEW.type = 'text' THEN LEFT(NEW.content, 50)
            WHEN NEW.type = 'proposal' THEN '💰 Nueva propuesta'
            WHEN NEW.type = 'counter_offer' THEN '🔄 Contraoferta'
            WHEN NEW.type = 'acceptance' THEN '✅ Propuesta aceptada'
            WHEN NEW.type = 'rejection' THEN '❌ Propuesta rechazada'
            ELSE 'Nuevo mensaje'
        END,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_last_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Trigger para updated_at en conversaciones
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_conversations_updated_at();

-- ================================
-- HABILITAR REALTIME
-- ================================
-- Ejecutar en SQL Editor para habilitar Realtime en messages:
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
