// app/auth/callback.tsx
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function CallbackScreen() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando tu email...');

  useEffect(() => {
    handleEmailConfirmation();
  }, []);

  const handleEmailConfirmation = async () => {
    try {
      // ✅ Obtener el hash de la URL (contiene el token)
      const hash = window?.location?.hash || '';
      
      if (!hash) {
        throw new Error('No se encontró token de verificación');
      }

      // ✅ Extraer parámetros del hash
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      console.log('📧 Tipo de callback:', type);

      // ✅ Verificar que sea confirmación de email
      if (type !== 'signup' && type !== 'email') {
        throw new Error('Tipo de verificación no válido');
      }

      if (!accessToken || !refreshToken) {
        throw new Error('Tokens de verificación inválidos');
      }

      // ✅ Establecer la sesión con los tokens
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) throw error;

      console.log('✅ Email confirmado exitosamente');
      setStatus('success');
      setMessage('¡Email confirmado! Redirigiendo...');

      // ✅ Redirigir a la app después de 2 segundos
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 2000);

    } catch (error: any) {
      console.error('❌ Error en confirmación:', error);
      setStatus('error');
      setMessage(error.message || 'Error al verificar el email');

      // ✅ Redirigir a login después de 3 segundos
      setTimeout(() => {
        router.replace('/auth/login');
      }, 3000);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color="#2C5F7C" />
            <Text style={styles.text}>{message}</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successText}>{message}</Text>
          </>
        )}

        {status === 'error' && (
          <>
            <Text style={styles.errorIcon}>❌</Text>
            <Text style={styles.errorText}>{message}</Text>
            <Text style={styles.subText}>Redirigiendo a login...</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#02111aff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
