import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { CalculatorStore } from '../types/store';
import type { CalculatorInputs, CalculationResult, BillBreakdown, OldTariffRates } from '../types/calculator';
import tariffData from '../data/db.json';

// Default inputs - now only used for reference
const defaultInputs: CalculatorInputs = {
    monthlyUsageKWh: 0,
    tariffType: 'new',
    enableToU: false,
    touPeakPercentage: 30,
    enableSolar: false,
    solarExcessKWh: 0,
    afaSenPerKWh: 0.0,
};

// Old tariff rates (pre-July 2025) - 5-block structure
const OLD_TARIFF_RATES: OldTariffRates = {
    blocks: [
        { range: '0-200 kWh', rateSenPerKWh: 21.80, maxKWh: 200 },
        { range: '201-300 kWh', rateSenPerKWh: 33.40, maxKWh: 100 },
        { range: '301-600 kWh', rateSenPerKWh: 51.60, maxKWh: 300 },
        { range: '601-900 kWh', rateSenPerKWh: 54.60, maxKWh: 300 },
        { range: '901+ kWh', rateSenPerKWh: 57.10, maxKWh: Infinity }
    ],
    renewableEnergyFund: 0.016, // 1.6%
    serviceTaxThreshold: 600,
    serviceTaxRate: 0.08 // 8%
};

/**
 * Parse EEI tier range string to extract min and max kWh values
 */
function parseEEITierRange(rangeString: string): { minKWh: number; maxKWh: number } {
    if (rangeString.includes('> 1000')) {
        return { minKWh: 1001, maxKWh: Infinity };
    }

    const parts = rangeString.split(' - ');
    if (parts.length === 2) {
        return {
            minKWh: parseInt(parts[0].trim()),
            maxKWh: parseInt(parts[1].trim())
        };
    }

    return { minKWh: 0, maxKWh: 0 };
}

/**
 * Calculate tiered Energy Efficiency Incentive (EEI) rebate
 */
function calculateTieredEEI(netConsumption: number): { rebate: number; breakdown: string[]; effectiveRate: number } {
    const breakdown: string[] = [];
    let totalRebate = 0;

    if (netConsumption <= 0) {
        return { rebate: 0, breakdown: ['No EEI rebate (net consumption ≤ 0 kWh)'], effectiveRate: 0 };
    }

    if (netConsumption > 1000) {
        return { rebate: 0, breakdown: ['RM 0.00 (Not applicable for net consumption > 1000 kWh)'], effectiveRate: 0 };
    }

    const eeiTiers = tariffData.tnbTariffRates.generalDomesticTariff.energyEfficiencyIncentive.tiers;

    const applicableTier = eeiTiers.find(tier => {
        const { minKWh, maxKWh } = parseEEITierRange(tier.usageKWhRange);
        return netConsumption >= minKWh && netConsumption <= maxKWh;
    });

    if (applicableTier) {
        const { minKWh, maxKWh } = parseEEITierRange(applicableTier.usageKWhRange);
        totalRebate = netConsumption * Math.abs(applicableTier.rateSenPerKWh) / 100;
        breakdown.push(`${netConsumption} kWh × ${Math.abs(applicableTier.rateSenPerKWh)} sen/kWh = RM ${totalRebate.toFixed(2)} (Rebate)`);
        breakdown.push(`EEI Tier: ${minKWh}-${maxKWh === Infinity ? '1000+' : maxKWh} kWh @ ${Math.abs(applicableTier.rateSenPerKWh)} sen/kWh`);
    }

    const effectiveRate = netConsumption > 0 ? Math.abs(applicableTier?.rateSenPerKWh || 0) : 0;

    return { rebate: totalRebate, breakdown, effectiveRate };
}

/**
 * Calculate old tariff bill
 */
