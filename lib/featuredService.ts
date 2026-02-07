// lib/featuredService.ts
import { supabase } from './supabase';

// Tipos para propiedades destacadas
export interface FeaturedProperty {
    id: number;
    title: string;
    location: string;
    city: string;
    price: number;
    rating: number;
    images: string[];
    bedrooms: number;
    max_guests: number;
    featured_reason: string;
    featured_value: number;
}

export type FeaturedReason =
    | 'Favorito de la comunidad'
    | 'Tendencia del mes'
    | 'Popular ahora'
    | 'Mejor valorado';

// Configuración de badges por razón
export const FEATURED_BADGES: Record<string, { icon: string; color: string; gradient: string[] }> = {
    'Favorito de la comunidad': {
        icon: 'heart',
        color: '#FFD700',
        gradient: ['#FFD700', '#FFA500'],
    },
    'Tendencia del mes': {
        icon: 'flame',
        color: '#FF6B35',
        gradient: ['#FF6B35', '#FF4500'],
    },
    'Popular ahora': {
        icon: 'eye',
        color: '#00CED1',
        gradient: ['#00CED1', '#20B2AA'],
    },
    'Mejor valorado': {
        icon: 'star',
        color: '#9B59B6',
        gradient: ['#9B59B6', '#8E44AD'],
    },
};

/**
 * Obtiene las 3 propiedades destacadas usando la función de Supabase
 */
export async function getFeaturedProperties(): Promise<FeaturedProperty[]> {
    try {
        // Intentar usar la función RPC primero
        const { data: rpcData, error: rpcError } = await supabase
            .rpc('get_featured_properties');

        if (!rpcError && rpcData && rpcData.length > 0) {
            return rpcData.map((item: any) => ({
                id: item.id,
                title: item.title,
                location: item.location,
                city: item.city,
                price: parseFloat(item.price) || 0,
                rating: parseFloat(item.rating) || 0,
                images: item.images || [],
                bedrooms: item.bedrooms || 1,
                max_guests: item.max_guests || 2,
                featured_reason: item.featured_reason,
                featured_value: parseInt(item.featured_value) || 0,
            }));
        }

        // Fallback: Si la función no existe o falla, usar query simple
        console.log('Using fallback for featured properties');
        return await getFeaturedPropertiesFallback();

    } catch (error) {
        console.error('Error fetching featured properties:', error);
        return await getFeaturedPropertiesFallback();
    }
}

/**
 * Fallback: Obtiene destacados usando solo datos básicos
 * Usa rating y fecha de creación si no hay tablas de tracking
 */
async function getFeaturedPropertiesFallback(): Promise<FeaturedProperty[]> {
    try {
        // Obtener las 3 propiedades con mejor rating
        const { data: properties, error } = await supabase
            .from('properties')
            .select('*')
            .order('rating', { ascending: false })
            .order('review_count', { ascending: false })
            .limit(6); // Obtenemos más para poder asignar diferentes razones

        if (error || !properties || properties.length === 0) {
            return [];
        }

        // Asignar razones diferentes a cada una
        const reasons = ['Mejor valorado', 'Tendencia del mes', 'Popular ahora'];

        return properties.slice(0, 3).map((prop: any, index: number) => ({
            id: prop.id,
            title: prop.title,
            location: prop.location,
            city: prop.city,
            price: prop.price || 0,
            rating: prop.rating || 0,
            images: prop.images || [],
            bedrooms: prop.bedrooms || 1,
            max_guests: prop.max_guests || 2,
            featured_reason: reasons[index] || 'Destacado',
            featured_value: prop.review_count || 0,
        }));

    } catch (error) {
        console.error('Error in fallback featured properties:', error);
        return [];
    }
}

/**
 * Registra una visualización de propiedad
 */
export async function trackPropertyView(propertyId: number, userId?: string): Promise<void> {
    console.log('👁️ Tracking view for property:', propertyId, 'user:', userId || 'anonymous');
    try {
        const { data, error } = await supabase
            .from('property_views')
            .insert({
                property_id: propertyId,
                user_id: userId || null,
            })
            .select();

        if (error) {
            console.log('❌ View tracking error:', error.message, error.code, error.details);
        } else {
            console.log('✅ View tracked successfully:', data);
        }
    } catch (error) {
        console.log('❌ View tracking failed:', error);
    }
}

/**
 * Sincroniza un favorito con el servidor
 */
export async function syncFavoriteToServer(
    propertyId: string | number,
    userId: string,
    isFavorite: boolean
): Promise<boolean> {
    try {
        const propId = typeof propertyId === 'string' ? parseInt(propertyId) : propertyId;

        console.log(`🔄 Syncing favorite: property=${propId}, user=${userId}, isFavorite=${isFavorite}`);

        if (isFavorite) {
            // Agregar favorito usando insert simple (más compatible)
            const { error } = await supabase
                .from('property_favorites')
                .insert({
                    property_id: propId,
                    user_id: userId,
                });

            if (error) {
                // Ignorar error de duplicado (ya es favorito)
                if (error.code === '23505') {
                    console.log('ℹ️ Favorite already exists');
                    return true;
                }
                console.log('❌ Favorite sync error:', error.message, error.code);
                return false;
            }
            console.log('✅ Favorite added to server');
        } else {
            // Quitar favorito
            const { error } = await supabase
                .from('property_favorites')
                .delete()
                .eq('property_id', propId)
                .eq('user_id', userId);

            if (error) {
                console.log('❌ Favorite unsync error:', error.message);
                return false;
            }
            console.log('✅ Favorite removed from server');
        }

        return true;
    } catch (error) {
        console.log('❌ Favorite sync failed:', error);
        return false;
    }
}

/**
 * Obtiene el conteo de favoritos globales para una propiedad
 */
export async function getPropertyFavoritesCount(propertyId: number): Promise<number> {
    try {
        const { count, error } = await supabase
            .from('property_favorites')
            .select('*', { count: 'exact', head: true })
            .eq('property_id', propertyId);

        if (error) {
            return 0;
        }

        return count || 0;
    } catch (error) {
        return 0;
    }
}

/**
 * Genera o recupera un session ID para tracking anónimo
 */
async function getSessionId(): Promise<string> {
    // Para simplificar, usamos timestamp + random
    // En producción podrías usar AsyncStorage para persistir
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
