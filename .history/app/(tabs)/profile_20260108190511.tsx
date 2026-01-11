// app/(tabs)/profile.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';

export default function ProfileScreen() {
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
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
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header con botón back */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
          <TouchableOpacity style={styles.editButton} onPress={() => router.push('/edit-profile')}>
            <Ionicons name="create-outline" size={24} color="#2C5F7C" />
          </TouchableOpacity>
        </View>

        {/* Información del usuario */}
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} contentFit="cover" />
            ) : (
              <Ionicons name="person-circle" size={120} color="#CBD5E1" />
            )}
          </View>
          
          <Text style={styles.userName}>{profile?.full_name || 'Usuario'}</Text>
          
          {profile?.role && (
            <View style={styles.roleBadge}>
              <Ionicons
                name={profile.role === 'host' ? 'home' : 'person'}
                size={16}
                color="#2C5F7C"
              />
              <Text style={styles.roleText}>
                {profile.role === 'host' ? 'Anfitrión' : 'Huésped'}
              </Text>
            </View>
          )}
        </View>

        {/* Verificaciones */}
        {(profile?.id_verified || profile?.email_verified || profile?.phone_verified) && (
          <View style={styles.verificationsSection}>
            <Text style={styles.sectionTitle}>Verificaciones</Text>
            <View style={styles.verificationsGrid}>
              {profile.email_verified && (
                <View style={styles.verificationItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={styles.verificationText}>Email</Text>
                </View>
              )}
              {profile.phone_verified && (
                <View style={styles.verificationItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={styles.verificationText}>Teléfono</Text>
                </View>
              )}
              {profile.id_verified && (
                <View style={styles.verificationItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={styles.verificationText}>Identidad</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Sobre ti */}
        {profile?.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sobre mí</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}

        {/* Información personal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información personal</Text>
          
          {profile?.date_of_birth && (
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={20} color="#64748B" />
              <Text style={styles.infoLabel}>Edad</Text>
              <Text style={styles.infoValue}>{calculateAge(profile.date_of_birth)} años</Text>
            </View>
          )}

          <View style={styles.infoItem}>
            <Ionicons name="mail-outline" size={20} color="#64748B" />
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email || 'No disponible'}</Text>
          </View>

          {profile?.phone && (
            <View style={styles.infoItem}>
              <Ionicons name="call-outline" size={20} color="#64748B" />
              <Text style={styles.infoLabel}>Teléfono</Text>
              <Text style={styles.infoValue}>{profile.phone}</Text>
            </View>
          )}

          {profile?.city && (
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={20} color="#64748B" />
              <Text style={styles.infoLabel}>Ciudad</Text>
              <Text style={styles.infoValue}>{profile.city}</Text>
            </View>
          )}

          {profile?.work && (
            <View style={styles.infoItem}>
              <Ionicons name="briefcase-outline" size={20} color="#64748B" />
              <Text style={styles.infoLabel}>Trabajo</Text>
              <Text style={styles.infoValue}>{profile.work}</Text>
            </View>
          )}

          {profile?.school && (
            <View style={styles.infoItem}>
              <Ionicons name="school-outline" size={20} color="#64748B" />
              <Text style={styles.infoLabel}>Educación</Text>
              <Text style={styles.infoValue}>{profile.school}</Text>
            </View>
          )}

          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={20} color="#64748B" />
            <Text style={styles.infoLabel}>Miembro desde</Text>
            <Text style={styles.infoValue}>
              {profile?.joined_year || new Date(user?.created_at || '').getFullYear()}
            </Text>
          </View>
        </View>

        {/* Estadísticas (solo para anfitriones) */}
        {profile?.role === 'host' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estadísticas como anfitrión</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{profile.total_reviews || 0}</Text>
                <Text style={styles.statLabel}>Reseñas</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {profile.average_rating ? profile.average_rating.toFixed(1) : '0.0'}
                </Text>
                <Text style={styles.statLabel}>Calificación</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{profile.response_rate || 0}%</Text>
                <Text style={styles.statLabel}>Resp. rápida</Text>
              </View>
            </View>
          </View>
        )}

        {/* Opciones */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/edit-profile')}>
            <Ionicons name="create-outline" size={22} color="#2C5F7C" />
            <Text style={styles.actionButtonText}>Editar perfil</Text>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#2C5F7C" />
            <Text style={styles.actionButtonText}>Verificar identidad</Text>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="settings-outline" size={22} color="#2C5F7C" />
            <Text style={styles.actionButtonText}>Configuración</Text>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="help-circle-outline" size={22} color="#2C5F7C" />
            <Text style={styles.actionButtonText}>Ayuda</Text>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
          <Text style={styles.signOutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Versión 1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', flex: 1, textAlign: 'center' },
  userInfo: {
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  avatarContainer: { marginBottom: 16 },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  userName: { fontSize: 28, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  roleText: { fontSize: 14, color: '#2C5F7C', fontWeight: '600' },
  verificationsSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 16,
  },
  verificationsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  verificationText: { fontSize: 14, color: '#10B981', fontWeight: '500' },
  section: { backgroundColor: '#fff', padding: 20, marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  bioText: { fontSize: 15, color: '#475569', lineHeight: 24 },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: { flex: 1, fontSize: 14, color: '#64748B' },
  infoValue: { fontSize: 15, color: '#1E293B', fontWeight: '500' },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '700', color: '#2C5F7C', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#64748B', textAlign: 'center' },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionButtonText: { flex: 1, fontSize: 16, color: '#1E293B', fontWeight: '500' },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#DC2626',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  signOutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  versionText: { textAlign: 'center', fontSize: 12, color: '#94A3B8', marginTop: 24 },
});
