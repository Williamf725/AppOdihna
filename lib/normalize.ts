import { Dimensions, PixelRatio } from 'react-native';

// TUS DIMENSIONES BASE (Las que usas en tu diseño que se ve bien)
const DESIGN_WIDTH = 490;
const DESIGN_HEIGHT = 850; // Altura referencia (opcional para cálculos de alto)

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Calculamos la escala basada SOLO en el ancho.
// Esta es la "regla de oro" para consistencia visual horizontal.
const scale = SCREEN_WIDTH / DESIGN_WIDTH;

// Opcional: Si quieres soportar tablets sin que se vea GIGANTE, 
// puedes limitar la escala máxima (ej. que no crezca más de 1.2 veces)
// const scale = Math.min(SCREEN_WIDTH / DESIGN_WIDTH, 1.2);

/**
 * Función Maestra de Normalización
 * Escala cualquier valor basándose puramente en la regla de 3 matemática.
 */
export function normalize(size: number): number {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

/**
 * Normaliza fuentes general
 * Simplemente usa la escala geométrica. 
 * Al usarse junto con ThemedText (allowFontScaling=false), 
 * el texto será siempre proporcional al ancho de la pantalla.
 */
export function normalizeFont(size: number): number {
    return normalize(size);
}

/**
 * Normaliza fuentes para el Switch "Estadia"/"Comprar".
 * Mantenemos tu lógica de negocio: Quieres que estos sean un poco más pequeños
 * visualmente en proporción al resto? O simplemente consistentes?
 * Si en tu diseño de 500px se ven bien con tamaño X, usa normalize(X).
 * * Si quieres forzar una reducción del 10% manual:
 */
export function normalizeFontSwitch(size: number): number {
    // Si en el diseño original quieres que se sienta un 10% más pequeño de lo normal
    return normalize(size * 0.9);
}

/**
 * Normaliza fuentes para Logo.
 * Si quieres que el logo destaque un 10% más:
 */
export function normalizeFontLogo(size: number): number {
    return normalize(size * 1.1);
}

// Helpers específicos por si necesitas escalar alturas (poco común en textos, útil en cajas)
export function normalizeHeight(size: number): number {
    const heightScale = SCREEN_HEIGHT / DESIGN_HEIGHT;
    const newSize = size * heightScale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

// Alias
export const n = normalize;
export const nf = normalizeFont;
export const nfs = normalizeFontSwitch;
export const nfl = normalizeFontLogo;