function calculateOldTariff(usageKWh: number, solarExcessKWh: number = 0): { amount: number; breakdown: string[]; solarSavings: number } {
    const breakdown: string[] = [];
    let totalAmount = 0;
    let remainingUsage = usageKWh;

    breakdown.push(`=== OLD TARIFF CALCULATION (Pre-July 2025) ===`);
    breakdown.push(`Total Usage: ${usageKWh} kWh`);
    if (solarExcessKWh > 0) {
        breakdown.push(`Solar Excess Generation: ${solarExcessKWh} kWh`);
    }
    breakdown.push('');

    // Calculate block-based charges
    for (const block of OLD_TARIFF_RATES.blocks) {
        if (remainingUsage <= 0) break;

        const blockUsage = Math.min(remainingUsage, block.maxKWh);
        const blockAmount = blockUsage * block.rateSenPerKWh / 100;

        breakdown.push(`${block.range}: ${blockUsage} kWh × ${block.rateSenPerKWh} sen/kWh = RM ${blockAmount.toFixed(2)}`);

        totalAmount += blockAmount;
        remainingUsage -= blockUsage;
    }

    breakdown.push('');
    breakdown.push(`Subtotal: RM ${totalAmount.toFixed(2)}`);

    const grossEnergyCharge = totalAmount;

    // Add Renewable Energy Fund (1.6%)
    const renewableEnergyFund = grossEnergyCharge * OLD_TARIFF_RATES.renewableEnergyFund;
    totalAmount += renewableEnergyFund;
    breakdown.push('');
    breakdown.push(`Renewable Energy Fund (1.6%): RM ${renewableEnergyFund.toFixed(2)}`);

    // Add ICPT (Imbalance Cost Pass-Through) - Kadar ICPT dari 1 Jul 2024 - 30 Jun 2025
    // i. Rebat 2 sen/kWh (600 kWh & ke bawah)
    // ii. Tiada rebat/surcaj (601 kWh - 1,500 kWh)
    // iii. Surcaj 10 sen/kWh (melebihi 1,500 kWh)
    let icpt = 0;
    let icptDescription = '';

    if (usageKWh <= 600) {
        // Rebate 2 sen/kWh for usage 600 kWh and below
        icpt = -(usageKWh * 0.02);
        icptDescription = `ICPT (Rebat 2 sen/kWh): RM ${icpt.toFixed(2)}`;
    } else if (usageKWh <= 1500) {
        // No rebate/surcharge for 601-1500 kWh
        icpt = 0;
        icptDescription = `ICPT (Tiada rebat/surcaj): RM ${icpt.toFixed(2)}`;
    } else {
        // Surcharge 10 sen/kWh for total usage above 1500 kWh
        icpt = usageKWh * 0.10;
        icptDescription = `ICPT (Surcaj 10 sen/kWh untuk ${usageKWh} kWh): RM ${icpt.toFixed(2)}`;
    }

    totalAmount += icpt;
    breakdown.push(icptDescription);

    // Add Service Tax (8% only on consumption > 600 kWh)
    // Service Tax is calculated on the taxable energy charge only (above 600 kWh)
    let serviceTax = 0;
    if (usageKWh > OLD_TARIFF_RATES.serviceTaxThreshold) {
        const taxableUsage = usageKWh - OLD_TARIFF_RATES.serviceTaxThreshold;
        let taxableEnergyCharge = 0;

        if (taxableUsage <= 300) {
            // 601-900 kWh range
            taxableEnergyCharge = taxableUsage * 54.60 / 100;
        } else {
            // 601-900 kWh (300 kWh) + 901+ kWh range
            taxableEnergyCharge = 300 * 54.60 / 100;
            taxableEnergyCharge += (taxableUsage - 300) * 57.10 / 100;
        }

        serviceTax = taxableEnergyCharge * OLD_TARIFF_RATES.serviceTaxRate;
        totalAmount += serviceTax;
        breakdown.push(`Service Tax (8% on taxable energy charge): RM ${serviceTax.toFixed(2)}`);
    } else {
        breakdown.push(`Service Tax (8%): RM 0.00 (Waived for usage ≤ 600 kWh)`);
    }

    // Calculate solar offset
    let solarSavings = 0;
    if (solarExcessKWh > 0) {
        let remainingSolar = solarExcessKWh;
        let solarCredit = 0;

        breakdown.push('');
        breakdown.push(`SOLAR OFFSET CALCULATION (Lebihan Tenaga yang Dijana):`);

        const usageByBlock = [];
        let remainingUsageForBlocks = usageKWh;

        for (const block of OLD_TARIFF_RATES.blocks) {
            if (remainingUsageForBlocks <= 0) {
                usageByBlock.push(0);
                continue;
            }

            const blockUsage = Math.min(remainingUsageForBlocks, block.maxKWh);
            usageByBlock.push(blockUsage);
            remainingUsageForBlocks -= blockUsage;
        }

        const reversedBlocks = [...OLD_TARIFF_RATES.blocks].reverse();
        const reversedUsage = [...usageByBlock].reverse();

        for (let i = 0; i < reversedBlocks.length; i++) {
            if (remainingSolar <= 0) break;

            const block = reversedBlocks[i];
            const blockUsage = reversedUsage[i];

            if (blockUsage === 0) continue;

            const blockCredit = Math.min(remainingSolar, blockUsage);
            const blockValue = blockCredit * block.rateSenPerKWh / 100;

            breakdown.push(`Solar credit ${block.range}: ${blockCredit} kWh × ${block.rateSenPerKWh} sen/kWh = RM ${blockValue.toFixed(2)}`);

            solarCredit += blockValue;
            remainingSolar -= blockCredit;
        }

        solarSavings = solarCredit;
        totalAmount -= solarSavings;

        breakdown.push(`Total Solar Credit (Lebihan Tenaga yang Dijana): RM ${solarSavings.toFixed(2)}`);
    }

    breakdown.push('');
    breakdown.push(`TOTAL CALCULATION:`);
    breakdown.push(`Energy Charge (blocks): RM ${grossEnergyCharge.toFixed(2)}`);
    breakdown.push(`Plus Renewable Energy Fund: RM ${renewableEnergyFund.toFixed(2)}`);
    breakdown.push(`Plus Service Tax: RM ${serviceTax.toFixed(2)}`);
    breakdown.push(`Plus ICPT: RM ${icpt.toFixed(2)}`);
    breakdown.push(`Subtotal (before solar): RM ${(grossEnergyCharge + renewableEnergyFund + serviceTax + icpt).toFixed(2)}`);
    if (solarSavings > 0) {
        breakdown.push(`Less Solar Credit: RM ${solarSavings.toFixed(2)}`);
    }
    breakdown.push('');
    breakdown.push(`TOTAL: RM ${totalAmount.toFixed(2)}`);

    return { amount: totalAmount, breakdown, solarSavings };
}

