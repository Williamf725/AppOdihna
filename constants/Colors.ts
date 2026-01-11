// constants/Colors.ts

export const Colors = {
  light: {
    text: '#11181C',
    background: '#FFFFFF',
    tint: '#2C5F7C',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#2C5F7C',
    card: '#FFFFFF',
    border: '#E6E8EB',
    muted: '#6B7280',
  },
  dark: {
    text: '#ECEDEE',
    background: '#0B0F14',
    tint: '#4A9ECC',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#4A9ECC',
    card: '#121826',
    border: '#273244',
    muted: '#9BA1A6',
  },
} as const;

export type ColorSchemeName = keyof typeof Colors;
