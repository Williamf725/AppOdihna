// app/auth/role-selection.tsx

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

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
            <ThemedText style={styles.logoLiving}> LIVING</ThemedText>
          </View>
          <ThemedText style={styles.subtitle}>
            Encuentra tu escape perfecto
          </ThemedText>
        </View>

        {/* Pregunta principal */}
        <View style={styles.content}>
          <ThemedText style={styles.question}>
            ¿Cómo quieres usar Odihna Living?
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
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 80,
    marginBottom: 60,
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoOdihna: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  logoLiving: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#D4AF37',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  question: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 40,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    paddingVertical: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 15,
    color: '#CCCCCC',
  },
  loginLink: {
    fontSize: 15,
    color: '#D4AF37',
    fontWeight: 'bold',
  },
});
