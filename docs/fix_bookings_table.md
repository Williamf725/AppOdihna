# SQL para Corregir la Tabla Bookings

La tabla `bookings` existe pero le faltan columnas. Ejecuta este SQL en Supabase:

## Opción 1: Agregar columnas faltantes (SI YA TIENES DATOS)

```sql
-- Agregar columnas de huéspedes
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS adults INTEGER DEFAULT 2;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS children INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_guests INTEGER DEFAULT 2;

-- Agregar columnas de precio
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS price_per_night DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS number_of_nights INTEGER DEFAULT 1;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_fee DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS taxes DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_price DECIMAL(10, 2) DEFAULT 0;

-- Agregar columnas de estado
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmation_code VARCHAR(20);

-- Agregar columnas de contacto
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(50);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS special_requests TEXT;

-- Agregar columnas de cancelación
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by UUID;

-- Agregar timestamps
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Agregar columnas de fechas si no existen
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_in_date DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_out_date DATE;

-- Agregar relaciones si no existen
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_id UUID;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS property_id INTEGER;
```

## Opción 2: Eliminar y recrear la tabla (SI NO TIENES DATOS)

```sql
-- Eliminar tabla existente
DROP TABLE IF EXISTS bookings CASCADE;

-- Crear tabla completa
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

-- Índices
CREATE INDEX idx_bookings_guest ON bookings(guest_id);
CREATE INDEX idx_bookings_property ON bookings(property_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX idx_bookings_confirmation ON bookings(confirmation_code);

-- Habilitar RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT USING (auth.uid() = guest_id);
CREATE POLICY "Hosts can view property bookings" ON bookings FOR SELECT USING (auth.uid() IN (SELECT owner_id FROM properties WHERE id = property_id));
CREATE POLICY "Users can create bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = guest_id);
CREATE POLICY "Users can update bookings" ON bookings FOR UPDATE USING (auth.uid() = guest_id OR auth.uid() IN (SELECT owner_id FROM properties WHERE id = property_id));
```

## Recomendación

Si **NO tienes datos** en la tabla bookings, usa la **Opción 2** (es más limpia).
Si **tienes datos** que quieres conservar, usa la **Opción 1**.
