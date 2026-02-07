# SQL Final - Función de Destacados SIN Duplicados

Ejecuta esto en Supabase SQL Editor:

```sql
-- Eliminar la función anterior
DROP FUNCTION IF EXISTS get_featured_properties CASCADE;

-- Crear función que evita propiedades duplicadas
CREATE OR REPLACE FUNCTION get_featured_properties()
RETURNS TABLE (
  id BIGINT,
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
DECLARE
  used_ids BIGINT[] := ARRAY[]::BIGINT[];
  fav_id BIGINT;
  book_id BIGINT;
  view_id BIGINT;
BEGIN
  -- 1. Obtener propiedad con más favoritos
  SELECT p.id INTO fav_id
  FROM properties p
  LEFT JOIN property_favorites pf ON p.id = pf.property_id
  GROUP BY p.id
  ORDER BY COUNT(pf.id) DESC, p.rating DESC NULLS LAST
  LIMIT 1;
  
  IF fav_id IS NOT NULL THEN
    used_ids := used_ids || fav_id;
    RETURN QUERY
    SELECT p.id::BIGINT, p.title, p.location, p.city, p.price, p.rating, p.images, 
           p.bedrooms, p.max_guests, 'Favorito de la comunidad'::TEXT,
           COALESCE((SELECT COUNT(*) FROM property_favorites WHERE property_id = p.id), 0)::BIGINT
    FROM properties p WHERE p.id = fav_id;
  END IF;
  
  -- 2. Obtener propiedad con más reservas (diferente a la anterior)
  SELECT p.id INTO book_id
  FROM properties p
  LEFT JOIN bookings b ON p.id = b.property_id 
    AND b.created_at >= NOW() - INTERVAL '30 days'
  WHERE NOT (p.id = ANY(used_ids))
  GROUP BY p.id
  ORDER BY COUNT(b.id) DESC, p.rating DESC NULLS LAST
  LIMIT 1;
  
  IF book_id IS NOT NULL THEN
    used_ids := used_ids || book_id;
    RETURN QUERY
    SELECT p.id::BIGINT, p.title, p.location, p.city, p.price, p.rating, p.images, 
           p.bedrooms, p.max_guests, 'Tendencia del mes'::TEXT,
           COALESCE((SELECT COUNT(*) FROM bookings WHERE property_id = p.id AND created_at >= NOW() - INTERVAL '30 days'), 0)::BIGINT
    FROM properties p WHERE p.id = book_id;
  END IF;
  
  -- 3. Obtener propiedad con más vistas (diferente a las anteriores)
  SELECT p.id INTO view_id
  FROM properties p
  LEFT JOIN property_views pv ON p.id = pv.property_id 
    AND pv.viewed_at >= NOW() - INTERVAL '24 hours'
  WHERE NOT (p.id = ANY(used_ids))
  GROUP BY p.id
  ORDER BY COUNT(pv.id) DESC, p.rating DESC NULLS LAST
  LIMIT 1;
  
  IF view_id IS NOT NULL THEN
    used_ids := used_ids || view_id;
    RETURN QUERY
    SELECT p.id::BIGINT, p.title, p.location, p.city, p.price, p.rating, p.images, 
           p.bedrooms, p.max_guests, 'Popular ahora'::TEXT,
           COALESCE((SELECT COUNT(*) FROM property_views WHERE property_id = p.id AND viewed_at >= NOW() - INTERVAL '24 hours'), 0)::BIGINT
    FROM properties p WHERE p.id = view_id;
  END IF;
  
  -- 4. Completar con mejor rating si faltan destacados
  IF array_length(used_ids, 1) < 3 OR used_ids IS NULL THEN
    RETURN QUERY
    SELECT p.id::BIGINT, p.title, p.location, p.city, p.price, p.rating, p.images, 
           p.bedrooms, p.max_guests, 'Mejor valorado'::TEXT,
           COALESCE(p.review_count, 0)::BIGINT
    FROM properties p
    WHERE NOT (p.id = ANY(used_ids))
    ORDER BY p.rating DESC NULLS LAST
    LIMIT (3 - COALESCE(array_length(used_ids, 1), 0));
  END IF;
  
END;
$$;

-- Probar
SELECT * FROM get_featured_properties();
```
