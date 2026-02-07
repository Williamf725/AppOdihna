// components/RealEstateFilters.tsx
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    LayoutAnimation,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View
} from 'react-native';
import {
    Estrato,
    estratoOptions,
    formatFullCurrency,
    MAX_PRICE,
    MIN_PRICE,
    Zona,
    zonaOptions,
} from '../constants/realEstateData';
import { ModeColors, TransitionConfig } from '../contexts/AppModeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface RealEstateFiltersProps {
    isDark: boolean;
    onFiltersChange: (filters: FilterState) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    isVisible: boolean;
}

export interface FilterState {
    priceMin: number;
    priceMax: number;
    zona: Zona | null;
    estrato: Estrato | null;
    metrajeMin: number | null;
}

const Colors = {
    light: {
        background: '#F5F5F0',
        cardBackground: '#FFFFFF',
        text: '#121212',
        textSecondary: '#666666',
        border: '#E0E0E0',
        inputBackground: '#F0F0F0',
        dropdownBackground: '#FFFFFF',
    },
    dark: {
        background: '#050505',
        cardBackground: '#121212',
        text: '#F0F0F0',
        textSecondary: '#999999',
        border: '#2A2A2A',
        inputBackground: '#1E1E1E',
        dropdownBackground: '#1A1A1A',
    },
};

