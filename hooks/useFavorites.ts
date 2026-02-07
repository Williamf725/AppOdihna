// hooks/useFavorites.ts
import { syncFavoriteToServer } from '@/lib/featuredService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';

const FAVORITES_KEY = '@odihna_favorites';

export function useFavorites() {
    const [favorites, setFavorites] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    // Cargar favoritos al iniciar
    useEffect(() => {
        loadFavorites();
    }, []);

    const loadFavorites = async () => {
        try {
            const stored = await AsyncStorage.getItem(FAVORITES_KEY);
            if (stored) {
                setFavorites(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Error loading favorites:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveFavorites = async (newFavorites: string[]) => {
        try {
            await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
        } catch (error) {
            console.error('Error saving favorites:', error);
        }
    };

    const addFavorite = useCallback(async (propertyId: string) => {
        console.log('💛 Adding favorite:', propertyId);
        const newFavorites = [...favorites, propertyId];
        setFavorites(newFavorites);
        await saveFavorites(newFavorites);

        // Sincronizar con el servidor para estadísticas globales
        console.log('👤 User ID for sync:', user?.id);
        if (user?.id) {
            console.log('📤 Calling syncFavoriteToServer...');
            await syncFavoriteToServer(propertyId, user.id, true);
        } else {
            console.log('⚠️ No user logged in, favorite only saved locally');
        }
    }, [favorites, user]);

    const removeFavorite = useCallback(async (propertyId: string) => {
        console.log('💔 Removing favorite:', propertyId);
        const newFavorites = favorites.filter(id => id !== propertyId);
        setFavorites(newFavorites);
        await saveFavorites(newFavorites);

        // Sincronizar con el servidor para estadísticas globales
        if (user?.id) {
            console.log('📤 Calling syncFavoriteToServer (remove)...');
            await syncFavoriteToServer(propertyId, user.id, false);
        } else {
            console.log('⚠️ No user logged in, favorite only removed locally');
        }
    }, [favorites, user]);

    const toggleFavorite = useCallback(async (propertyId: string) => {
        console.log('🔄 Toggle favorite:', propertyId, 'currently:', favorites.includes(propertyId));
        if (favorites.includes(propertyId)) {
            await removeFavorite(propertyId);
            return false;
        } else {
            await addFavorite(propertyId);
            return true;
        }
    }, [favorites, addFavorite, removeFavorite]);

    const isFavorite = useCallback((propertyId: string) => {
        return favorites.includes(propertyId);
    }, [favorites]);

    return {
        favorites,
        loading,
        addFavorite,
        removeFavorite,
        toggleFavorite,
        isFavorite,
        refreshFavorites: loadFavorites,
    };
}