/**
 * Calculate new general tariff bill
 */
function calculateNewGeneralTariff(
    usageKWh: number,
    solarExcessKWh: number = 0,
    isTou: boolean = false,
    touPeakPercentage: number = 50,
    afaSenPerKWh: number = 0
): { amount: number; breakdown: string[]; solarSavings: number } {
    const breakdown: string[] = [];
    const { generalDomesticTariff, timeOfUseTariff } = tariffData.tnbTariffRates;

    breakdown.push(`=== NEW GENERAL DOMESTIC TARIFF (Post-July 2025) ===`);
    if (isTou) {
        breakdown.push(`=== WITH TIME OF USE (ToU) ===`);
    }
    breakdown.push(`Total Usage: ${usageKWh} kWh`);
    if (solarExcessKWh > 0) {
        breakdown.push(`Solar Excess Generation: ${solarExcessKWh} kWh`);
    }
    breakdown.push('');

    // Calculate Generation Charge
    let generationCharge = 0;
    if (isTou) {
        const peakUsage = Math.round(usageKWh * touPeakPercentage / 100);
        const offPeakUsage = usageKWh - peakUsage;

        breakdown.push(`GENERATION CHARGE (ToU):`);
        breakdown.push(`Peak Usage (${touPeakPercentage}%): ${peakUsage} kWh`);
        breakdown.push(`Off-Peak Usage (${100 - touPeakPercentage}%): ${offPeakUsage} kWh`);

        // ToU uses flat rate based on total usage, not tiered structure
        if (usageKWh <= 1500) {
            // Use ≤1500 kWh rates for entire usage
            const peakRate = timeOfUseTariff.energyChargeToURates.usageUpTo1500KWhPerMonth.peakRateSenPerKWh;
            const offPeakRate = timeOfUseTariff.energyChargeToURates.usageUpTo1500KWhPerMonth.offPeakRateSenPerKWh;

            const peakCharge = peakUsage * peakRate / 100;
            const offPeakCharge = offPeakUsage * offPeakRate / 100;

            generationCharge = peakCharge + offPeakCharge;
            breakdown.push(`Peak charge: ${peakUsage} kWh × ${peakRate} sen/kWh = RM ${peakCharge.toFixed(2)}`);
            breakdown.push(`Off-peak charge: ${offPeakUsage} kWh × ${offPeakRate} sen/kWh = RM ${offPeakCharge.toFixed(2)}`);
        } else {
            // Use >1500 kWh rates for entire usage
            const peakRate = timeOfUseTariff.energyChargeToURates.usageOver1500KWhPerMonth.peakRateSenPerKWh;
            const offPeakRate = timeOfUseTariff.energyChargeToURates.usageOver1500KWhPerMonth.offPeakRateSenPerKWh;

            const peakCharge = peakUsage * peakRate / 100;
            const offPeakCharge = offPeakUsage * offPeakRate / 100;

            generationCharge = peakCharge + offPeakCharge;
            breakdown.push(`Peak charge: ${peakUsage} kWh × ${peakRate} sen/kWh = RM ${peakCharge.toFixed(2)}`);
            breakdown.push(`Off-peak charge: ${offPeakUsage} kWh × ${offPeakRate} sen/kWh = RM ${offPeakCharge.toFixed(2)}`);
        }
    } else {
        breakdown.push(`GENERATION CHARGE:`);
        if (usageKWh <= 1500) {
            generationCharge = usageKWh * generalDomesticTariff.components.generationCharge.tier1.rateSenPerKWh / 100;
            breakdown.push(`${usageKWh} kWh × ${generalDomesticTariff.components.generationCharge.tier1.rateSenPerKWh} sen/kWh = RM ${generationCharge.toFixed(2)}`);
        } else {
            // For usage > 1500 kWh, apply tier 2 rate to entire usage
            generationCharge = usageKWh * generalDomesticTariff.components.generationCharge.tier2.rateSenPerKWh / 100;
            breakdown.push(`${usageKWh} kWh × ${generalDomesticTariff.components.generationCharge.tier2.rateSenPerKWh} sen/kWh = RM ${generationCharge.toFixed(2)}`);
        }
    }

    // Calculate other charges
    const capacityCharge = usageKWh * generalDomesticTariff.components.capacityCharge.rateSenPerKWh / 100;
    const networkCharge = usageKWh * generalDomesticTariff.components.networkCharge.rateSenPerKWh / 100;

    breakdown.push('');
    breakdown.push(`CAPACITY CHARGE:`);
    breakdown.push(`${usageKWh} kWh × ${generalDomesticTariff.components.capacityCharge.rateSenPerKWh} sen/kWh = RM ${capacityCharge.toFixed(2)}`);

    breakdown.push('');
    breakdown.push(`NETWORK CHARGE:`);
    breakdown.push(`${usageKWh} kWh × ${generalDomesticTariff.components.networkCharge.rateSenPerKWh} sen/kWh = RM ${networkCharge.toFixed(2)}`);

    // Subtotal before solar offset
    let subtotal = generationCharge + capacityCharge + networkCharge;

    // Apply solar offset
    let solarSavings = 0;
    if (solarExcessKWh > 0) {
        const solarOffsetGeneration = solarExcessKWh * (usageKWh <= 1500 ?
            generalDomesticTariff.components.generationCharge.tier1.rateSenPerKWh :
            generalDomesticTariff.components.generationCharge.tier2.rateSenPerKWh) / 100;
        const solarOffsetCapacity = solarExcessKWh * generalDomesticTariff.components.capacityCharge.rateSenPerKWh / 100;
        const solarOffsetNetwork = solarExcessKWh * generalDomesticTariff.components.networkCharge.rateSenPerKWh / 100;

        solarSavings = solarOffsetGeneration + solarOffsetCapacity + solarOffsetNetwork;
        subtotal -= solarSavings;

        breakdown.push('');
        breakdown.push(`SOLAR OFFSET:`);
        breakdown.push(`Generation offset: ${solarExcessKWh} kWh × ${usageKWh <= 1500 ? generalDomesticTariff.components.generationCharge.tier1.rateSenPerKWh : generalDomesticTariff.components.generationCharge.tier2.rateSenPerKWh} sen/kWh = RM ${solarOffsetGeneration.toFixed(2)}`);
        breakdown.push(`Capacity offset: ${solarExcessKWh} kWh × ${generalDomesticTariff.components.capacityCharge.rateSenPerKWh} sen/kWh = RM ${solarOffsetCapacity.toFixed(2)}`);
        breakdown.push(`Network offset: ${solarExcessKWh} kWh × ${generalDomesticTariff.components.networkCharge.rateSenPerKWh} sen/kWh = RM ${solarOffsetNetwork.toFixed(2)}`);
        breakdown.push(`Total Solar Offset: RM ${solarSavings.toFixed(2)}`);
    }

    // Calculate net consumption for EEI
    const netConsumption = Math.max(0, usageKWh - solarExcessKWh);

    // Apply retail charge
    const retailCharge = netConsumption <= 600 ? 0 : generalDomesticTariff.components.retailCharge.monthlyFeeRM;

    breakdown.push('');
    breakdown.push(`RETAIL CHARGE:`);
    if (netConsumption <= 600) {
        breakdown.push(`RM 0.00 (Waived for net consumption ≤ 600 kWh)`);
    } else {
        breakdown.push(`RM ${retailCharge.toFixed(2)}`);
    }

    // Apply EEI rebate using tiered structure
    const eeiCalculation = calculateTieredEEI(netConsumption);
    const eeiRebate = eeiCalculation.rebate;

    breakdown.push('');
    breakdown.push(`ENERGY EFFICIENCY INCENTIVE (EEI):`);
    breakdown.push(`Net consumption: ${netConsumption} kWh`);



    for (const line of eeiCalculation.breakdown) {
        breakdown.push(line);
    }

    // AFA calculation
    const afa = netConsumption * afaSenPerKWh / 100;
    breakdown.push('');
    breakdown.push(`AUTOMATIC FUEL ADJUSTMENT (AFA):`);
    breakdown.push(`${netConsumption} kWh × ${afaSenPerKWh > 0 ? '+' : ''}${afaSenPerKWh.toFixed(1)} sen/kWh = RM ${afa.toFixed(2)}`);

    // Calculate subtotal before KWTBB and SST
    const subtotalBeforeKWTBBSST = subtotal + retailCharge + afa - eeiRebate;

    breakdown.push('');
    breakdown.push(`SUBTOTAL (before KWTBB & SST):`);
    breakdown.push(`Generation Charge: RM ${generationCharge.toFixed(2)}`);
    breakdown.push(`Capacity Charge: RM ${capacityCharge.toFixed(2)}`);
    breakdown.push(`Network Charge: RM ${networkCharge.toFixed(2)}`);
    if (solarSavings > 0) {
        breakdown.push(`Less Solar Offset: RM ${solarSavings.toFixed(2)}`);
    }
    breakdown.push(`Retail Charge: RM ${retailCharge.toFixed(2)}`);
    breakdown.push(`AFA: RM ${afa.toFixed(2)}`);
    breakdown.push(`Less EEI Rebate: RM ${eeiRebate.toFixed(2)}`);
    breakdown.push(`Subtotal: RM ${subtotalBeforeKWTBBSST.toFixed(2)}`);

    // Calculate KWTBB (Renewable Energy Fund) - 1.6% of subtotal
    const kwtbb = subtotalBeforeKWTBBSST * 0.016;
    breakdown.push('');
    breakdown.push(`KUMPULAN WANG TENAGA BOLEH BAHARU (KWTBB):`);
    breakdown.push(`1.6% of RM ${subtotalBeforeKWTBBSST.toFixed(2)} = RM ${kwtbb.toFixed(2)}`);

    // Calculate SST (Service Tax) - 8% on (usage - 600) × generation rate if usage > 600
    let sst = 0;
    if (netConsumption > 600) {
        const taxableUsage = netConsumption - 600;
        // Use appropriate generation rate based on usage
        const generationRate = netConsumption <= 1500 ?
            generalDomesticTariff.components.generationCharge.tier1.rateSenPerKWh :
            generalDomesticTariff.components.generationCharge.tier2.rateSenPerKWh;
        sst = (taxableUsage * generationRate / 100) * 0.08;
        breakdown.push('');
        breakdown.push(`SERVICE TAX (SST):`);
        breakdown.push(`8% × (${netConsumption} kWh - 600 kWh) × ${generationRate} sen/kWh`);
        breakdown.push(`8% × ${taxableUsage} kWh × ${generationRate} sen/kWh = RM ${sst.toFixed(2)}`);
    } else {
        breakdown.push('');
        breakdown.push(`SERVICE TAX (SST):`);
        breakdown.push(`RM 0.00 (Waived for net consumption ≤ 600 kWh)`);
    }

    const totalAmount = subtotalBeforeKWTBBSST + kwtbb + sst;

    breakdown.push('');
    breakdown.push(`FINAL TOTAL CALCULATION:`);
    breakdown.push(`Subtotal (before KWTBB & SST): RM ${subtotalBeforeKWTBBSST.toFixed(2)}`);
    breakdown.push(`Plus KWTBB: RM ${kwtbb.toFixed(2)}`);
    breakdown.push(`Plus SST: RM ${sst.toFixed(2)}`);
    breakdown.push('');
    breakdown.push(`TOTAL: RM ${totalAmount.toFixed(2)}`);

    return { amount: totalAmount, breakdown, solarSavings };
}

