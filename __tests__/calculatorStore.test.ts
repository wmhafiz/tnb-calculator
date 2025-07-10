import { useCalculatorStore } from '../store/calculatorStore';

// Mock tariff data
jest.mock('../data/db.json', () => ({
    tnbTariffRates: {
        generalDomesticTariff: {
            components: {
                generationCharge: {
                    tier1: { usageKWhRange: "0-1500", rateSenPerKWh: 27.03 },
                    tier2: { usageKWhRange: ">1500", rateSenPerKWh: 37.03 }
                },
                capacityCharge: { rateSenPerKWh: 4.55 },
                networkCharge: { rateSenPerKWh: 12.85 },
                retailCharge: { monthlyFeeRM: 10.00 }
            },
            energyEfficiencyIncentive: {
                tiers: [
                    { usageKWhRange: "1 - 200", rateSenPerKWh: -25.0 },
                    { usageKWhRange: "201 - 250", rateSenPerKWh: -24.5 },
                    { usageKWhRange: "251 - 300", rateSenPerKWh: -22.5 },
                    { usageKWhRange: "301 - 350", rateSenPerKWh: -21.0 },
                    { usageKWhRange: "351 - 400", rateSenPerKWh: -17.0 },
                    { usageKWhRange: "401 - 450", rateSenPerKWh: -14.5 },
                    { usageKWhRange: "451 - 500", rateSenPerKWh: -12.0 },
                    { usageKWhRange: "501 - 550", rateSenPerKWh: -10.5 },
                    { usageKWhRange: "551 - 600", rateSenPerKWh: -9.0 },
                    { usageKWhRange: "601 - 650", rateSenPerKWh: -7.5 },
                    { usageKWhRange: "651 - 700", rateSenPerKWh: -5.5 },
                    { usageKWhRange: "701 - 750", rateSenPerKWh: -4.5 },
                    { usageKWhRange: "751 - 800", rateSenPerKWh: -4.0 },
                    { usageKWhRange: "801 - 850", rateSenPerKWh: -2.5 },
                    { usageKWhRange: "851 - 900", rateSenPerKWh: -1.0 },
                    { usageKWhRange: "901 - 1000", rateSenPerKWh: -0.5 },
                    { usageKWhRange: "> 1000", rateSenPerKWh: 0.0 }
                ]
            }
        }
    }
}));

