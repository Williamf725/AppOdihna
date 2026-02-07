// constants/realEstateData.ts
// Mock data for Real Estate mode - structured for future Supabase/Cloudinary integration

// ================================
// TYPES
// ================================
export type Zona = 'norte' | 'sur' | 'oriente' | 'occidente' | 'centro';
export type Estrato = 1 | 2 | 3 | 4 | 5 | 6;

export interface RealEstateAgent {
    id: string;
    name: string;
    avatar: string;
    phone: string;
    whatsapp: string;
    email: string;
    verified: boolean;
    propertiesSold: number;
    rating: number;
}

export interface SaleProperty {
    id: string;
    title: string;
    images: string[];
    videoUrl?: string;            // For video autoplay
    price: number;                // Sale price in COP
    pricePerMeter?: number;       // Price per m²
    location: string;
    city: string;
    zona: Zona;
    barrio: string;
    estrato: Estrato;
    metraje: number;              // Total area in m²
    metrajeConstruido?: number;   // Built area in m²
    bedrooms: number;
    bathrooms: number;
    garages: number;
    yearBuilt?: number;
    propertyType: 'casa' | 'apartamento' | 'lote' | 'local' | 'oficina' | 'finca';
    description: string;
    features: string[];
    agent: RealEstateAgent;
    isNew?: boolean;
    isFeatured?: boolean;
    createdAt: string;
}

// ================================
// MOCK AGENTS
// ================================
const mockAgents: RealEstateAgent[] = [
    {
        id: 'agent-1',
        name: 'Carlos Mendoza',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
        phone: '+57 310 555 1234',
        whatsapp: '573105551234',
        email: 'carlos.mendoza@odihna.co',
        verified: true,
        propertiesSold: 47,
        rating: 4.9,
    },
    {
        id: 'agent-2',
        name: 'Laura Gómez',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
        phone: '+57 315 555 5678',
        whatsapp: '573155555678',
        email: 'laura.gomez@odihna.co',
        verified: true,
        propertiesSold: 62,
        rating: 4.8,
    },
    {
        id: 'agent-3',
        name: 'Andrés Valencia',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
        phone: '+57 320 555 9012',
        whatsapp: '573205559012',
        email: 'andres.valencia@odihna.co',
        verified: true,
        propertiesSold: 35,
        rating: 4.7,
    },
];

// ================================
// MOCK PROPERTIES FOR SALE
// ================================
// Properties are now fetched from Supabase - this array is kept for type reference only
export const mockSaleProperties: SaleProperty[] = [];

// ================================
// FILTER OPTIONS
// ================================
export const zonaOptions: { value: Zona; label: string }[] = [
    { value: 'norte', label: 'Norte' },
    { value: 'sur', label: 'Sur' },
    { value: 'oriente', label: 'Oriente' },
    { value: 'occidente', label: 'Occidente' },
    { value: 'centro', label: 'Centro' },
];

export const estratoOptions: Estrato[] = [1, 2, 3, 4, 5, 6];

export const propertyTypeOptions: { value: SaleProperty['propertyType']; label: string; icon: string }[] = [
    { value: 'casa', label: 'Casa', icon: 'home-outline' },
    { value: 'apartamento', label: 'Apartamento', icon: 'business-outline' },
    { value: 'lote', label: 'Lote', icon: 'map-outline' },
    { value: 'local', label: 'Local', icon: 'storefront-outline' },
    { value: 'oficina', label: 'Oficina', icon: 'briefcase-outline' },
    { value: 'finca', label: 'Finca', icon: 'leaf-outline' },
];

// ================================
// UTILITY FUNCTIONS
// ================================
export function formatCurrency(amount: number): string {
    if (amount >= 1000000000) {
        return `$${(amount / 1000000000).toFixed(1)}B`;
    }
    if (amount >= 1000000) {
        return `$${(amount / 1000000).toFixed(0)}M`;
    }
    return `$${amount.toLocaleString('es-CO')}`;
}

export function formatFullCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export const MIN_PRICE = 100000000;   // 100M
export const MAX_PRICE = 5000000000;  // 5B
export const PRICE_STEP = 50000000;   // 50M