/**
 * Main calculation function
 */
function calculateElectricityBill(inputs: CalculatorInputs): CalculationResult {
    const { monthlyUsageKWh, tariffType, enableToU, touPeakPercentage, enableSolar, solarExcessKWh, afaSenPerKWh } = inputs;

    let result: { amount: number; breakdown: string[]; solarSavings: number };
    let touComparison;

    if (tariffType === 'old') {
        result = calculateOldTariff(monthlyUsageKWh, enableSolar ? solarExcessKWh : 0);
    } else {
        if (enableToU) {
            result = calculateNewGeneralTariff(monthlyUsageKWh, enableSolar ? solarExcessKWh : 0, true, touPeakPercentage, afaSenPerKWh);

            // Calculate comparison with general tariff
            const generalResult = calculateNewGeneralTariff(monthlyUsageKWh, enableSolar ? solarExcessKWh : 0, false, 50, afaSenPerKWh);
            const savings = generalResult.amount - result.amount;
            const savingsPercentage = (savings / generalResult.amount) * 100;

            touComparison = {
                generalTariffAmount: generalResult.amount,
                touAmount: result.amount,
                savings,
                savingsPercentage
            };
        } else {
            result = calculateNewGeneralTariff(monthlyUsageKWh, enableSolar ? solarExcessKWh : 0, false, 50, afaSenPerKWh);
        }
    }

    // Parse the breakdown from the detailed calculation
    const breakdown: BillBreakdown = {
        generationCharge: 0,
        capacityCharge: 0,
        networkCharge: 0,
        retailCharge: 0,
        automaticFuelAdjustment: 0,
        energyEfficiencyIncentive: 0,
        totalAmount: result.amount
    };

    // Extract values from the detailed calculation text
    const detailedText = result.breakdown.join('\n');

    if (tariffType === 'new') {
        // Extract values for new tariff
        const generationMatch = detailedText.match(/Generation Charge: RM ([\d.]+)/);
        const capacityMatch = detailedText.match(/Capacity Charge: RM ([\d.]+)/);
        const networkMatch = detailedText.match(/Network Charge: RM ([\d.]+)/);
        const retailMatch = detailedText.match(/Retail Charge: RM ([\d.]+)/);
        const afaMatch = detailedText.match(/AFA: RM ([-\d.]+)/);
        const eeiMatch = detailedText.match(/Less EEI Rebate: RM ([\d.]+)/i);


        const kwtbbMatch = detailedText.match(/1\.6% of RM [\d.]+ = RM ([\d.]+)/);
        const sstMatch = detailedText.match(/8% × \d+ kWh × [\d.]+ sen\/kWh = RM ([\d.]+)/);

        breakdown.generationCharge = generationMatch ? parseFloat(generationMatch[1]) : 0;
        breakdown.capacityCharge = capacityMatch ? parseFloat(capacityMatch[1]) : 0;
        breakdown.networkCharge = networkMatch ? parseFloat(networkMatch[1]) : 0;
        breakdown.retailCharge = retailMatch ? parseFloat(retailMatch[1]) : 0;
        breakdown.automaticFuelAdjustment = afaMatch ? parseFloat(afaMatch[1]) : 0;
        breakdown.energyEfficiencyIncentive = eeiMatch ? parseFloat(eeiMatch[1]) : 0;
        breakdown.kwtbb = kwtbbMatch ? parseFloat(kwtbbMatch[1]) : 0;
        breakdown.sst = sstMatch ? parseFloat(sstMatch[1]) : 0;
    } else {
        // Extract values for old tariff
        const subtotalMatch = detailedText.match(/Subtotal: RM ([\d.]+)/);
        const renewableMatch = detailedText.match(/Renewable Energy Fund \(1\.6%\): RM ([\d.]+)/);
        const serviceMatch = detailedText.match(/Service Tax \(8% on taxable portion\): RM ([\d.]+)/);

        breakdown.generationCharge = subtotalMatch ? parseFloat(subtotalMatch[1]) : 0;
        breakdown.renewableEnergyFund = renewableMatch ? parseFloat(renewableMatch[1]) : 0;
        breakdown.serviceTax = serviceMatch ? parseFloat(serviceMatch[1]) : 0;
    }

    return {
        inputs,
        breakdown,
        detailedCalculation: result.breakdown,
        solarSavings: result.solarSavings,
        touComparison
    };
}

