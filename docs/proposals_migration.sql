-- SQL Migration: Proposals and Notifications Tables
-- Run this in Supabase SQL Editor

-- ================================
-- PROPOSALS TABLE
-- ================================
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS proposals CASCADE;

CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_property_id UUID NOT NULL REFERENCES sale_properties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Proposal details
    offered_price BIGINT NOT NULL,
    message TEXT,
    
    -- Property snapshot (for reference)
    property_title TEXT NOT NULL,
    property_image TEXT,
    
    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'expired')),
    counter_price BIGINT,
    counter_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proposals_user ON proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_agent ON proposals(agent_id);
CREATE INDEX IF NOT EXISTS idx_proposals_property ON proposals(sale_property_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);

-- ================================
-- NOTIFICATIONS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Notification content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('proposal_received', 'proposal_sent', 'proposal_accepted', 'proposal_rejected', 'proposal_countered', 'reservation', 'system')),
    
    -- Related entities
    proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
    property_id UUID,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- ================================
-- ROW LEVEL SECURITY (RLS)
-- ================================

-- Proposals RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Users can view proposals they created or received (as agent)
CREATE POLICY "Users can view own proposals" ON proposals
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = agent_id);

-- Users can create proposals
CREATE POLICY "Users can create proposals" ON proposals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Agents can update proposals (respond)
CREATE POLICY "Agents can update proposals" ON proposals
    FOR UPDATE USING (auth.uid() = agent_id);

-- Users can delete their own pending proposals
CREATE POLICY "Users can delete pending proposals" ON proposals
    FOR DELETE USING (auth.uid() = user_id AND status = 'pending');

-- Notifications RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- System can create notifications (using service role)
CREATE POLICY "Allow insert notifications" ON notifications
    FOR INSERT WITH CHECK (TRUE);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- ================================
-- UPDATED_AT TRIGGERS
-- ================================

-- Proposals updated_at trigger
CREATE OR REPLACE FUNCTION update_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_proposals_updated_at
    BEFORE UPDATE ON proposals
    FOR EACH ROW
    EXECUTE FUNCTION update_proposals_updated_at();
