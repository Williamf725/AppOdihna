// app/_layout.tsx
import * as Linking from 'expo-linking';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppModeProvider } from '../contexts/AppModeContext';
import { AuthProvider, useAuthContext } from '../contexts/AuthContext';

// ⚠️ PARCHE GLOBAL: Deshabilitar Font Scaling en toda la app
// Esto asegura que la UI se vea idéntica en todos los dispositivos,
// ignorando la configuración de tamaño de fuente del usuario.
// @ts-ignore - defaultProps es API legacy pero funciona en runtime
(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.allowFontScaling = false;

// @ts-ignore - defaultProps es API legacy pero funciona en runtime
(TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
(TextInput as any).defaultProps.allowFontScaling = false;

// ✅ Componente interno que maneja la navegación basada en auth
function RootLayoutNav() {
  const { user, loading } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // Marcar navegación como lista después del primer render
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsNavigationReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // ✅ Registrar push token cuando el usuario se autentica
  useEffect(() => {
    if (user) {
      const setupNotifications = async () => {
        try {
          const { registerForPushNotificationsAsync, savePushToken } = await import('../lib/notificationService');
          const token = await registerForPushNotificationsAsync();
          if (token) {
            await savePushToken(user.id, token);
          }
        } catch (error) {
          console.log('⚠️ Error configurando notificaciones:', error);
        }
      };
      setupNotifications();
    }
  }, [user]);

  useEffect(() => {
    if (loading || !isNavigationReady) return;

    // Castear a string para evitar errores de TypeScript con tipos estrictos de expo-router
    const firstSegment = segments[0] as string | undefined;
    const segmentCount = segments.length as number;
    const inAuthGroup = firstSegment === 'auth';
    const inTabs = firstSegment === '(tabs)';
    const isWelcome = segmentCount < 1 || firstSegment === 'index' || !firstSegment;

    if (!user) {
      // Usuario no autenticado
      // Si está en tabs o en una pantalla protegida, redirigir a welcome
      if (inTabs) {
        console.log('🔄 Usuario no autenticado, redirigiendo a welcome...');
        router.replace('/');
      }
    } else {
      // Usuario autenticado
      // Si está en welcome o auth, redirigir a tabs
      if (isWelcome || inAuthGroup) {
        console.log('🔄 Usuario autenticado, redirigiendo a tabs...');
        router.replace('/(tabs)');
      }
    }
  }, [user, loading, segments, isNavigationReady]);

  return <Slot />;
}

export default function RootLayout() {
  useEffect(() => {
    // ✅ Listener para deep links mientras la app está abierta
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('🔗 Deep link recibido:', url);
    });

    // ✅ Verificar si la app se abrió desde un deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🔗 App abierta desde deep link:', url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppModeProvider>
          <RootLayoutNav />
        </AppModeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
