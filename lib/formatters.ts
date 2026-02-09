/**
 * Formatear un valor numérico (string) añadiendo puntos de miles.
 * Ejemplo: "1000000" -> "1.000.000"
 */
export const formatCurrencyInput = (value: string): string => {
    // Eliminar cualquier caracter que no sea número
    const numericValue = value.replace(/\D/g, '');

    // Si está vacío, retornar string vacío
    if (!numericValue) return '';

    // Formatear con puntos de miles
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Parsear un valor formateado (con puntos) a número.
 * Ejemplo: "1.000.000" -> 1000000
 */
export const parseCurrencyInput = (value: string): number => {
    // Eliminar cualquier caracter que no sea número
    const numericValue = value.replace(/\D/g, '');

    // Parsear a entero (o float si fuera necesario, pero aquí usamos enteros para precios)
    return parseInt(numericValue, 10) || 0;
};
