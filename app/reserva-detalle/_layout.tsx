// app/reserva-detalle/_layout.tsx
import { Stack } from 'expo-router';

export default function ReservaDetalleLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="[id]" />
        </Stack>
    );
}
