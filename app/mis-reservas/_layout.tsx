// app/mis-reservas/_layout.tsx
import { Stack } from 'expo-router';

export default function MisReservasLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
        </Stack>
    );
}
