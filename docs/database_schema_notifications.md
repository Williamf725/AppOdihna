# Configuración de Base de Datos para Notificaciones

## 1. Crear tabla de notificaciones

Ejecuta este SQL en el SQL Editor de Supabase:

```sql
-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Habilitar RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Política: usuarios solo ven sus propias notificaciones
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Política: el sistema puede insertar notificaciones
CREATE POLICY "Service can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Política: usuarios pueden marcar como leídas sus notificaciones
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);
```

## 2. Agregar campo push_token a profiles

```sql
-- Agregar columna para push token (si no existe)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS push_token TEXT;
```

## 3. Verificar que todo está correcto

```sql
-- Verificar tabla creada
SELECT * FROM notifications LIMIT 1;

-- Verificar columna agregada
SELECT push_token FROM profiles LIMIT 1;
```
