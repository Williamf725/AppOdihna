# Corregir Relación de Base de Datos

El error indica que falta la relación "foreign key" entre la tabla `properties` y `profiles`.

Ejecuta este SQL en Supabase para arreglarlo:

```sql
-- 1. Asegurar que la columna existe y es del tipo correcto
ALTER TABLE properties 
ALTER COLUMN owner_id TYPE UUID USING owner_id::UUID;

-- 2. Agregar la restricción de clave foránea (Foreign Key)
ALTER TABLE properties
ADD CONSTRAINT properties_owner_id_fkey
FOREIGN KEY (owner_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- 3. Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);

-- 4. Actualizar el caché de esquema de Supabase
NOTIFY pgrst, 'reload schema';
```

## ¿Por qué pasó esto?
Es probable que la columna `owner_id` se haya creado manualmente sin marcar la casilla de "Foreign Key" o que la tabla se haya creado antes que la tabla `profiles`. Este script conecta explícitamente ambas tablas.
