// app/gestionar-reservas/_layout.tsx
import { Stack } from 'expo-router';

export default function GestionarReservasLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
        </Stack>
    );
}
