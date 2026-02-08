// components/ThemedText.tsx
// Componente de texto que IGNORA la configuración de accesibilidad del usuario

import React from 'react';
import { StyleSheet, Text, TextProps, TextStyle } from 'react-native';
import { normalizeFont } from '../lib/normalize';

interface ThemedTextProps extends TextProps {
    children: React.ReactNode;
    style?: TextStyle | TextStyle[];
}

/**
 * Componente de texto inmutable que:
 * 1. Tiene allowFontScaling={false} para ignorar configuración del sistema
 * 2. Normaliza automáticamente el fontSize si se proporciona en el estilo
 */
export function ThemedText({ children, style, ...props }: ThemedTextProps) {
    // Normalizar fontSize si está presente en los estilos
    const normalizedStyle = React.useMemo(() => {
        if (!style) return undefined;

        // Aplanar estilos si es un array
        const flatStyle = StyleSheet.flatten(style);

        if (flatStyle?.fontSize) {
            return {
                ...flatStyle,
                fontSize: normalizeFont(flatStyle.fontSize),
            };
        }

        return flatStyle;
    }, [style]);

    return (
        <Text
            {...props}
            style={normalizedStyle}
            allowFontScaling={false}
        >
            {children}
        </Text>
    );
}

export default ThemedText;