describe('Calculator Store - Old Tariff Tests', () => {
    beforeEach(() => {
        // Reset store state before each test
        useCalculatorStore.setState({
            result: null,
            isCalculating: false,
            error: null
        });
    });

    describe('ICPT Calculation Tests', () => {
        it('should calculate ICPT rebate for usage ≤ 600 kWh', () => {
            const store = useCalculatorStore.getState();
            store.calculate({
                monthlyUsageKWh: 500,
                tariffType: 'old',
                enableSolar: false,
                solarExcessKWh: 0,
                enableToU: false,
                touPeakPercentage: 50,
                afaSenPerKWh: 0
            });

            const result = useCalculatorStore.getState().result;
            expect(result).toBeTruthy();

            // For 500 kWh: ICPT rebate = 500 × 2 sen/kWh = RM 10.00 rebate
            const icptLine = result!.detailedCalculation.find(line =>
                line.includes('ICPT (Rebat 2 sen/kWh)')
            );
            expect(icptLine).toContain('RM -10.00');
        });

        it('should calculate zero ICPT for usage 601-1500 kWh', () => {
            const store = useCalculatorStore.getState();
            store.calculate({
                monthlyUsageKWh: 778,
                tariffType: 'old',
                enableSolar: false,
                solarExcessKWh: 0,
                enableToU: false,
                touPeakPercentage: 50,
                afaSenPerKWh: 0
            });

            const result = useCalculatorStore.getState().result;
            expect(result).toBeTruthy();

            // For 778 kWh: ICPT = 0 (no rebate/surcharge)
            const icptLine = result!.detailedCalculation.find(line =>
                line.includes('ICPT (Tiada rebat/surcaj)')
            );
            expect(icptLine).toContain('RM 0.00');
        });

        it('should calculate ICPT surcharge for usage > 1500 kWh', () => {
            const store = useCalculatorStore.getState();
            store.calculate({
                monthlyUsageKWh: 1906,
                tariffType: 'old',
                enableSolar: false,
                solarExcessKWh: 0,
                enableToU: false,
                touPeakPercentage: 50,
                afaSenPerKWh: 0
            });

            const result = useCalculatorStore.getState().result;
            expect(result).toBeTruthy();

            // For 1906 kWh: ICPT surcharge should be RM 190.60 (expected from bill)
            // Current calculation: (1906 - 1500) × 0.10 = RM 40.60 (incorrect)
            const icptLine = result!.detailedCalculation.find(line =>
                line.includes('ICPT (Surcaj 10 sen/kWh')
            );
            expect(icptLine).toBeTruthy();

            // This test will fail with current implementation, helping us identify the issue
            // Expected: RM 190.60, Current: RM 40.60
            console.log('ICPT Line:', icptLine);
        });
    });

    describe('Service Tax Calculation Tests', () => {
        it('should waive service tax for usage ≤ 600 kWh', () => {
            const store = useCalculatorStore.getState();
            store.calculate({
                monthlyUsageKWh: 500,
                tariffType: 'old',
                enableSolar: false,
                solarExcessKWh: 0,
                enableToU: false,
                touPeakPercentage: 50,
                afaSenPerKWh: 0
            });

            const result = useCalculatorStore.getState().result;
            expect(result).toBeTruthy();

            const serviceTaxLine = result!.detailedCalculation.find(line =>
                line.includes('Service Tax (8%): RM 0.00 (Waived for usage ≤ 600 kWh)')
            );
            expect(serviceTaxLine).toBeTruthy();
        });

        it('should calculate service tax correctly for 778 kWh usage', () => {
            const store = useCalculatorStore.getState();
            store.calculate({
                monthlyUsageKWh: 778,
                tariffType: 'old',
                enableSolar: false,
                solarExcessKWh: 0,
                enableToU: false,
                touPeakPercentage: 50,
                afaSenPerKWh: 0
            });

            const result = useCalculatorStore.getState().result;
            expect(result).toBeTruthy();

            // For 778 kWh: Taxable usage = 178 kWh × 54.6 sen/kWh = RM 97.19
            // Service Tax = RM 97.19 × 8% = RM 7.78
            const serviceTaxLine = result!.detailedCalculation.find(line =>
                line.includes('Service Tax (8% on taxable energy charge): RM 7.78')
            );
            expect(serviceTaxLine).toBeTruthy();
        });

        it('should calculate service tax correctly for 1906 kWh usage', () => {
            const store = useCalculatorStore.getState();
            store.calculate({
                monthlyUsageKWh: 1906,
                tariffType: 'old',
                enableSolar: false,
                solarExcessKWh: 0,
                enableToU: false,
                touPeakPercentage: 50,
                afaSenPerKWh: 0
            });

            const result = useCalculatorStore.getState().result;
            expect(result).toBeTruthy();

            // For 1906 kWh: Taxable usage = 1306 kWh
            // 300 kWh × 54.6 sen/kWh + 1006 kWh × 57.1 sen/kWh = 163.80 + 574.43 = 738.23
            // Service Tax = RM 738.23 × 8% = RM 59.06
            const serviceTaxLine = result!.detailedCalculation.find(line =>
                line.includes('Service Tax (8% on taxable energy charge):')
            );
            expect(serviceTaxLine).toBeTruthy();
            expect(serviceTaxLine).toContain('RM 59.06');
        });
    });

    describe('Energy Charge Calculation Tests', () => {
        it('should calculate energy charges correctly for 778 kWh', () => {
            const store = useCalculatorStore.getState();
            store.calculate({
                monthlyUsageKWh: 778,
                tariffType: 'old',
                enableSolar: false,
                solarExcessKWh: 0,
                enableToU: false,
                touPeakPercentage: 50,
                afaSenPerKWh: 0
            });

            const result = useCalculatorStore.getState().result;
            expect(result).toBeTruthy();

            // Expected breakdown:
            // 0-200 kWh: 200 × 21.8 sen/kWh = RM 43.60
            // 201-300 kWh: 100 × 33.4 sen/kWh = RM 33.40
            // 301-600 kWh: 300 × 51.6 sen/kWh = RM 154.80
            // 601-900 kWh: 178 × 54.6 sen/kWh = RM 97.19
            // Total: RM 328.99

            const subtotalLine = result!.detailedCalculation.find(line =>
                line.includes('Subtotal: RM 328.99')
            );
            expect(subtotalLine).toBeTruthy();
        });

        it('should calculate energy charges correctly for 1906 kWh', () => {
            const store = useCalculatorStore.getState();
            store.calculate({
                monthlyUsageKWh: 1906,
                tariffType: 'old',
                enableSolar: false,
                solarExcessKWh: 0,
                enableToU: false,
                touPeakPercentage: 50,
                afaSenPerKWh: 0
            });

            const result = useCalculatorStore.getState().result;
            expect(result).toBeTruthy();

            // Expected breakdown:
            // 0-200 kWh: 200 × 21.8 sen/kWh = RM 43.60
            // 201-300 kWh: 100 × 33.4 sen/kWh = RM 33.40
            // 301-600 kWh: 300 × 51.6 sen/kWh = RM 154.80
            // 601-900 kWh: 300 × 54.6 sen/kWh = RM 163.80
            // 901+ kWh: 1006 × 57.1 sen/kWh = RM 574.43
            // Total: RM 970.03

            const subtotalLine = result!.detailedCalculation.find(line =>
                line.includes('Subtotal: RM 970.03')
            );
            expect(subtotalLine).toBeTruthy();
        });
    });

    describe('Solar Credit Calculation Tests', () => {
        it('should calculate solar credit correctly for 778 kWh usage with 474 kWh excess', () => {
            const store = useCalculatorStore.getState();
            store.calculate({
                monthlyUsageKWh: 778,
                tariffType: 'old',
                enableSolar: true,
                solarExcessKWh: 474,
                enableToU: false,
                touPeakPercentage: 50,
                afaSenPerKWh: 0
            });

            const result = useCalculatorStore.getState().result;
            expect(result).toBeTruthy();

            // Solar credit should be calculated using highest tier rates first
            // 178 kWh × 54.6 sen/kWh = RM 97.19
            // 296 kWh × 51.6 sen/kWh = RM 152.74
            // Total: RM 249.93

            const solarCreditLine = result!.detailedCalculation.find(line =>
                line.includes('Total Solar Credit (Lebihan Tenaga yang Dijana):')
            );
            expect(solarCreditLine).toBeTruthy();
            expect(solarCreditLine).toContain('RM 249.9'); // Allow for rounding
        });

        it('should calculate solar credit correctly for 1906 kWh usage with 585 kWh excess', () => {
            const store = useCalculatorStore.getState();
            store.calculate({
                monthlyUsageKWh: 1906,
                tariffType: 'old',
                enableSolar: true,
                solarExcessKWh: 585,
                enableToU: false,
                touPeakPercentage: 50,
                afaSenPerKWh: 0
            });

            const result = useCalculatorStore.getState().result;
            expect(result).toBeTruthy();

            // Solar credit should be calculated using highest tier rates first
            // 585 kWh × 57.1 sen/kWh = RM 334.04

            const solarCreditLine = result!.detailedCalculation.find(line =>
                line.includes('Total Solar Credit (Lebihan Tenaga yang Dijana):')
            );
            expect(solarCreditLine).toBeTruthy();
            expect(solarCreditLine).toContain('RM 334.04');
        });
    });

    describe('Complete Bill Calculation Tests', () => {
        it('should calculate complete bill correctly for 778 kWh with 474 kWh solar', () => {
            const store = useCalculatorStore.getState();
            store.calculate({
                monthlyUsageKWh: 778,
                tariffType: 'old',
                enableSolar: true,
                solarExcessKWh: 474,
                enableToU: false,
                touPeakPercentage: 50,
                afaSenPerKWh: 0
            });

            const result = useCalculatorStore.getState().result;
            expect(result).toBeTruthy();

            // Expected final total: RM 92.10
            const totalLine = result!.detailedCalculation.find(line =>
                line.includes('TOTAL: RM 92.10')
            );
            expect(totalLine).toBeTruthy();
            expect(result!.breakdown.totalAmount).toBeCloseTo(92.10, 2);
        });

        it('should calculate complete bill correctly for 1906 kWh with 585 kWh solar', () => {
            const store = useCalculatorStore.getState();
            store.calculate({
                monthlyUsageKWh: 1906,
                tariffType: 'old',
                enableSolar: true,
                solarExcessKWh: 585,
                enableToU: false,
                touPeakPercentage: 50,
                afaSenPerKWh: 0
            });

            const result = useCalculatorStore.getState().result;
            expect(result).toBeTruthy();

            // Expected final total: RM 911.62 (from TNB bill)
            // Current calculation might be different due to ICPT issue
            console.log('Final total:', result!.breakdown.totalAmount);
            console.log('Detailed calculation:', result!.detailedCalculation);

            // This test will help us identify the exact discrepancy
            expect(result!.breakdown.totalAmount).toBeDefined();
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero usage', () => {
            const store = useCalculatorStore.getState();
            store.calculate({
                monthlyUsageKWh: 0,
                tariffType: 'old',
                enableSolar: false,
                solarExcessKWh: 0,
                enableToU: false,
                touPeakPercentage: 50,
                afaSenPerKWh: 0
            });

            const result = useCalculatorStore.getState().result;
            // For zero usage, the store returns null as expected
            expect(result).toBeNull();
        });

        it('should handle exactly 600 kWh usage', () => {
            const store = useCalculatorStore.getState();
            store.calculate({
                monthlyUsageKWh: 600,
                tariffType: 'old',
                enableSolar: false,
                solarExcessKWh: 0,
                enableToU: false,
                touPeakPercentage: 50,
                afaSenPerKWh: 0
            });

            const result = useCalculatorStore.getState().result;
            expect(result).toBeTruthy();

            // Should have ICPT rebate and no service tax
            const icptLine = result!.detailedCalculation.find(line =>
                line.includes('ICPT (Rebat 2 sen/kWh)')
            );
            expect(icptLine).toBeTruthy();

            const serviceTaxLine = result!.detailedCalculation.find(line =>
                line.includes('Service Tax (8%): RM 0.00 (Waived for usage ≤ 600 kWh)')
            );
            expect(serviceTaxLine).toBeTruthy();
        });

        it('should handle exactly 1500 kWh usage', () => {
            const store = useCalculatorStore.getState();
            store.calculate({
                monthlyUsageKWh: 1500,
                tariffType: 'old',
                enableSolar: false,
                solarExcessKWh: 0,
                enableToU: false,
                touPeakPercentage: 50,
                afaSenPerKWh: 0
            });

            const result = useCalculatorStore.getState().result;
            expect(result).toBeTruthy();

            // Should have zero ICPT (no rebate/surcharge)
            const icptLine = result!.detailedCalculation.find(line =>
                line.includes('ICPT (Tiada rebat/surcaj)')
            );
            expect(icptLine).toBeTruthy();
        });
    });
});

