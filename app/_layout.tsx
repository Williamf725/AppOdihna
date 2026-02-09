// app/_layout.tsx
import * as Linking from 'expo-linking';
import { Slot, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppModeProvider } from '../contexts/AppModeContext';
import { AuthProvider, useAuthContext } from '../contexts/AuthContext';

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ PARCHE GLOBAL ROBUSTO: Bloquear TODOS los escalados de texto
// Ejecutado a nivel de módulo ANTES de cualquier render
// ═══════════════════════════════════════════════════════════════════════════
import { Dimensions, PixelRatio, Platform } from 'react-native';

// Detectar factores de escala del sistema para diagnóstico
const systemFontScale = PixelRatio.getFontScale();
const systemScale = PixelRatio.get();
const windowDimensions = Dimensions.get('window');

if (__DEV__) {
  console.log('📱 [Display Metrics] Al iniciar app:', {
    fontScale: systemFontScale,
    pixelRatio: systemScale,
    windowWidth: windowDimensions.width,
    windowHeight: windowDimensions.height,
    platform: Platform.OS,
    isHighDensity: systemScale > 2.5,
  });
}

// 1. Bloquear font scaling para Text (más robusto)
if (!(Text as any).defaultProps) (Text as any).defaultProps = {};
(Text as any).defaultProps.allowFontScaling = false;
(Text as any).defaultProps.maxFontSizeMultiplier = 1;

// 2. Bloquear font scaling para TextInput
if (!(TextInput as any).defaultProps) (TextInput as any).defaultProps = {};
(TextInput as any).defaultProps.allowFontScaling = false;
(TextInput as any).defaultProps.maxFontSizeMultiplier = 1;

// ═══════════════════════════════════════════════════════════════════════════

// ✅ Componente interno corregido
function RootLayoutNav() {
  const { user, loading } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();

  // ✅ LA SOLUCIÓN AL BUCLE: 
  // Hook oficial de Expo para saber si la navegación ya montó.
  // Reemplaza al setTimeout y es mucho más preciso.
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    // 🛑 REGLA 1: Si el router no está listo, NO TE MUEVAS.
    if (!rootNavigationState?.key) return;

    // 🛑 REGLA 2: Si AuthContext está cargando, NO TE MUEVAS.
    // Esto evita el bucle infinito y la pantalla negra.
    // Esperamos pacientemente a que Supabase termine su trabajo.
    if (loading) return;

    // Lógica de Segmentos
    const firstSegment = segments[0] as string | undefined;

    // Definir zonas
    // index = pantalla de carga/bienvenida, (auth) = login/registro
    const inAuthGroup = firstSegment === '(auth)' || firstSegment === 'auth';
    const isWelcome = !firstSegment || firstSegment === 'index';
    const inPublicArea = inAuthGroup || isWelcome;

    // 🧭 Lógica de Redirección (Solo se ejecuta cuando loading === false)
    if (!user) {
      // Si NO hay usuario y estamos en zona privada (tabs, perfil, etc) -> LOGIN
      if (!inPublicArea) {
        console.log('🔒 Acceso denegado, redirigiendo a Login...');
        router.replace('/');
      }
    } else {
      // Si HAY usuario y estamos en zona pública (login, welcome) -> HOME
      if (inPublicArea) {
        console.log('✅ Usuario autenticado, entrando a la App...');
        router.replace('/(tabs)');
      }
    }
  }, [user, loading, segments, rootNavigationState?.key]);

  // 🖥️ RENDERIZADO CONDICIONAL
  // Si el router no está listo O estamos cargando auth -> Spinner
  if (!rootNavigationState?.key || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  // Si todo cargó, mostramos la app
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
