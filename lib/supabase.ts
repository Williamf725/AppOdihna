// lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://iiupckzwtodrwamfgrkm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpdXBja3p3dG9kcndhbWZncmttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwODg1MTYsImV4cCI6MjA4MTY2NDUxNn0.Xq1Rr8A1kFBnKF3Jrs1_ErBBLMsnkmE4AxGPrqBo2Ek'; // Reemplaza con tu key

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ✅ Listener para debug
supabase.auth.onAuthStateChange((event, session) => {
  console.log('🔐 Auth event:', event);
  if (event === 'SIGNED_OUT') {
    console.log('✅ Usuario cerró sesión correctamente');
  }
});

// ✅ FUNCIÓN isPropertyOwner CORREGIDA - Acepta number o string
export const isPropertyOwner = async (propertyId: number | string, userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('owner_id')
      .eq('id', propertyId)
      .single();

    if (error) throw error;
    return data.owner_id === userId;
  } catch (error) {
    console.error('Error verificando ownership:', error);
    return false;
  }
};