export function RealEstateFilters({
    isDark,
    onFiltersChange,
    searchQuery,
    onSearchChange,
    isVisible,
}: RealEstateFiltersProps) {
    const colors = isDark ? Colors.dark : Colors.light;
    const modeColors = ModeColors.comprar;

    const [priceMinInput, setPriceMinInput] = useState('');
    const [priceMaxInput, setPriceMaxInput] = useState('');
    const [selectedZona, setSelectedZona] = useState<Zona | null>(null);
    const [selectedEstrato, setSelectedEstrato] = useState<Estrato | null>(null);

    const [showPriceDropdown, setShowPriceDropdown] = useState(false);
    const [showEstratoDropdown, setShowEstratoDropdown] = useState(false);
    const [showZonaDropdown, setShowZonaDropdown] = useState(false);

    // ================================
    // ELEGANT SMOOTH ANIMATIONS
    // ================================
    const elegantEase = Easing.bezier(0.25, 0.46, 0.45, 0.94);

    // Search - smooth slide down
    const searchY = useRef(new Animated.Value(-40)).current;
    const searchOpacity = useRef(new Animated.Value(0)).current;

    // Presupuesto - smooth slide from left
    const presupuestoX = useRef(new Animated.Value(-80)).current;
    const presupuestoOpacity = useRef(new Animated.Value(0)).current;

    // Estrato - smooth slide from right
    const estratoX = useRef(new Animated.Value(80)).current;
    const estratoOpacity = useRef(new Animated.Value(0)).current;

    // Zona - smooth slide up
    const zonaY = useRef(new Animated.Value(40)).current;
    const zonaOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isVisible) {
            const stagger = TransitionConfig.filterStagger;

            // Search - smooth entrance from top
            Animated.parallel([
                Animated.timing(searchY, {
                    toValue: 0,
                    duration: 400,
                    easing: elegantEase,
                    useNativeDriver: true,
                }),
                Animated.timing(searchOpacity, {
                    toValue: 1,
                    duration: 350,
                    useNativeDriver: true,
                }),
            ]).start();

            // Presupuesto - slide from left
            setTimeout(() => {
                Animated.parallel([
                    Animated.timing(presupuestoX, {
                        toValue: 0,
                        duration: 400,
                        easing: elegantEase,
                        useNativeDriver: true,
                    }),
                    Animated.timing(presupuestoOpacity, {
                        toValue: 1,
                        duration: 350,
                        useNativeDriver: true,
                    }),
                ]).start();
            }, stagger);

            // Estrato - slide from right
            setTimeout(() => {
                Animated.parallel([
                    Animated.timing(estratoX, {
                        toValue: 0,
                        duration: 400,
                        easing: elegantEase,
                        useNativeDriver: true,
                    }),
                    Animated.timing(estratoOpacity, {
                        toValue: 1,
                        duration: 350,
                        useNativeDriver: true,
                    }),
                ]).start();
            }, stagger * 2);

            // Zona - slide from bottom
            setTimeout(() => {
                Animated.parallel([
                    Animated.timing(zonaY, {
                        toValue: 0,
                        duration: 400,
                        easing: elegantEase,
                        useNativeDriver: true,
                    }),
                    Animated.timing(zonaOpacity, {
                        toValue: 1,
                        duration: 350,
                        useNativeDriver: true,
                    }),
                ]).start();
            }, stagger * 3);
        } else {
            // Smooth exit
            Animated.parallel([
                Animated.timing(searchOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(presupuestoOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(estratoOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(zonaOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start(() => {
                searchY.setValue(-40);
                presupuestoX.setValue(-80);
                estratoX.setValue(80);
                zonaY.setValue(40);
            });
        }
    }, [isVisible]);

    const notifyFiltersChange = useCallback(() => {
        const priceMin = priceMinInput ? parseInt(priceMinInput.replace(/\D/g, ''), 10) : MIN_PRICE;
        const priceMax = priceMaxInput ? parseInt(priceMaxInput.replace(/\D/g, ''), 10) : MAX_PRICE;

        onFiltersChange({
            priceMin: isNaN(priceMin) ? MIN_PRICE : priceMin,
            priceMax: isNaN(priceMax) ? MAX_PRICE : priceMax,
            zona: selectedZona,
            estrato: selectedEstrato,
            metrajeMin: null,
        });
    }, [priceMinInput, priceMaxInput, selectedZona, selectedEstrato, onFiltersChange]);

    useEffect(() => {
        notifyFiltersChange();
    }, [priceMinInput, priceMaxInput, selectedZona, selectedEstrato]);

    const toggleDropdown = async (dropdown: 'price' | 'estrato' | 'zona') => {
        if (Platform.OS !== 'web') {
            await Haptics.selectionAsync();
        }
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        if (dropdown === 'price') {
            setShowPriceDropdown(!showPriceDropdown);
            setShowEstratoDropdown(false);
            setShowZonaDropdown(false);
        } else if (dropdown === 'estrato') {
            setShowEstratoDropdown(!showEstratoDropdown);
            setShowPriceDropdown(false);
            setShowZonaDropdown(false);
        } else {
            setShowZonaDropdown(!showZonaDropdown);
            setShowPriceDropdown(false);
            setShowEstratoDropdown(false);
        }
    };

    const handleEstratoSelect = async (estrato: Estrato) => {
        if (Platform.OS !== 'web') {
            await Haptics.selectionAsync();
        }
        setSelectedEstrato(selectedEstrato === estrato ? null : estrato);
        setShowEstratoDropdown(false);
    };

    const handleZonaSelect = async (zona: Zona) => {
        if (Platform.OS !== 'web') {
            await Haptics.selectionAsync();
        }
        setSelectedZona(selectedZona === zona ? null : zona);
        setShowZonaDropdown(false);
    };

    const handleClearFilters = async () => {
        if (Platform.OS !== 'web') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setPriceMinInput('');
        setPriceMaxInput('');
        setSelectedZona(null);
        setSelectedEstrato(null);
        onSearchChange('');
        setShowPriceDropdown(false);
        setShowEstratoDropdown(false);
        setShowZonaDropdown(false);
    };

    const hasActiveFilters =
        selectedZona !== null ||
        selectedEstrato !== null ||
        priceMinInput !== '' ||
        priceMaxInput !== '' ||
        searchQuery.trim() !== '';

    const formatPriceDisplay = () => {
        if (!priceMinInput && !priceMaxInput) return 'Presupuesto';
        const min = priceMinInput ? formatFullCurrency(parseInt(priceMinInput.replace(/\D/g, ''), 10) || 0) : 'Min';
        const max = priceMaxInput ? formatFullCurrency(parseInt(priceMaxInput.replace(/\D/g, ''), 10) || 0) : 'Max';
        return `${min} - ${max}`;
    };

    if (!isVisible) return null;

    return (
        <View style={styles.container}>
            {/* Search */}
            <Animated.View
                style={[
                    styles.searchContainer,
                    { backgroundColor: colors.inputBackground },
                    {
                        opacity: searchOpacity,
                        transform: [{ translateY: searchY }],
                    },
                ]}
            >
                <Ionicons name="search-outline" size={18} color={modeColors.accent} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Buscar por nombre o ciudad..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={onSearchChange}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => onSearchChange('')}>
                        <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </Animated.View>

            {/* Row: Presupuesto + Estrato */}
            <View style={styles.filtersRow}>
                {/* Presupuesto */}
                <Animated.View
                    style={[
                        styles.filterColumn,
                        {
                            opacity: presupuestoOpacity,
                            transform: [{ translateX: presupuestoX }],
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            {
                                backgroundColor: colors.inputBackground,
                                borderColor: showPriceDropdown || priceMinInput || priceMaxInput ? modeColors.accent : colors.border,
                            }
                        ]}
                        onPress={() => toggleDropdown('price')}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="cash-outline"
                            size={18}
                            color={priceMinInput || priceMaxInput ? modeColors.accent : colors.textSecondary}
                        />
                        <Text
                            style={[styles.filterButtonText, { color: priceMinInput || priceMaxInput ? modeColors.accent : colors.text }]}
                            numberOfLines={1}
                        >
                            {formatPriceDisplay()}
                        </Text>
                        <Ionicons
                            name={showPriceDropdown ? "chevron-up" : "chevron-down"}
                            size={16}
                            color={colors.textSecondary}
                        />
                    </TouchableOpacity>

                    {showPriceDropdown && (
                        <View style={[styles.dropdown, { backgroundColor: colors.dropdownBackground, borderColor: modeColors.accent }]}>
                            <Text style={[styles.dropdownLabel, { color: modeColors.accent }]}>Precio mínimo (COP)</Text>
                            <TextInput
                                style={[styles.priceInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                                placeholder="Ej: 100.000.000"
                                placeholderTextColor={colors.textSecondary}
                                value={priceMinInput}
                                onChangeText={setPriceMinInput}
                                keyboardType="numeric"
                            />
                            <Text style={[styles.dropdownLabel, { color: modeColors.accent, marginTop: 12 }]}>Precio máximo (COP)</Text>
                            <TextInput
                                style={[styles.priceInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                                placeholder="Ej: 500.000.000"
                                placeholderTextColor={colors.textSecondary}
                                value={priceMaxInput}
                                onChangeText={setPriceMaxInput}
                                keyboardType="numeric"
                            />
                            <TouchableOpacity
                                style={[styles.applyButton, { backgroundColor: modeColors.accent }]}
                                onPress={() => setShowPriceDropdown(false)}
                            >
                                <Text style={styles.applyButtonText}>Aplicar</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </Animated.View>

                {/* Estrato */}
                <Animated.View
                    style={[
                        styles.filterColumnSmall,
                        {
                            opacity: estratoOpacity,
                            transform: [{ translateX: estratoX }],
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            {
                                backgroundColor: colors.inputBackground,
                                borderColor: showEstratoDropdown || selectedEstrato ? modeColors.accent : colors.border,
                            }
                        ]}
                        onPress={() => toggleDropdown('estrato')}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.filterButtonText, { color: selectedEstrato ? modeColors.accent : colors.text }]}>
                            {selectedEstrato ? `Estrato ${selectedEstrato}` : 'Estrato'}
                        </Text>
                        <Ionicons
                            name={showEstratoDropdown ? "chevron-up" : "chevron-down"}
                            size={16}
                            color={colors.textSecondary}
                        />
                    </TouchableOpacity>

                    {showEstratoDropdown && (
                        <View style={[styles.dropdown, styles.dropdownSmall, { backgroundColor: colors.dropdownBackground, borderColor: modeColors.accent }]}>
                            {estratoOptions.map((estrato) => (
                                <TouchableOpacity
                                    key={estrato}
                                    style={[
                                        styles.dropdownItem,
                                        selectedEstrato === estrato && { backgroundColor: `${modeColors.accent}20` }
                                    ]}
                                    onPress={() => handleEstratoSelect(estrato)}
                                >
                                    <Text style={[styles.dropdownItemText, { color: selectedEstrato === estrato ? modeColors.accent : colors.text }]}>
                                        Estrato {estrato}
                                    </Text>
                                    {selectedEstrato === estrato && (
                                        <Ionicons name="checkmark" size={18} color={modeColors.accent} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </Animated.View>
            </View>

            {/* Zona */}
            <Animated.View
                style={[
                    styles.zonaContainer,
                    {
                        opacity: zonaOpacity,
                        transform: [{ translateY: zonaY }],
                    },
                ]}
            >
                <TouchableOpacity
                    style={[
                        styles.filterButton,
                        styles.zonaButton,
                        {
                            backgroundColor: colors.inputBackground,
                            borderColor: showZonaDropdown || selectedZona ? modeColors.accent : colors.border,
                        }
                    ]}
                    onPress={() => toggleDropdown('zona')}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="location-outline"
                        size={18}
                        color={selectedZona ? modeColors.accent : colors.textSecondary}
                    />
                    <Text style={[styles.filterButtonText, { color: selectedZona ? modeColors.accent : colors.text, flex: 1 }]}>
                        {selectedZona
                            ? zonaOptions.find(z => z.value === selectedZona)?.label || 'Zona/Sector'
                            : 'Zona/Sector'
                        }
                    </Text>
                    <Ionicons
                        name={showZonaDropdown ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={colors.textSecondary}
                    />
                </TouchableOpacity>

                {showZonaDropdown && (
                    <View style={[styles.dropdown, styles.zonaDropdown, { backgroundColor: colors.dropdownBackground, borderColor: modeColors.accent }]}>
                        {zonaOptions.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                style={[
                                    styles.dropdownItem,
                                    selectedZona === option.value && { backgroundColor: `${modeColors.accent}20` }
                                ]}
                                onPress={() => handleZonaSelect(option.value)}
                            >
                                <Text style={[styles.dropdownItemText, { color: selectedZona === option.value ? modeColors.accent : colors.text }]}>
                                    {option.label}
                                </Text>
                                {selectedZona === option.value && (
                                    <Ionicons name="checkmark" size={18} color={modeColors.accent} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </Animated.View>

            {/* Clear Filters */}
            {hasActiveFilters && (
                <TouchableOpacity
                    style={[styles.clearButton, { borderColor: modeColors.accent }]}
                    onPress={handleClearFilters}
                >
                    <Ionicons name="close-circle-outline" size={16} color={modeColors.accent} />
                    <Text style={[styles.clearButtonText, { color: modeColors.accent }]}>
                        Limpiar filtros
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        overflow: 'visible',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 14,
        gap: 10,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        padding: 0,
    },
    filtersRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    filterColumn: {
        flex: 2,
        zIndex: 3,
    },
    filterColumnSmall: {
        flex: 1,
        zIndex: 2,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        gap: 8,
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    dropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: 6,
        borderRadius: 12,
        borderWidth: 1.5,
        padding: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 100,
    },
    dropdownSmall: {
        padding: 8,
    },
    dropdownLabel: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    priceInput: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        fontSize: 14,
    },
    applyButton: {
        marginTop: 14,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    applyButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 10,
    },
    dropdownItemText: {
        fontSize: 14,
        fontWeight: '500',
    },
    zonaContainer: {
        zIndex: 1,
        marginBottom: 12,
    },
    zonaButton: {
        width: '100%',
    },
    zonaDropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: 6,
        padding: 8,
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        gap: 8,
        marginTop: 4,
    },
    clearButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
});

export default RealEstateFilters;
