import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { normalize, normalizeFont } from '../../lib/normalize';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    try {
      setLoading(true);
      await signIn(email.trim().toLowerCase(), password);
      // No navegar manualmente, el AuthContext lo manejará
      setTimeout(() => router.replace('/(tabs)'), 100);
    } catch (error: any) {
      Alert.alert('Error al iniciar sesión', error.message || 'Verifica tus credenciales');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80' }}
        style={styles.backgroundImage}
        contentFit="cover"
      />
      <LinearGradient colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.75)']} locations={[0, 0.5, 1]} style={styles.overlay}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <View style={styles.header}>
                  <Text style={styles.title}>Bienvenido de nuevo</Text>
                  <Text style={styles.subtitle}>Ingresa a tu cuenta</Text>
                </View>

                <View style={styles.formContainer}>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Correo electrónico</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="tu@email.com"
                        placeholderTextColor="#6B7280"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!loading}
                      />
                    </View>
                  </View>

                  <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Contraseña</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor="#6B7280"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        editable={!loading}
                        onSubmitEditing={handleLogin}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons
                          name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                          size={20}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.forgotPasswordButton}
                    onPress={() => router.push('/auth/forgot-password')}
                    disabled={loading}
                  >
                    <Ionicons name="key-outline" size={16} color="#fff" />
                    <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                  <Text style={styles.footerText}>¿No tienes cuenta? </Text>
                  <TouchableOpacity onPress={() => router.push('/auth/register')}>
                    <Text style={styles.link}>Regístrate</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backgroundImage: { position: 'absolute', width: '100%', height: '100%' },
  overlay: { flex: 1 },
  safeArea: { flex: 1 },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? normalize(60) : normalize(20),
    left: normalize(20),
    zIndex: 10,
    width: normalize(44),
    height: normalize(44),
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: normalize(22),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: normalize(24) },
  content: { flex: 1, justifyContent: 'center' },
  header: { marginBottom: normalize(40) },
  title: { fontSize: normalizeFont(32), fontWeight: '700', color: '#fff', marginBottom: normalize(8) },
  subtitle: { fontSize: normalizeFont(16), color: '#D1D5DB', fontWeight: '400' },
  formContainer: { gap: normalize(20) },
  inputWrapper: { gap: normalize(8) },
  label: { fontSize: normalizeFont(14), fontWeight: '500', color: '#E5E7EB', marginLeft: normalize(4) },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: normalize(12),
    paddingHorizontal: normalize(16),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputIcon: { marginRight: normalize(12) },
  input: { flex: 1, paddingVertical: normalize(16), fontSize: normalizeFont(16), color: '#fff' },
  button: {
    backgroundColor: '#fff',
    paddingVertical: normalize(18),
    borderRadius: normalize(12),
    alignItems: 'center',
    marginTop: normalize(12),
    elevation: 4,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: normalize(2) },
    shadowOpacity: 0.2,
    shadowRadius: normalize(8),
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#000', fontSize: normalizeFont(16), fontWeight: '600', letterSpacing: 0.5 },
  forgotPasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: normalize(6),
    paddingVertical: normalize(12),
  },
  forgotPasswordText: { color: '#fff', fontSize: normalizeFont(14), fontWeight: '500' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: normalize(8) },
  footerText: { color: '#D1D5DB', fontSize: normalizeFont(14) },
  link: { color: '#fff', fontSize: normalizeFont(14), fontWeight: '600' },
});
