// app/auth/reset-password.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { normalize, normalizeFont } from '../../lib/normalize';
import { supabase } from '../../lib/supabase';

export default function ResetPasswordScreen() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [hydrating, setHydrating] = useState(true);

  // ✅ Capturar tokens de la URL del deep link y establecer sesión
  useEffect(() => {
    const hydrateSession = async () => {
      try {
        console.log('🔐 Intentando hidratar sesión desde deep link...');

        // Obtener la URL inicial (cuando la app se abre desde deep link)
        const initialUrl = await Linking.getInitialURL();
        console.log('📱 URL inicial:', initialUrl);

        if (initialUrl) {
          await handleUrl(initialUrl);
        } else {
          // Si no hay URL inicial, verificar si ya hay sesión
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log('✅ Sesión existente encontrada');
            setSessionReady(true);
          } else {
            console.log('⚠️ No hay sesión ni URL de reset');
            Alert.alert(
              'Enlace expirado',
              'El enlace de recuperación ha expirado. Solicita uno nuevo.',
              [{ text: 'OK', onPress: () => router.replace('/auth/forgot-password') }]
            );
          }
        }
      } catch (error) {
        console.error('❌ Error hidratando sesión:', error);
        Alert.alert('Error', 'No se pudo procesar el enlace de recuperación');
        router.replace('/auth/login');
      } finally {
        setHydrating(false);
      }
    };

    hydrateSession();

    // ✅ Listener para URLs mientras la app está abierta
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('📱 URL recibida mientras app abierta:', url);
      handleUrl(url);
    });

    return () => subscription.remove();
  }, []);

  const handleUrl = async (url: string) => {
    try {
      console.log('🔍 Procesando URL:', url);

      // Extraer el fragmento hash (#access_token=...&refresh_token=...)
      const hashIndex = url.indexOf('#');
      if (hashIndex === -1) {
        console.log('⚠️ No hay fragmento hash en la URL');
        return;
      }

      const hashParams = url.substring(hashIndex + 1);
      const params = new URLSearchParams(hashParams);

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      console.log('🔐 Tipo de token:', type);
      console.log('🎟️ Access token presente:', !!accessToken);
      console.log('🎟️ Refresh token presente:', !!refreshToken);

      if (accessToken && refreshToken) {
        // ✅ Establecer la sesión con los tokens del deep link
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('❌ Error estableciendo sesión:', error);
          throw error;
        }

        console.log('✅ Sesión establecida correctamente');
        setSessionReady(true);
      } else {
        console.log('⚠️ Tokens no encontrados en URL');
      }
    } catch (error) {
      console.error('❌ Error procesando URL:', error);
      Alert.alert('Error', 'El enlace de recuperación es inválido o ha expirado');
      router.replace('/auth/forgot-password');
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Por favor completa ambos campos');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      Alert.alert(
        '¡Contraseña actualizada!',
        'Tu contraseña ha sido cambiada exitosamente',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/auth/login'),
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Error actualizando contraseña:', error);
      Alert.alert('Error', error.message || 'No se pudo actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Mostrar loading mientras se hidrata la sesión
  if (hydrating) {
    return (
      <LinearGradient colors={['#1a1a2e', '#0f0f1e']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <ActivityIndicator size="large" color="#2C5F7C" />
            <Text style={styles.loadingText}>Verificando enlace...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ✅ Si no hay sesión lista, mostrar error
  if (!sessionReady) {
    return (
      <LinearGradient colors={['#1a1a2e', '#0f0f1e']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
            <Text style={styles.errorTitle}>Enlace expirado</Text>
            <Text style={styles.subtitle}>
              El enlace de recuperación ha expirado o es inválido.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.replace('/auth/forgot-password')}
            >
              <Text style={styles.buttonText}>Solicitar nuevo enlace</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a1a2e', '#0f0f1e']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="key-outline" size={64} color="#2C5F7C" />
          </View>

          <Text style={styles.title}>Nueva Contraseña</Text>
          <Text style={styles.subtitle}>
            Ingresa tu nueva contraseña
          </Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nueva contraseña"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholderTextColor="#999"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirmar contraseña"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                placeholderTextColor="#999"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleUpdatePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Actualizar contraseña</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: normalize(30),
  },
  loadingText: {
    marginTop: normalize(20),
    fontSize: normalizeFont(16),
    color: '#fff',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: normalizeFont(24),
    fontWeight: 'bold',
    color: '#EF4444',
    textAlign: 'center',
    marginTop: normalize(20),
    marginBottom: normalize(10),
  },
  iconContainer: {
    width: normalize(120),
    height: normalize(120),
    borderRadius: normalize(60),
    backgroundColor: 'rgba(44, 95, 124, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: normalize(30),
  },
  title: {
    fontSize: normalizeFont(28),
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: normalize(10),
  },
  subtitle: {
    fontSize: normalizeFont(16),
    color: '#ccc',
    textAlign: 'center',
    lineHeight: normalizeFont(24),
    marginBottom: normalize(40),
  },
  form: {
    gap: normalize(20),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: normalize(12),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  inputIcon: {
    paddingLeft: normalize(15),
  },
  input: {
    flex: 1,
    height: normalize(55),
    paddingHorizontal: normalize(15),
    fontSize: normalizeFont(16),
    color: '#fff',
  },
  eyeButton: {
    paddingRight: normalize(15),
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C5F7C',
    height: normalize(55),
    borderRadius: normalize(12),
    gap: normalize(10),
  },
  buttonDisabled: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#fff',
    fontSize: normalizeFont(16),
    fontWeight: '600',
  },
});
