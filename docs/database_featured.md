# SQL Corregido para Tablas de Destacados

Ejecuta este SQL en Supabase Dashboard > SQL Editor.

## IMPORTANTE: Primero elimina y recrea las tablas

```sql
-- ================================================================
-- PASO 1: Eliminar tablas existentes (si existen)
-- ================================================================
DROP TABLE IF EXISTS property_favorites CASCADE;
DROP TABLE IF EXISTS property_views CASCADE;
DROP FUNCTION IF EXISTS get_featured_properties CASCADE;

-- ================================================================
-- PASO 2: Crear tabla property_favorites
-- ================================================================
CREATE TABLE property_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(property_id, user_id)
);

-- Índices
CREATE INDEX idx_favorites_property ON property_favorites(property_id);
CREATE INDEX idx_favorites_user ON property_favorites(user_id);

-- RLS
ALTER TABLE property_favorites ENABLE ROW LEVEL SECURITY;

-- Políticas (permitir todo para usuarios autenticados)
CREATE POLICY "Allow all for authenticated users" ON property_favorites
  FOR ALL USING (auth.role() = 'authenticated');

-- ================================================================
-- PASO 3: Crear tabla property_views (SIN session_id)
-- ================================================================
CREATE TABLE property_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP DEFAULT NOW()
);

-- Índice
CREATE INDEX idx_views_property_time ON property_views(property_id, viewed_at);

-- RLS
ALTER TABLE property_views ENABLE ROW LEVEL SECURITY;

-- Políticas (permitir inserciones para todos)
CREATE POLICY "Allow insert for all" ON property_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select for authenticated" ON property_views FOR SELECT USING (auth.role() = 'authenticated');

-- ================================================================
-- PASO 4: Función para obtener destacados
-- ================================================================
CREATE OR REPLACE FUNCTION get_featured_properties()
RETURNS TABLE (
  id INTEGER,
  title TEXT,
  location TEXT,
  city TEXT,
  price NUMERIC,
  rating NUMERIC,
  images TEXT[],
  bedrooms INTEGER,
  max_guests INTEGER,
  featured_reason TEXT,
  featured_value BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- Propiedad con más favoritos
  most_favorited AS (
    SELECT 
      p.id, p.title, p.location, p.city, p.price, p.rating, p.images, 
      p.bedrooms, p.max_guests,
      'Favorito de la comunidad'::TEXT as featured_reason,
      COALESCE(COUNT(pf.id), 0) as featured_value,
      1 as priority
    FROM properties p
    LEFT JOIN property_favorites pf ON p.id = pf.property_id
    GROUP BY p.id
    ORDER BY COUNT(pf.id) DESC, p.rating DESC
    LIMIT 1
  ),
  -- Propiedad con más reservas del mes
  most_booked AS (
    SELECT 
      p.id, p.title, p.location, p.city, p.price, p.rating, p.images, 
      p.bedrooms, p.max_guests,
      'Tendencia del mes'::TEXT as featured_reason,
      COALESCE(COUNT(b.id), 0) as featured_value,
      2 as priority
    FROM properties p
    LEFT JOIN bookings b ON p.id = b.property_id 
      AND b.created_at >= NOW() - INTERVAL '30 days'
      AND b.status IN ('confirmed', 'completed', 'pending')
    WHERE p.id NOT IN (SELECT mf.id FROM most_favorited mf)
    GROUP BY p.id
    ORDER BY COUNT(b.id) DESC, p.rating DESC
    LIMIT 1
  ),
  -- Propiedad con más vistas en 24h
  most_viewed AS (
    SELECT 
      p.id, p.title, p.location, p.city, p.price, p.rating, p.images, 
      p.bedrooms, p.max_guests,
      'Popular ahora'::TEXT as featured_reason,
      COALESCE(COUNT(pv.id), 0) as featured_value,
      3 as priority
    FROM properties p
    LEFT JOIN property_views pv ON p.id = pv.property_id 
      AND pv.viewed_at >= NOW() - INTERVAL '24 hours'
    WHERE p.id NOT IN (SELECT mf.id FROM most_favorited mf)
      AND p.id NOT IN (SELECT mb.id FROM most_booked mb)
    GROUP BY p.id
    ORDER BY COUNT(pv.id) DESC, p.rating DESC
    LIMIT 1
  ),
  -- Fallback: mejores ratings
  fallback AS (
    SELECT 
      p.id, p.title, p.location, p.city, p.price, p.rating, p.images, 
      p.bedrooms, p.max_guests,
      'Mejor valorado'::TEXT as featured_reason,
      COALESCE(p.review_count, 0)::BIGINT as featured_value,
      4 as priority
    FROM properties p
    WHERE p.id NOT IN (SELECT mf.id FROM most_favorited mf)
      AND p.id NOT IN (SELECT mb.id FROM most_booked mb)
      AND p.id NOT IN (SELECT mv.id FROM most_viewed mv)
    ORDER BY p.rating DESC NULLS LAST
    LIMIT 3
  )
  
  SELECT f.id, f.title, f.location, f.city, f.price, f.rating, f.images, 
         f.bedrooms, f.max_guests, f.featured_reason, f.featured_value
  FROM (
    SELECT * FROM most_favorited
    UNION ALL
    SELECT * FROM most_booked
    UNION ALL
    SELECT * FROM most_viewed
    UNION ALL
    SELECT * FROM fallback
  ) f
  ORDER BY f.priority
  LIMIT 3;
END;
$$;

-- ================================================================
-- PASO 5: Verificar
-- ================================================================
-- Probar que las tablas existen
SELECT 'property_favorites' as tabla, COUNT(*) as registros FROM property_favorites
UNION ALL
SELECT 'property_views' as tabla, COUNT(*) as registros FROM property_views;

-- Probar la función
SELECT * FROM get_featured_properties();
```

## Verificar después de ejecutar

1. Las tablas `property_favorites` y `property_views` deben existir
2. La función `get_featured_properties()` debe retornar 3 propiedades
3. Al marcar favoritos en la app, deben aparecer en `property_favorites`
4. Al abrir detalles, deben aparecer en `property_views`
