import type { CalculatorInputs, CalculationResult, BillBreakdown } from './calculator';

export interface CalculatorState {
    // Input state
    inputs: CalculatorInputs;

    // Calculation results
    result: CalculationResult | null;

    // Loading state
    isCalculating: boolean;

    // Error state
    error: string | null;
}

export interface CalculatorActions {
    // Input actions
    setMonthlyUsage: (usage: number) => void;
    setTariffType: (tariffType: 'old' | 'new') => void;
    setEnableToU: (enabled: boolean) => void;
    setTouPeakPercentage: (percentage: number) => void;
    setEnableSolar: (enabled: boolean) => void;
    setSolarExcessKWh: (excess: number) => void;
    setAfaSenPerKWh: (afa: number) => void;

    // Calculation actions
    calculate: () => void;
    recalculate: () => void;

    // Reset actions
    resetInputs: () => void;
    resetAll: () => void;

    // Error handling
    setError: (error: string | null) => void;
    clearError: () => void;
}

export interface CalculatorStore extends CalculatorState, CalculatorActions { }

// Selector types for optimized component subscriptions
export interface CalculatorSelectors {
    // Input selectors
    inputs: (state: CalculatorStore) => CalculatorInputs;
    monthlyUsage: (state: CalculatorStore) => number;
    tariffType: (state: CalculatorStore) => 'old' | 'new';
    enableToU: (state: CalculatorStore) => boolean;
    touPeakPercentage: (state: CalculatorStore) => number;
    enableSolar: (state: CalculatorStore) => boolean;
    solarExcessKWh: (state: CalculatorStore) => number;
    afaSenPerKWh: (state: CalculatorStore) => number;

    // Result selectors
    result: (state: CalculatorStore) => CalculationResult | null;
    breakdown: (state: CalculatorStore) => BillBreakdown | null;
    detailedCalculation: (state: CalculatorStore) => string[];
    solarSavings: (state: CalculatorStore) => number | undefined;
    touComparison: (state: CalculatorStore) => CalculationResult['touComparison'];
    totalAmount: (state: CalculatorStore) => number;

    // State selectors
    isCalculating: (state: CalculatorStore) => boolean;
    error: (state: CalculatorStore) => string | null;
    hasResult: (state: CalculatorStore) => boolean;
} 