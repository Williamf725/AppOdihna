// app/auth/forgot-password.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { normalize, normalizeFont } from '../../lib/normalize';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu correo electrónico');
      return;
    }

    setLoading(true);
    try {
      // Cambiar esta línea:
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'odihna-living://auth/reset-password', // ✅ Cambio aquí
      });


      if (error) throw error;

      Alert.alert(
        '¡Correo enviado!',
        'Te hemos enviado un enlace de recuperación a tu correo electrónico.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/auth/login'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo enviar el correo de recuperación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#1a1a2e', '#0f0f1e']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed-outline" size={64} color="#2C5F7C" />
          </View>

          <Text style={styles.title}>Recuperar Contraseña</Text>
          <Text style={styles.subtitle}>
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
          </Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#999"
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Enviar enlace</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={styles.backToLoginText}>Volver al inicio de sesión</Text>
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
  backButton: {
    position: 'absolute',
    top: normalize(50),
    left: normalize(20),
    zIndex: 10,
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: normalize(30),
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
  backToLoginButton: {
    alignItems: 'center',
    marginTop: normalize(10),
  },
  backToLoginText: {
    color: '#2C5F7C',
    fontSize: normalizeFont(14),
    fontWeight: '600',
  },
});
