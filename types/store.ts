import type { CalculatorInputs, CalculationResult, BillBreakdown } from './calculator';

export interface CalculatorState {
    // Calculation results
    result: CalculationResult | null;

    // Loading state
    isCalculating: boolean;

    // Error state
    error: string | null;
}

export interface CalculatorActions {
    // Calculation actions
    calculate: (inputs: CalculatorInputs) => void;
    recalculate: (inputs: CalculatorInputs) => void;

    // Reset actions
    resetAll: () => void;

    // Error handling
    setError: (error: string | null) => void;
    clearError: () => void;
}

export interface CalculatorStore extends CalculatorState, CalculatorActions { }

// Selector types for optimized component subscriptions
export interface CalculatorSelectors {
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