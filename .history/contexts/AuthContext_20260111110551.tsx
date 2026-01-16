// contexts/AuthContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import React, { createContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';

// ✅ INTERFAZ ACTUALIZADA CON TODOS LOS CAMPOS
interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: 'guest' | 'host';
  email: string;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
  // Nuevos campos
  date_of_birth?: string | null;
  bio?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  id_verified?: boolean;
  email_verified?: boolean;
  phone_verified?: boolean;
  response_rate?: number;
  response_time?: string | null;
  total_reviews?: number;
  average_rating?: number;
  languages?: string[];
  work?: string | null;
  school?: string | null;
  joined_year?: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: any) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>; // ✅ NUEVO
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth event:', event);

        if (event === 'SIGNED_IN' && newSession) {
          setSession(newSession);
          setUser(newSession.user);
          await AsyncStorage.setItem('supabase-session', JSON.stringify(newSession));
          await loadUserProfile(newSession.user.id);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          await AsyncStorage.removeItem('supabase-session');
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          setSession(newSession);
          await AsyncStorage.setItem('supabase-session', JSON.stringify(newSession));
        }
      }
    );

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
      subscription?.remove();
    };
  }, []);

  const initializeAuth = async () => {
    try {
      setLoading(true);

      const { data: { session: currentSession }, error } = await supabase.auth.getSession();

      if (currentSession && !error) {
        setSession(currentSession);
        setUser(currentSession.user);
        await loadUserProfile(currentSession.user.id);
      } else {
        const storedSession = await AsyncStorage.getItem('supabase-session');
        if (storedSession) {
          try {
            const parsedSession = JSON.parse(storedSession);
            const { data, error: setSessionError } = await supabase.auth.setSession({
              access_token: parsedSession.access_token,
              refresh_token: parsedSession.refresh_token,
            });

            if (data.session && !setSessionError) {
              setSession(data.session);
              setUser(data.session.user);
              await loadUserProfile(data.session.user.id);
            } else {
              await AsyncStorage.removeItem('supabase-session');
            }
          } catch (parseError) {
            console.error('Error parsing stored session:', parseError);
            await AsyncStorage.removeItem('supabase-session');
          }
        }
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      await AsyncStorage.removeItem('supabase-session');
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('📥 Cargando perfil para usuario:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error loading profile:', error);
        
        if (error.code === 'PGRST116') {
          console.log('⚠️ Perfil no encontrado, intentando crear...');
          
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user) {
            const currentYear = new Date().getFullYear();
            
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                email: userData.user.email,
                full_name: userData.user.user_metadata?.fullname || userData.user.user_metadata?.full_name || '',
                phone: userData.user.user_metadata?.phone || '',
                role: userData.user.user_metadata?.role || 'guest',
                avatar_url: null,
                joined_year: currentYear,
                email_verified: false,
                phone_verified: false,
                id_verified: false,
                response_rate: 0,
                total_reviews: 0,
                average_rating: 0,
              });

            if (insertError) {
              console.error('❌ Error creando perfil:', insertError);
              return;
            }

            const { data: newProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();

            setProfile(newProfile as Profile);
            console.log('✅ Perfil creado y cargado:', newProfile);
          }
        }
        return;
      }

      if (data) {
        setProfile(data as Profile);
        console.log('✅ Perfil cargado correctamente:', data);
      } else {
        console.log('⚠️ No se encontró perfil para el usuario');
      }
    } catch (error) {
      console.error('❌ Error en loadUserProfile:', error);
    }
  };

  // ✅ NUEVA FUNCIÓN: Refrescar perfil
  const refreshProfile = async () => {
    if (user?.id) {
      console.log('🔄 Refrescando perfil desde AuthContext...');
      await loadUserProfile(user.id);
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      console.log('📝 Iniciando registro con:', email, userData);

      const { data: { user, session }, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            fullname: userData.fullname,
            phone: userData.phone,
            role: userData.role,
          },
        },
      });

      if (error) {
        console.error('❌ Error en auth.signUp:', error);
        throw error;
      }

      console.log('✅ Usuario creado en auth:', user?.id);

      if (user && !session) {
        console.log('📧 Se requiere confirmación de email');
        return { user, session: null };
      }

      if (user && session) {
        console.log('✅ Usuario registrado y autenticado automáticamente');
        
        await new Promise(resolve => setTimeout(resolve, 1500));

        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!existingProfile) {
          console.log('⚠️ Trigger no ejecutado, creando perfil manualmente...');
          const currentYear = new Date().getFullYear();
          
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              full_name: userData.fullname,
              phone: userData.phone,
              role: userData.role,
              email: email,
              avatar_url: null,
              joined_year: currentYear,
              email_verified: false,
              phone_verified: false,
              id_verified: false,
              response_rate: 0,
              total_reviews: 0,
              average_rating: 0,
            });

          if (profileError) {
            console.error('❌ Error al insertar perfil:', profileError);
            throw profileError;
          }
          console.log('✅ Perfil insertado manualmente');
        } else {
          console.log('✅ Perfil ya existe (creado por trigger)');
        }
      }

      return { user, session };
    } catch (error: any) {
      console.error('❌ Error en registro:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        await AsyncStorage.setItem('supabase-session', JSON.stringify(data.session));
        await loadUserProfile(data.user.id);
      }

      return data;
    } catch (error: any) {
      console.error('Error en login:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('🔓 Iniciando cierre de sesión...');

      setUser(null);
      setProfile(null);
      setSession(null);

      await AsyncStorage.removeItem('supabase-session');

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error cerrando sesión en Supabase:', error);
      }

      console.log('✅ Sesión cerrada correctamente');

      setTimeout(() => {
        router.replace('/auth/login');
      }, 100);

    } catch (error: any) {
      console.error('❌ Error en logout:', error);
      setTimeout(() => {
        router.replace('/auth/login');
      }, 100);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile, // ✅ AGREGADO AQUÍ
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
