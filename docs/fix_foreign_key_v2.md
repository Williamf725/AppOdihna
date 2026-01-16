# Corregir Relación (Solución Definitiva)

Como ya tienes políticas de seguridad creadas, debemos quitarlas temporalmente para poder modificar la columna.

Ejecuta este bloque completo en Supabase:

```sql
-- 1. Eliminar temporalmente las políticas que bloquean el cambio
DROP POLICY IF EXISTS "Public properties are viewable by everyone" ON properties;
DROP POLICY IF EXISTS "Users can insert their own properties" ON properties;
DROP POLICY IF EXISTS "Users can update own properties" ON properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON properties;
-- Eliminar también posibles nombres anteriores de políticas
DROP POLICY IF EXISTS "Hosts can insert own properties" ON properties; 
DROP POLICY IF EXISTS "Hosts can update own properties" ON properties;

-- 2. Asegurar tipo de dato y agregar Foreign Key
-- Primero intentamos convertir a UUID si no lo es (esto fallará si ya es UUID pero no pasa nada)
DO $$ 
BEGIN 
    ALTER TABLE properties ALTER COLUMN owner_id TYPE UUID USING owner_id::UUID;
EXCEPTION 
    WHEN OTHERS THEN NULL; -- Ignorar si ya es UUID
END $$;

-- Agregar la relación FK si no existe
ALTER TABLE properties
DROP CONSTRAINT IF EXISTS properties_owner_id_fkey;

ALTER TABLE properties
ADD CONSTRAINT properties_owner_id_fkey
FOREIGN KEY (owner_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- 3. Volver a crear las políticas de seguridad (RLS)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public properties are viewable by everyone" 
ON properties FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own properties" 
ON properties FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own properties" 
ON properties FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own properties" 
ON properties FOR DELETE 
USING (auth.uid() = owner_id);

-- 4. Recargar esquema
NOTIFY pgrst, 'reload schema';
```
