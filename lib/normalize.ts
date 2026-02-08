// lib/normalize.ts
// Utilidad de escalado responsive para UI inmutable en Android
// Ignora la configuración de DPI y FontScale del usuario

import { Dimensions, PixelRatio, Platform } from 'react-native';

/**
 * Dimensiones base del diseño (iPhone 14 Pro / diseño estándar)
 */
const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 844;

// Obtener dimensiones iniciales
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Calcular ratios una vez al iniciar
const widthRatio = SCREEN_WIDTH / DESIGN_WIDTH;
const heightRatio = SCREEN_HEIGHT / DESIGN_HEIGHT;

// Usar el ratio más pequeño para evitar overflow
const SCALE_RATIO = Math.min(widthRatio, heightRatio);

/**
 * Normaliza dimensiones generales (width, height, padding, margin, borderRadius, etc.)
 * Convierte píxeles del diseño a dimensiones proporcionales a la pantalla actual.
 * 
 * COMPORTAMIENTO:
 * - Base: Reducción del 15% para mantener UI consistente
 * - Letra mínima (fontScale < 0.9): Reducción extra del 10% adicional
 * 
 * @param size - Valor en píxeles del diseño original (basado en 390x844)
 * @returns Valor normalizado para la pantalla actual
 */
export function normalize(size: number): number {
    const baseSize = Math.round(PixelRatio.roundToNearestPixel(size * SCALE_RATIO));

    // En Android, aplicar reducción consistente
    if (Platform.OS === 'android') {
        const fontScale = PixelRatio.getFontScale();

        // Reducción base del 15%
        let factor = 0.85;

        // Si fontScale es muy pequeño (letra mínima), reducir 10% adicional
        // fontScale < 0.9 indica tamaño de letra pequeño o mínimo
        if (fontScale < 0.9) {
            factor = 0.75; // 85% - 10% = 75% (reducción total del 25%)
        }

        return Math.round(baseSize * factor);
    }

    return baseSize;
}

/**
 * Normaliza tamaños de fuente.
 * 
 * COMPORTAMIENTO:
 * - fontScale >= 1.3 (Extragrande/Máximo): Aumenta 15% el tamaño del texto
 * - fontScale < 1.3: Mantiene tamaño consistente dividiendo por fontScale
 * 
 * @param size - Tamaño de fuente en el diseño original
 * @returns Tamaño de fuente normalizado
 */
export function normalizeFont(size: number): number {
    const scaledSize = normalize(size);

    if (Platform.OS === 'android') {
        const fontScale = PixelRatio.getFontScale();

        // Extragrande o Máximo (fontScale >= 1.3): Aumentar 15%
        if (fontScale >= 1.3) {
            const boostedSize = Math.round(scaledSize * 1.15);
            // Aún dividir por fontScale para compensar el sistema, pero con boost
            return Math.round(boostedSize / fontScale);
        }

        // Otros tamaños: dividir por fontScale para mantener consistencia
        if (fontScale !== 1) {
            return Math.round(scaledSize / fontScale);
        }
    }

    return scaledSize;
}

/**
 * Normaliza fuentes para el Switch "Estadia"/"Comprar".
 * Para fontScale grande: Reduce 10% (ya están grandes estos textos)
 */
export function normalizeFontSwitch(size: number): number {
    const scaledSize = normalize(size);

    if (Platform.OS === 'android') {
        const fontScale = PixelRatio.getFontScale();

        // Extragrande o Máximo: Reducir 10%
        if (fontScale >= 1.3) {
            const reducedSize = Math.round(scaledSize * 0.90);
            return Math.round(reducedSize / fontScale);
        }

        if (fontScale !== 1) {
            return Math.round(scaledSize / fontScale);
        }
    }

    return scaledSize;
}

/**
 * Normaliza fuentes para Logo y "Odihna Experiencias Únicas".
 * Para fontScale grande: Aumenta 10%
 */
export function normalizeFontLogo(size: number): number {
    const scaledSize = normalize(size);

    if (Platform.OS === 'android') {
        const fontScale = PixelRatio.getFontScale();

        // Extragrande o Máximo: Aumentar 10%
        if (fontScale >= 1.3) {
            const boostedSize = Math.round(scaledSize * 1.10);
            return Math.round(boostedSize / fontScale);
        }

        if (fontScale !== 1) {
            return Math.round(scaledSize / fontScale);
        }
    }

    return scaledSize;
}

/**
 * Normaliza basándose SOLO en el ancho de pantalla.
 * Útil para elementos que deben escalar horizontalmente.
 */
export function normalizeWidth(size: number): number {
    return Math.round(PixelRatio.roundToNearestPixel(size * widthRatio));
}

/**
 * Normaliza basándose SOLO en la altura de pantalla.
 * Útil para elementos que deben escalar verticalmente.
 */
export function normalizeHeight(size: number): number {
    return Math.round(PixelRatio.roundToNearestPixel(size * heightRatio));
}

// Alias cortos para uso rápido
export const n = normalize;
export const nf = normalizeFont;
export const nfs = normalizeFontSwitch;
export const nfl = normalizeFontLogo;
export const nw = normalizeWidth;
export const nh = normalizeHeight;

// Exportar constantes útiles
export const SCALE = {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    ratio: SCALE_RATIO,
    fontScale: PixelRatio.getFontScale(),
    pixelRatio: PixelRatio.get(),
};

