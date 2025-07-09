# Calculator Store Documentation

## Overview

This directory contains the Zustand store implementation for the TNB Calculator application. The store manages all calculator state, inputs, and complex calculations.

## Files

- `calculatorStore.ts` - Main store implementation with all logic
- `../types/store.ts` - TypeScript types for the store

## Store Structure

### State

- `inputs` - All calculator input values
- `result` - Calculation results
- `isCalculating` - Loading state
- `error` - Error state

### Actions

- Input setters (automatically trigger recalculation)
- `calculate()` - Manual calculation trigger
- `resetInputs()` - Reset to default values
- `resetAll()` - Reset everything
- Error handling actions

### Selectors

Optimized selectors for performance:

- `calculatorSelectors.inputs` - All inputs
- `calculatorSelectors.result` - Calculation result
- `calculatorSelectors.billSummary` - Optimized summary data
- `calculatorSelectors.breakdownData` - Breakdown table data
- `calculatorSelectors.tariffInfo` - Tariff information

## Usage

```typescript
import {
  useCalculatorStore,
  calculatorSelectors,
} from "./store/calculatorStore";

// In a component
const inputs = useCalculatorStore(calculatorSelectors.inputs);
const setMonthlyUsage = useCalculatorStore((state) => state.setMonthlyUsage);
const result = useCalculatorStore(calculatorSelectors.result);
```

## Key Features

1. **Automatic Calculation** - Inputs trigger automatic recalculation
2. **Error Handling** - Comprehensive error states
3. **Loading States** - UI feedback during calculations
4. **Optimized Selectors** - Prevent unnecessary re-renders
5. **DevTools Support** - Zustand DevTools integration

## Migration from Local State

The store replaces:

- Local `useState` in components
- `useMemo` for calculations
- Manual state management
- Complex prop drilling

All calculation logic from `utils/calculator.ts` has been moved into the store for better organization and performance.
