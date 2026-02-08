// app/auth/role-selection.tsx

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { normalize, normalizeFont } from '../../lib/normalize';

export default function RoleSelectionScreen() {
  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={['#02111aff', '#1a3a4a']}
        style={styles.gradient}
      >
        {/* Logo y título */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <ThemedText style={styles.logoOdihna}>ODIHNA</ThemedText>
          </View>
          <ThemedText style={styles.subtitle}>
            Encuentra tu escape perfecto
          </ThemedText>
        </View>

        {/* Pregunta principal */}
        <View style={styles.content}>
          <ThemedText style={styles.question}>
            ¿Cómo quieres usar Odihna?
          </ThemedText>

          {/* Opción Huésped */}
          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => router.push('/auth/register?role=guest')}
            activeOpacity={0.8}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="person-outline" size={48} color="#2C5F7C" />
            </View>
            <View style={styles.roleInfo}>
              <ThemedText style={styles.roleTitle}>Soy Huésped</ThemedText>
              <ThemedText style={styles.roleDescription}>
                Quiero buscar y reservar alojamientos
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>

          {/* Opción Anfitrión */}
          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => router.push('/auth/register?role=host')}
            activeOpacity={0.8}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="home-outline" size={48} color="#D4AF37" />
            </View>
            <View style={styles.roleInfo}>
              <ThemedText style={styles.roleTitle}>Soy Anfitrión</ThemedText>
              <ThemedText style={styles.roleDescription}>
                Quiero publicar y gestionar alojamientos
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Footer con opción de login */}
        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            ¿Ya tienes una cuenta?
          </ThemedText>
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <ThemedText style={styles.loginLink}>Iniciar sesión</ThemedText>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    paddingHorizontal: normalize(24),
  },
  header: {
    marginTop: normalize(80),
    marginBottom: normalize(60),
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: normalize(8),
  },
  logoOdihna: {
    fontSize: normalizeFont(36),
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  logoLiving: {
    fontSize: normalizeFont(36),
    fontWeight: 'bold',
    color: '#D4AF37',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: normalizeFont(16),
    color: '#CCCCCC',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  question: {
    fontSize: normalizeFont(24),
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: normalize(40),
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: normalize(16),
    padding: normalize(20),
    marginBottom: normalize(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: normalize(4) },
    shadowOpacity: 0.1,
    shadowRadius: normalize(8),
    elevation: 5,
  },
  iconContainer: {
    width: normalize(70),
    height: normalize(70),
    borderRadius: normalize(35),
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: normalize(16),
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: normalizeFont(20),
    fontWeight: 'bold',
    color: '#000',
    marginBottom: normalize(4),
  },
  roleDescription: {
    fontSize: normalizeFont(14),
    color: '#666',
  },
  footer: {
    paddingVertical: normalize(30),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: normalize(8),
  },
  footerText: {
    fontSize: normalizeFont(15),
    color: '#CCCCCC',
  },
  loginLink: {
    fontSize: normalizeFont(15),
    color: '#D4AF37',
    fontWeight: 'bold',
  },
});
