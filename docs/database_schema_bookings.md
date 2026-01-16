# Esquema de Base de Datos: Tabla `bookings`

## SQL para crear la tabla

```sql
-- Crear tabla bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relaciones
  guest_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Fechas
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  
  -- Huéspedes
  adults INTEGER NOT NULL DEFAULT 2,
  children INTEGER NOT NULL DEFAULT 0,
  total_guests INTEGER NOT NULL,
  
  -- Precio
  price_per_night DECIMAL(10, 2) NOT NULL,
  number_of_nights INTEGER NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  service_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  taxes DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10, 2) NOT NULL,
  
  -- Estado
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Valores posibles: 'pending', 'confirmed', 'cancelled', 'completed', 'expired'
  
  -- Información adicional
  guest_email VARCHAR(255),
  guest_phone VARCHAR(50),
  special_requests TEXT,
  
  -- Confirmación
  confirmation_code VARCHAR(20) UNIQUE NOT NULL,
  
  -- Cancelación
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES profiles(id),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_dates CHECK (check_out_date > check_in_date),
  CONSTRAINT valid_guests CHECK (total_guests > 0),
  CONSTRAINT valid_price CHECK (total_price >= 0)
);

-- Índices para optimizar búsquedas
CREATE INDEX idx_bookings_guest ON bookings(guest_id);
CREATE INDEX idx_bookings_property ON bookings(property_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX idx_bookings_confirmation ON bookings(confirmation_code);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Políticas de Seguridad (RLS)

```sql
-- Habilitar RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Política: Los huéspedes pueden ver sus propias reservas
CREATE POLICY "Users can view their own bookings as guests"
  ON bookings
  FOR SELECT
  USING (auth.uid() = guest_id);

-- Política: Los anfitriones pueden ver reservas de sus propiedades
CREATE POLICY "Hosts can view bookings for their properties"
  ON bookings
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT owner_id FROM properties WHERE id = property_id
    )
  );

-- Política: Los huéspedes pueden crear reservas
CREATE POLICY "Users can create bookings"
  ON bookings
  FOR INSERT
  WITH CHECK (auth.uid() = guest_id);

-- Política: Los huéspedes pueden cancelar sus reservas
CREATE POLICY "Users can update their own bookings"
  ON bookings
  FOR UPDATE
  USING (auth.uid() = guest_id OR auth.uid() IN (
    SELECT owner_id FROM properties WHERE id = property_id
  ));
```

## Instrucciones para Implementar

1. **Acceder al Editor SQL de Supabase:**
   - Ir a https://supabase.com/dashboard
   - Seleccionar el proyecto
   - Ir a "SQL Editor" en el menú lateral

2. **Ejecutar el script SQL:**
   - Copiar todo el código SQL de arriba
   - Pegarlo en el editor
   - Hacer clic en "Run"

3. **Verificar la tabla:**
   - Ir a "Table Editor"
   - Buscar la tabla `bookings`
   - Verificar que tenga todas las columnas
   - Verificar que los índices estén creados

4. **Probar las políticas:**
   - Las políticas de seguridad deben permitir:
     - Huéspedes: ver y crear sus reservas
     - Anfitriones: ver reservas en sus propiedades
     - Ambos: actualizar (para cancelar/confirmar)

## Notas Importantes

- El `confirmation_code` debe ser único para cada reserva
- El `status` tiene 5 posibles valores
- Las fechas deben validarse: check_out > check_in
- Los precios se guardan en formato decimal(10,2)
- Se usa UUID para IDs de bookings (más seguro)
- Los timestamps se actualizan automáticamente