// Create the Zustand store
export const useCalculatorStore = create<CalculatorStore>()(
    subscribeWithSelector(
        devtools(
            (set, get) => ({
                // Initial state
                result: null,
                isCalculating: false,
                error: null,

                // Calculation actions
                calculate: (inputs: CalculatorInputs) => {
                    if (inputs.monthlyUsageKWh <= 0) {
                        set({ result: null, error: null, isCalculating: false });
                        return;
                    }

                    set({ isCalculating: true, error: null });

                    try {
                        const result = calculateElectricityBill(inputs);
                        set({ result, isCalculating: false });
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Calculation failed',
                            isCalculating: false
                        });
                    }
                },

                recalculate: (inputs: CalculatorInputs) => {
                    get().calculate(inputs);
                },

                // Reset actions
                resetAll: () => {
                    set({
                        result: null,
                        isCalculating: false,
                        error: null
                    });
                },

                // Error handling
                setError: (error: string | null) => {
                    set({ error });
                },

                clearError: () => {
                    set({ error: null });
                },
            }),
            {
                name: 'calculator-store',
            }
        )
    )
);

// Initialize with empty state - calculations will be triggered by URL state changes

// Selectors for optimized subscriptions
export const calculatorSelectors = {
    // Result selectors
    result: (state: CalculatorStore) => state.result,
    breakdown: (state: CalculatorStore) => state.result?.breakdown || null,
    detailedCalculation: (state: CalculatorStore) => state.result?.detailedCalculation || [],
    solarSavings: (state: CalculatorStore) => state.result?.solarSavings,
    touComparison: (state: CalculatorStore) => state.result?.touComparison,
    totalAmount: (state: CalculatorStore) => state.result?.breakdown.totalAmount || 0,

    // State selectors
    isCalculating: (state: CalculatorStore) => state.isCalculating,
    error: (state: CalculatorStore) => state.error,
    hasResult: (state: CalculatorStore) => state.result !== null,
};

// Simple selectors that return stable references
export const selectBreakdownData = (state: CalculatorStore) => state.result; 