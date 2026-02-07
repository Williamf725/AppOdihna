// app/(tabs)/profile.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert, Animated, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';

// ================================
// NOCTURNE LUXURY PALETTE
// ================================
const Colors = {
  light: {
    background: '#F5F5F0',
    cardBackground: '#FFFFFF',
    text: '#121212',
    textSecondary: '#666666',
    accent: '#D4AF37',
    accentDark: '#AA8C2C',
    border: '#E0E0E0',
    divider: '#EBEBEB',
    inputBackground: '#F5F5F5',
    success: '#10B981',
    danger: '#DC2626',
  },
  dark: {
    background: '#050505',
    cardBackground: '#121212',
    text: '#F0F0F0',
    textSecondary: '#999999',
    accent: '#D4AF37',
    accentDark: '#F2D06B',
    border: '#333333',
    divider: '#222222',
    inputBackground: '#1E1E1E',
    success: '#10B981',
    danger: '#EF4444',
  },
};

// ================================
// ANIMATED STAT CARD
// ================================
function AnimatedStatCard({ value, label, index, colors }: {
  value: string;
  label: string;
  index: number;
  colors: typeof Colors.light;
}) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 100,
      useNativeDriver: true,
      friction: 6,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.statCard,
        {
          backgroundColor: colors.inputBackground,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Text style={[styles.statValue, { color: colors.accent }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </Animated.View>
  );
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { user, profile, signOut } = useAuth();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSignOut = async () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            // ✅ No navegar aquí - el _layout.tsx detecta el cambio de auth y redirige automáticamente
          } catch (error: any) {
            console.error('Error al cerrar sesión:', error);
          }
        },
      },
    ]);
  };

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
          <Text style={styles.headerSubtitle}>Tu cuenta</Text>
        </View>
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: `${colors.accent}20` }]}
          onPress={() => router.push('/edit-profile')}
        >
          <Ionicons name="create-outline" size={22} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Información del usuario */}
        <Animated.View
          style={[
            styles.userInfo,
            {
              backgroundColor: colors.cardBackground,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.avatarContainer, { shadowColor: colors.accent }]}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.inputBackground }]}>
                <Ionicons name="person" size={50} color={colors.accent} />
              </View>
            )}
            <View style={[styles.avatarBorder, { borderColor: colors.accent }]} />
          </View>

          <Text style={[styles.userName, { color: colors.text }]}>{profile?.full_name || 'Usuario'}</Text>

          {profile?.role && (
            <View style={[styles.roleBadge, { backgroundColor: `${colors.accent}15` }]}>
              <Ionicons
                name={profile.role === 'host' ? 'home' : 'person'}
                size={16}
                color={colors.accent}
              />
              <Text style={[styles.roleText, { color: colors.accent }]}>
                {profile.role === 'host' ? 'Anfitrión' : 'Huésped'}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Verificaciones */}
        {(profile?.id_verified || profile?.email_verified || profile?.phone_verified) && (
          <View style={[styles.verificationsSection, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Verificaciones</Text>
            <View style={styles.verificationsGrid}>
              {profile.email_verified && (
                <View style={[styles.verificationItem, { backgroundColor: `${colors.success}15` }]}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={[styles.verificationText, { color: colors.success }]}>Email</Text>
                </View>
              )}
              {profile.phone_verified && (
                <View style={[styles.verificationItem, { backgroundColor: `${colors.success}15` }]}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={[styles.verificationText, { color: colors.success }]}>Teléfono</Text>
                </View>
              )}
              {profile.id_verified && (
                <View style={[styles.verificationItem, { backgroundColor: `${colors.success}15` }]}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={[styles.verificationText, { color: colors.success }]}>Identidad</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Sobre ti */}
        {profile?.bio && (
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Sobre mí</Text>
            <Text style={[styles.bioText, { color: colors.textSecondary }]}>{profile.bio}</Text>
          </View>
        )}

        {/* Información personal */}
        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Información personal</Text>

          {profile?.date_of_birth && (
            <View style={[styles.infoItem, { borderBottomColor: colors.divider }]}>
              <View style={[styles.infoIconContainer, { backgroundColor: `${colors.accent}15` }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.accent} />
              </View>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Edad</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{calculateAge(profile.date_of_birth)} años</Text>
            </View>
          )}

          <View style={[styles.infoItem, { borderBottomColor: colors.divider }]}>
            <View style={[styles.infoIconContainer, { backgroundColor: `${colors.accent}15` }]}>
              <Ionicons name="mail-outline" size={18} color={colors.accent} />
            </View>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{user?.email || 'No disponible'}</Text>
          </View>

          {profile?.phone && (
            <View style={[styles.infoItem, { borderBottomColor: colors.divider }]}>
              <View style={[styles.infoIconContainer, { backgroundColor: `${colors.accent}15` }]}>
                <Ionicons name="call-outline" size={18} color={colors.accent} />
              </View>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Teléfono</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{profile.phone}</Text>
            </View>
          )}

          {profile?.city && (
            <View style={[styles.infoItem, { borderBottomColor: colors.divider }]}>
              <View style={[styles.infoIconContainer, { backgroundColor: `${colors.accent}15` }]}>
                <Ionicons name="location-outline" size={18} color={colors.accent} />
              </View>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Ciudad</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{profile.city}</Text>
            </View>
          )}

          {profile?.work && (
            <View style={[styles.infoItem, { borderBottomColor: colors.divider }]}>
              <View style={[styles.infoIconContainer, { backgroundColor: `${colors.accent}15` }]}>
                <Ionicons name="briefcase-outline" size={18} color={colors.accent} />
              </View>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Trabajo</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{profile.work}</Text>
            </View>
          )}

          {profile?.school && (
            <View style={[styles.infoItem, { borderBottomColor: colors.divider }]}>
              <View style={[styles.infoIconContainer, { backgroundColor: `${colors.accent}15` }]}>
                <Ionicons name="school-outline" size={18} color={colors.accent} />
              </View>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Educación</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{profile.school}</Text>
            </View>
          )}

          <View style={[styles.infoItem, { borderBottomWidth: 0 }]}>
            <View style={[styles.infoIconContainer, { backgroundColor: `${colors.accent}15` }]}>
              <Ionicons name="time-outline" size={18} color={colors.accent} />
            </View>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Miembro desde</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {profile?.joined_year || new Date(user?.created_at || '').getFullYear()}
            </Text>
          </View>
        </View>

        {/* Estadísticas (solo para anfitriones) */}
        {profile?.role === 'host' && (
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Estadísticas como anfitrión</Text>

            <View style={styles.statsGrid}>
              <AnimatedStatCard
                value={(profile.total_reviews || 0).toString()}
                label="Reseñas"
                index={0}
                colors={colors}
              />
              <AnimatedStatCard
                value={profile.average_rating ? profile.average_rating.toFixed(1) : '0.0'}
                label="Calificación"
                index={1}
                colors={colors}
              />
              <AnimatedStatCard
                value={`${profile.response_rate || 0}%`}
                label="Resp. rápida"
                index={2}
                colors={colors}
              />
            </View>
          </View>
        )}

        {/* Opciones */}
        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
          <TouchableOpacity
            style={[styles.actionButton, { borderBottomColor: colors.divider }]}
            onPress={() => router.push('/notificaciones')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: `${colors.accent}15` }]}>
              <Ionicons name="notifications-outline" size={20} color={colors.accent} />
            </View>
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Notificaciones</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { borderBottomColor: colors.divider }]}
            onPress={() => router.push('/edit-profile')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: `${colors.accent}15` }]}>
              <Ionicons name="create-outline" size={20} color={colors.accent} />
            </View>
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Editar perfil</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, { borderBottomColor: colors.divider }]}>
            <View style={[styles.actionIconContainer, { backgroundColor: `${colors.accent}15` }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.accent} />
            </View>
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Verificar identidad</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, { borderBottomColor: colors.divider }]}>
            <View style={[styles.actionIconContainer, { backgroundColor: `${colors.accent}15` }]}>
              <Ionicons name="settings-outline" size={20} color={colors.accent} />
            </View>
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Configuración</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, { borderBottomWidth: 0 }]}>
            <View style={[styles.actionIconContainer, { backgroundColor: `${colors.accent}15` }]}>
              <Ionicons name="help-circle-outline" size={20} color={colors.accent} />
            </View>
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Ayuda</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
          <LinearGradient
            colors={[colors.danger, '#B91C1C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.signOutGradient}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.signOutText}>Cerrar sesión</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: colors.textSecondary }]}>Versión 1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: '#050505',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#D4AF37',
    marginTop: 2,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: 0,
  },
  userInfo: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  avatarContainer: {
    marginBottom: 16,
    position: 'relative',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  avatar: { width: 110, height: 110, borderRadius: 55 },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBorder: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 60,
    borderWidth: 3,
  },
  userName: { fontSize: 26, fontWeight: '700', marginBottom: 10 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
  },
  roleText: { fontSize: 14, fontWeight: '600' },
  verificationsSection: {
    padding: 20,
    marginBottom: 12,
  },
  verificationsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  verificationText: { fontSize: 13, fontWeight: '600' },
  section: { padding: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  bioText: { fontSize: 15, lineHeight: 24 },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: { flex: 1, fontSize: 14 },
  infoValue: { fontSize: 15, fontWeight: '500' },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 12, textAlign: 'center' },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: { flex: 1, fontSize: 16, fontWeight: '500' },
  signOutButton: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 14,
    overflow: 'hidden',
  },
  signOutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  signOutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  versionText: { textAlign: 'center', fontSize: 12, marginTop: 24 },
});
