import { Dimensions, PixelRatio, Platform, useWindowDimensions } from 'react-native';

/**
 * Dispositivo de referencia para normalización
 * Basado en iPhone 14 Pro / Pixel 7 (resoluciones estándar de diseño)
 */
const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 844;

/**
 * Hook para normalizar dimensiones de UI contra escalado de sistema Android.
 * 
 * USO:
 * ```tsx
 * const { normalize, normalizeFont } = useNormalizedDimensions();
 * 
 * const styles = StyleSheet.create({
 *   container: { padding: normalize(16) },
 *   title: { fontSize: normalizeFont(24) },
 * });
 * ```
 * 
 * PROBLEMA QUE RESUELVE:
 * En Android, cuando el usuario configura "Display Size" en valores altos,
 * el sistema cambia el DPI, lo que escala TODA la UI (no solo texto).
 * Este hook normaliza las dimensiones para que la UI se vea consistente.
 */
export function useNormalizedDimensions() {
    const { width, height, fontScale, scale } = useWindowDimensions();

    // Calcular ratios basados en el dispositivo de diseño
    const widthRatio = width / DESIGN_WIDTH;
    const heightRatio = height / DESIGN_HEIGHT;

    // Usar el ratio MÁS PEQUEÑO para evitar overflow en cualquier dimensión
    const baseRatio = Math.min(widthRatio, heightRatio);

    /**
     * Normaliza un valor de dimensión (width, height, padding, margin, etc.)
     * para mantener proporciones consistentes en todas las pantallas.
     * 
     * @param size - Tamaño en el diseño base (390x844)
     * @returns Tamaño normalizado para la pantalla actual
     */
    const normalize = (size: number): number => {
        const normalized = Math.round(PixelRatio.roundToNearestPixel(size * baseRatio));
        return normalized;
    };

    /**
     * Normaliza un tamaño de fuente, compensando TAMBIÉN el fontScale del sistema.
     * Usar para fontSize cuando quieras ignorar completamente la accesibilidad.
     * 
     * @param size - Tamaño de fuente en el diseño base
     * @returns Tamaño de fuente normalizado que ignora la configuración del sistema
     */
    const normalizeFont = (size: number): number => {
        const normalized = normalize(size);
        // En Android, compensar si el sistema tiene fontScale activo
        if (Platform.OS === 'android' && fontScale !== 1) {
            return Math.round(normalized / fontScale);
        }
        return normalized;
    };

    /**
     * Normaliza un valor basándose solo en el ancho de pantalla.
     * Útil para elementos que deben escalar horizontalmente.
     */
    const normalizeWidth = (size: number): number => {
        return Math.round(PixelRatio.roundToNearestPixel(size * widthRatio));
    };

    /**
     * Normaliza un valor basándose solo en la altura de pantalla.
     * Útil para elementos que deben escalar verticalmente.
     */
    const normalizeHeight = (size: number): number => {
        return Math.round(PixelRatio.roundToNearestPixel(size * heightRatio));
    };

    return {
        // Funciones de normalización
        normalize,
        normalizeFont,
        normalizeWidth,
        normalizeHeight,

        // Dimensiones de pantalla
        width,
        height,

        // Factores de escala del sistema
        scale,
        fontScale,

        // Flags de utilidad
        isSmallDevice: width < 375,
        isLargeDevice: width >= 428,
        isHighDensity: scale > 2.5,
    };
}

/**
 * Versión estática (no-hook) para usar fuera de componentes.
 * NOTA: No se actualiza con cambios de orientación.
 */
export function getNormalizedDimensions() {
    const { width, height } = Dimensions.get('window');
    const fontScale = PixelRatio.getFontScale();
    const scale = PixelRatio.get();

    const widthRatio = width / DESIGN_WIDTH;
    const heightRatio = height / DESIGN_HEIGHT;
    const baseRatio = Math.min(widthRatio, heightRatio);

    const normalize = (size: number): number => {
        return Math.round(PixelRatio.roundToNearestPixel(size * baseRatio));
    };

    const normalizeFont = (size: number): number => {
        const normalized = normalize(size);
        if (Platform.OS === 'android' && fontScale !== 1) {
            return Math.round(normalized / fontScale);
        }
        return normalized;
    };

    return { normalize, normalizeFont, width, height, scale, fontScale };
}
