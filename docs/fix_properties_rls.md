# Políticas de Seguridad (RLS) para Propiedades

Para asegurar que:
1. Todos puedan ver los alojamientos (Huéspedes).
2. Solo los dueños puedan editar/eliminar SUS alojamientos.
3. Los anfitriones autenticados puedan crear nuevos alojamientos.

Ejecuta este SQL en el **SQL Editor** de Supabase:

```sql
-- Habilitar RLS en la tabla properties
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- 1. Política de LECTURA (SELECT)
-- Permitir que CUALQUIERA vea las propiedades (necesario para la app pública)
CREATE POLICY "Public properties are viewable by everyone" 
ON properties FOR SELECT 
USING (true);

-- 2. Política de CREACIÓN (INSERT)
-- Permitir que usuarios autenticados creen propiedades
-- Automáticamente se asignará su ID como owner_id (asegurado por la app, pero validamos aquí)
CREATE POLICY "Users can insert their own properties" 
ON properties FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

-- 3. Política de ACTUALIZACIÓN (UPDATE)
-- Solo el dueño puede editar su propiedad
CREATE POLICY "Users can update own properties" 
ON properties FOR UPDATE 
USING (auth.uid() = owner_id);

-- 4. Política de ELIMINACIÓN (DELETE)
-- Solo el dueño puede eliminar su propiedad
CREATE POLICY "Users can delete own properties" 
ON properties FOR DELETE 
USING (auth.uid() = owner_id);
```

## Corrección de Propiedades Antiguas (Opcional)

Si tienes propiedades antiguas que no aparecen en "Mis Alojamientos" porque no tienen `owner_id`, puedes asignártelas ejecutando esto (reemplaza TU_UUID con tu ID de usuario de Supabase):

```sql
-- UPDATE properties SET owner_id = 'TU_UUID' WHERE owner_id IS NULL;
```