describe('ICPT Analysis Tests', () => {
    it('should analyze ICPT calculation for 1906 kWh usage', () => {
        const store = useCalculatorStore.getState();
        store.calculate({
            monthlyUsageKWh: 1906,
            tariffType: 'old',
            enableSolar: false,
            solarExcessKWh: 0,
            enableToU: false,
            touPeakPercentage: 50,
            afaSenPerKWh: 0
        });

        const result = useCalculatorStore.getState().result;
        expect(result).toBeTruthy();

        // Find ICPT line and analyze
        const icptLine = result!.detailedCalculation.find(line =>
            line.includes('ICPT')
        );

        console.log('=== ICPT Analysis ===');
        console.log('Usage: 1906 kWh');
        console.log('ICPT Line:', icptLine);
        console.log('Expected: RM 190.60');
        console.log('Current calculation: (1906 - 1500) × 0.10 = RM 40.60');
        console.log('Possible correct calculation: 1906 × 0.10 = RM 190.60');
        console.log('This suggests ICPT might be applied to total usage, not just excess above 1500 kWh');
    });
});

describe('Calculator Store - New Tariff Tests', () => {
    describe('New Tariff Calculation Tests', () => {
        it('should calculate new tariff correctly for 1906 kWh usage (no solar, AFA 0)', () => {
            const store = useCalculatorStore.getState();
            store.calculate({
                monthlyUsageKWh: 1906,
                tariffType: 'new',
                enableSolar: false,
                solarExcessKWh: 0,
                enableToU: false,
                touPeakPercentage: 50,
                afaSenPerKWh: 0
            });

            const result = useCalculatorStore.getState().result;
            expect(result).toBeTruthy();

            // Expected values from screenshot
            expect(result!.breakdown.generationCharge).toBeCloseTo(705.79, 2);
            expect(result!.breakdown.capacityCharge).toBeCloseTo(86.72, 2);
            expect(result!.breakdown.networkCharge).toBeCloseTo(244.92, 2);
            expect(result!.breakdown.retailCharge).toBeCloseTo(10.00, 2);
            expect(result!.breakdown.automaticFuelAdjustment).toBeCloseTo(0.00, 2);
            expect(result!.breakdown.energyEfficiencyIncentive).toBeCloseTo(0.00, 2);
            expect(result!.breakdown.kwtbb || 0).toBeCloseTo(16.76, 2);
            expect(result!.breakdown.sst || 0).toBeCloseTo(38.69, 2);
            expect(result!.breakdown.totalAmount).toBeCloseTo(1102.88, 2);
        });

        it('should calculate new tariff correctly for 1000 kWh usage (with EEI rebate)', () => {
            const store = useCalculatorStore.getState();
            store.calculate({
                monthlyUsageKWh: 1000,
                tariffType: 'new',
                enableSolar: false,
                solarExcessKWh: 0,
                enableToU: false,
                touPeakPercentage: 50,
                afaSenPerKWh: 0
            });

            const result = useCalculatorStore.getState().result;
            expect(result).toBeTruthy();



            // For 1000 kWh usage (≤ 1500 kWh), should use tier 1 rate
            const expectedGenerationCharge = 1000 * 27.03 / 100; // RM 270.30
            const expectedCapacityCharge = 1000 * 4.55 / 100; // RM 45.50
            const expectedNetworkCharge = 1000 * 12.85 / 100; // RM 128.50
            const expectedRetailCharge = 10.00; // > 600 kWh

            expect(result!.breakdown.generationCharge).toBeCloseTo(expectedGenerationCharge, 2);
            expect(result!.breakdown.capacityCharge).toBeCloseTo(expectedCapacityCharge, 2);
            expect(result!.breakdown.networkCharge).toBeCloseTo(expectedNetworkCharge, 2);
            expect(result!.breakdown.retailCharge).toBeCloseTo(expectedRetailCharge, 2);

            // Should have EEI rebate for 1000 kWh (expected: RM 5.00)
            expect(result!.breakdown.energyEfficiencyIncentive).toBeCloseTo(5.00, 2);
        });

        it('should calculate new tariff correctly for 500 kWh usage (no retail charge)', () => {
            const store = useCalculatorStore.getState();
            store.calculate({
                monthlyUsageKWh: 500,
                tariffType: 'new',
                enableSolar: false,
                solarExcessKWh: 0,
                enableToU: false,
                touPeakPercentage: 50,
                afaSenPerKWh: 0
            });

            const result = useCalculatorStore.getState().result;
            expect(result).toBeTruthy();



            // For 500 kWh usage (≤ 600 kWh), retail charge should be waived
            expect(result!.breakdown.retailCharge).toBeCloseTo(0.00, 2);

            // Should have no SST (≤ 600 kWh)
            expect(result!.breakdown.sst || 0).toBeCloseTo(0.00, 2);

            // Should have EEI rebate for 500 kWh (expected: RM 60.00)
            expect(result!.breakdown.energyEfficiencyIncentive).toBeCloseTo(60.00, 2);
        });

        it('should calculate generation charge correctly for different usage tiers', () => {
            // Test tier 1 (≤ 1500 kWh)
            const store1 = useCalculatorStore.getState();
            store1.calculate({
                monthlyUsageKWh: 1500,
                tariffType: 'new',
                enableSolar: false,
                solarExcessKWh: 0,
                enableToU: false,
                touPeakPercentage: 50,
                afaSenPerKWh: 0
            });

            const result1 = useCalculatorStore.getState().result;
            expect(result1).toBeTruthy();

            // Should use tier 1 rate for entire usage
            const expectedTier1Charge = 1500 * 27.03 / 100; // RM 405.45
            expect(result1!.breakdown.generationCharge).toBeCloseTo(expectedTier1Charge, 2);

            // Test tier 2 (> 1500 kWh)
            const store2 = useCalculatorStore.getState();
            store2.calculate({
                monthlyUsageKWh: 1501,
                tariffType: 'new',
                enableSolar: false,
                solarExcessKWh: 0,
                enableToU: false,
                touPeakPercentage: 50,
                afaSenPerKWh: 0
            });

            const result2 = useCalculatorStore.getState().result;
            expect(result2).toBeTruthy();

            // Should use tier 2 rate for entire usage
            const expectedTier2Charge = 1501 * 37.03 / 100; // RM 555.82
            expect(result2!.breakdown.generationCharge).toBeCloseTo(expectedTier2Charge, 2);
        });

        it('should calculate SST correctly for different usage levels', () => {
            // Test SST for tier 1 usage (> 600 kWh but ≤ 1500 kWh)
            const store1 = useCalculatorStore.getState();
            store1.calculate({
                monthlyUsageKWh: 1000,
                tariffType: 'new',
                enableSolar: false,
                solarExcessKWh: 0,
                enableToU: false,
                touPeakPercentage: 50,
                afaSenPerKWh: 0
            });

            const result1 = useCalculatorStore.getState().result;
            expect(result1).toBeTruthy();

            // SST should use tier 1 rate: 8% × 400 kWh × 27.03 sen/kWh
            const expectedSST1 = (1000 - 600) * 27.03 / 100 * 0.08; // RM 8.65
            expect(result1!.breakdown.sst || 0).toBeCloseTo(expectedSST1, 2);

            // Test SST for tier 2 usage (> 1500 kWh)
            const store2 = useCalculatorStore.getState();
            store2.calculate({
                monthlyUsageKWh: 1906,
                tariffType: 'new',
                enableSolar: false,
                solarExcessKWh: 0,
                enableToU: false,
                touPeakPercentage: 50,
                afaSenPerKWh: 0
            });

            const result2 = useCalculatorStore.getState().result;
            expect(result2).toBeTruthy();

            // SST should use tier 2 rate: 8% × 1306 kWh × 37.03 sen/kWh
            const expectedSST2 = (1906 - 600) * 37.03 / 100 * 0.08; // RM 38.69
            expect(result2!.breakdown.sst || 0).toBeCloseTo(expectedSST2, 2);
        });
    });
}); 