import { useQueryStates, parseAsFloat, parseAsBoolean, parseAsString } from 'nuqs';
import type { CalculatorInputs } from '../types/calculator';

// Define the URL state parsers for each input field
const urlStateConfig = {
    monthlyUsageKWh: parseAsFloat.withDefault(0),
    tariffType: parseAsString.withDefault('new'),
    enableToU: parseAsBoolean.withDefault(false),
    touPeakPercentage: parseAsFloat.withDefault(30),
    enableSolar: parseAsBoolean.withDefault(false),
    solarExcessKWh: parseAsFloat.withDefault(0),
    afaSenPerKWh: parseAsFloat.withDefault(0),
};

// Custom hook to manage URL state for calculator inputs
export function useUrlState() {
    const [urlState, setUrlState] = useQueryStates(urlStateConfig, {
        // Options for URL state management
        shallow: true, // Update URL without causing page reload
        throttleMs: 300, // Throttle URL updates to avoid excessive history entries
        clearOnDefault: true, // Remove parameter from URL when it equals default value
    });

    // Convert URL state to CalculatorInputs format
    const inputs: CalculatorInputs = {
        monthlyUsageKWh: urlState.monthlyUsageKWh,
        tariffType: urlState.tariffType as 'old' | 'new',
        enableToU: urlState.enableToU,
        touPeakPercentage: urlState.touPeakPercentage,
        enableSolar: urlState.enableSolar,
        solarExcessKWh: urlState.solarExcessKWh,
        afaSenPerKWh: urlState.afaSenPerKWh,
    };

    // Helper functions to update individual input values
    const updateInputs = {
        setMonthlyUsage: (monthlyUsageKWh: number) =>
            setUrlState({ monthlyUsageKWh }),

        setTariffType: (tariffType: 'old' | 'new') =>
            setUrlState({ tariffType }),

        setEnableToU: (enableToU: boolean) =>
            setUrlState({ enableToU }),

        setTouPeakPercentage: (touPeakPercentage: number) =>
            setUrlState({ touPeakPercentage }),

        setEnableSolar: (enableSolar: boolean) =>
            setUrlState({ enableSolar }),

        setSolarExcessKWh: (solarExcessKWh: number) =>
            setUrlState({ solarExcessKWh }),

        setAfaSenPerKWh: (afaSenPerKWh: number) =>
            setUrlState({ afaSenPerKWh }),

        // Bulk update function
        updateAll: (newInputs: Partial<CalculatorInputs>) =>
            setUrlState(newInputs),

        // Reset to defaults
        reset: () => setUrlState({
            monthlyUsageKWh: 0,
            tariffType: 'new',
            enableToU: false,
            touPeakPercentage: 30,
            enableSolar: false,
            solarExcessKWh: 0,
            afaSenPerKWh: 0,
        }),
    };

    return {
        inputs,
        ...updateInputs,
    };
} 