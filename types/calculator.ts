export interface TariffRates {
    effectiveDate: string;
    generalDomesticTariff: GeneralDomesticTariff;
    timeOfUseTariff: TimeOfUseTariff;
}

export interface EEITier {
    usageKWhRange: string;
    rateSenPerKWh: number;
}

export interface GeneralDomesticTariff {
    description: string;
    components: {
        generationCharge: {
            description: string;
            tier1: {
                usageKWhRange: string;
                rateSenPerKWh: number;
            };
            tier2: {
                usageKWhRange: string;
                rateSenPerKWh: number;
            };
        };
        capacityCharge: {
            description: string;
            rateSenPerKWh: number;
        };
        networkCharge: {
            description: string;
            rateSenPerKWh: number;
        };
        retailCharge: {
            description: string;
            monthlyFeeRM: number;
            waiverCondition: string;
        };
        automaticFuelAdjustment: {
            description: string;
        };
        energyEfficiencyIncentive: {
            description: string;
            rebateSenPerKWh: string;
            condition: string;
        };
    };
    energyEfficiencyIncentive: {
        description: string;
        rebateSenPerKWh: string;
        condition: string;
        tiers: EEITier[];
    };
}

export interface TimeOfUseTariff {
    schemeName: string;
    availability: string;
    applicationProcess: string;
    switchProcessingTime: {
        smartMeterActivated: string;
        smartMeterNotActivated: string;
    };
    switchBackFee: string;
    timeZones: {
        weekdays: {
            peakHours: string;
            offPeakHours: string;
        };
        weekendsAndPublicHolidays: {
            offPeakHours: string;
        };
        publicHolidaysList: string[];
    };
    energyChargeToURates: {
        description: string;
        usageUpTo1500KWhPerMonth: {
            peakRateSenPerKWh: number;
            offPeakRateSenPerKWh: number;
        };
        usageOver1500KWhPerMonth: {
            peakRateSenPerKWh: number;
            offPeakRateSenPerKWh: number;
        };
    };
}

export interface CalculatorInputs {
    monthlyUsageKWh: number;
    tariffType: 'old' | 'new';
    enableToU: boolean;
    touPeakPercentage: number;
    enableSolar: boolean;
    solarExcessKWh: number;
    afaSenPerKWh: number; // AFA rate in sen/kWh for new tariff
}

export interface BillBreakdown {
    generationCharge: number;
    capacityCharge: number;
    networkCharge: number;
    retailCharge: number;
    automaticFuelAdjustment: number;
    energyEfficiencyIncentive: number;
    renewableEnergyFund?: number; // Old tariff
    serviceTax?: number; // Old tariff
    kwtbb?: number; // New tariff - Kumpulan Wang Tenaga Boleh Baharu
    sst?: number; // New tariff - Service Tax
    totalAmount: number;
}

export interface CalculationResult {
    inputs: CalculatorInputs;
    breakdown: BillBreakdown;
    detailedCalculation: string[];
    solarSavings?: number;
    touComparison?: {
        generalTariffAmount: number;
        touAmount: number;
        savings: number;
        savingsPercentage: number;
    };
}

// Old tariff structure (pre-July 2025)
export interface OldTariffRates {
    blocks: {
        range: string;
        rateSenPerKWh: number;
        maxKWh: number;
    }[];
    renewableEnergyFund: number; // 1.6%
    serviceTaxThreshold: number; // 600 kWh
    serviceTaxRate: number; // 8%
} 