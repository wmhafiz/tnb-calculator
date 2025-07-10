"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Receipt, Zap, Calculator, Sun } from 'lucide-react';
import { useCalculatorStore, selectBreakdownData } from '../store/calculatorStore';
import { useUrlState } from '../hooks/useUrlState';
import tariffData from '../data/db.json';

interface ChargeItem {
    charge: string;
    rate: string;
    calculation: string;
    amount: number;
    isTotal?: boolean;
    isSubtotal?: boolean;
    isRebate?: boolean;
}

export default function BillBreakdown() {
    const result = useCalculatorStore(selectBreakdownData);
    const solarSavings = useCalculatorStore(state => state.result?.solarSavings);
    const { inputs } = useUrlState();

    if (!result?.breakdown) {
        return null;
    }

    const { breakdown, detailedCalculation } = result;
    const formatCurrency = (amount: number) => {
        return amount.toFixed(2);
    };

    const formatRate = (rate: number) => {
        return rate.toFixed(2);
    };

    // Parse the detailed calculation to extract structured data
    const parseCalculationData = (): ChargeItem[] => {
        const items: ChargeItem[] = [];
        const detailedText = detailedCalculation.join('\n');

        if (inputs.tariffType === 'new') {
            // New tariff structure
            const usage = inputs.monthlyUsageKWh;
            const netUsage = usage - (inputs.enableSolar ? inputs.solarExcessKWh : 0);

            // Energy Charge (Generation Charge)
            const { generalDomesticTariff, timeOfUseTariff } = tariffData.tnbTariffRates;

            if (inputs.enableToU) {
                // ToU rates - show weighted average or peak rate as representative
                const peakRate = usage <= 1500
                    ? timeOfUseTariff.energyChargeToURates.usageUpTo1500KWhPerMonth.peakRateSenPerKWh
                    : timeOfUseTariff.energyChargeToURates.usageOver1500KWhPerMonth.peakRateSenPerKWh;
                const offPeakRate = usage <= 1500
                    ? timeOfUseTariff.energyChargeToURates.usageUpTo1500KWhPerMonth.offPeakRateSenPerKWh
                    : timeOfUseTariff.energyChargeToURates.usageOver1500KWhPerMonth.offPeakRateSenPerKWh;

                const peakPercentage = inputs.touPeakPercentage;
                const offPeakPercentage = 100 - peakPercentage;

                items.push({
                    charge: 'Energy Charge',
                    rate: `${peakRate.toFixed(2)} / ${offPeakRate.toFixed(2)}`,
                    calculation: `${peakPercentage}% Peak (${peakRate.toFixed(2)} sen/kWh), ${offPeakPercentage}% Off-Peak (${offPeakRate.toFixed(2)} sen/kWh)`,
                    amount: breakdown.generationCharge
                });
            } else {
                // Regular tariff rates
                const energyRateValue = usage <= 1500
                    ? generalDomesticTariff.components.generationCharge.tier1.rateSenPerKWh
                    : generalDomesticTariff.components.generationCharge.tier2.rateSenPerKWh;
                const energyRate = energyRateValue.toFixed(2);
                items.push({
                    charge: 'Energy Charge',
                    rate: energyRate,
                    calculation: `${energyRate} sen/kWh × ${usage}.00 kWh`,
                    amount: breakdown.generationCharge
                });
            }

            // AFA (if applicable)
            if (breakdown.automaticFuelAdjustment !== 0) {
                items.push({
                    charge: 'AFA',
                    rate: formatRate(inputs.afaSenPerKWh),
                    calculation: `${formatRate(inputs.afaSenPerKWh)} sen/kWh × ${usage}.00 kWh`,
                    amount: breakdown.automaticFuelAdjustment
                });
            } else {
                items.push({
                    charge: 'AFA',
                    rate: '0.00',
                    calculation: `0.00 sen/kWh × ${usage}.00 kWh`,
                    amount: 0
                });
            }

            // Capacity Charge
            const capacityRate = generalDomesticTariff.components.capacityCharge.rateSenPerKWh.toFixed(2);
            items.push({
                charge: 'Capacity Charge',
                rate: capacityRate,
                calculation: `${capacityRate} sen/kWh × ${usage}.00 kWh`,
                amount: breakdown.capacityCharge
            });

            // Network Charge
            const networkRate = generalDomesticTariff.components.networkCharge.rateSenPerKWh.toFixed(2);
            items.push({
                charge: 'Network Charge',
                rate: networkRate,
                calculation: `${networkRate} sen/kWh × ${usage}.00 kWh`,
                amount: breakdown.networkCharge
            });

            // Retail Charge
            const retailRate = generalDomesticTariff.components.retailCharge.monthlyFeeRM.toFixed(2);
            items.push({
                charge: 'Retail Charge',
                rate: retailRate,
                calculation: usage > 600 ? 'Fixed charge (usage > 600 kWh)' : 'Fixed charge (usage ≤ 600 kWh)',
                amount: breakdown.retailCharge
            });

            // Solar Offset (if applicable)
            if (inputs.enableSolar && solarSavings && solarSavings > 0) {
                // Extract solar offset details from detailed calculation
                const solarOffsetMatch = detailedText.match(/Total Solar Offset: RM ([\d.]+)/);
                const solarAmount = solarOffsetMatch ? parseFloat(solarOffsetMatch[1]) : solarSavings;

                items.push({
                    charge: 'Solar Offset',
                    rate: 'Variable',
                    calculation: `${inputs.solarExcessKWh} kWh excess generation`,
                    amount: -solarAmount,
                    isRebate: true
                });
            }

            // Energy Efficiency Initiative (if applicable)
            if (breakdown.energyEfficiencyIncentive > 0) {
                // Extract EEI rate from detailed calculation
                const eeiRateMatch = detailedText.match(/(\d+(?:\.\d+)?) sen\/kWh = RM [\d.]+ \(Rebate\)/);
                const eeiRate = eeiRateMatch ? parseFloat(eeiRateMatch[1]) : 4.0; // Default to 4.0 if not found

                items.push({
                    charge: 'Energy Efficiency Initiative',
                    rate: `-${formatRate(eeiRate)}`,
                    calculation: `-${formatRate(eeiRate)} sen/kWh × ${netUsage}.00 kWh`,
                    amount: -breakdown.energyEfficiencyIncentive,
                    isRebate: true
                });
            } else if (netUsage > 0) {
                // Show EEI as 0 if no rebate but there's usage
                items.push({
                    charge: 'Energy Efficiency Initiative',
                    rate: '0.00',
                    calculation: 'No rebate applicable',
                    amount: 0,
                    isRebate: true
                });
            }

            // Calculate subtotal before KWTBB and SST
            const solarOffset = (inputs.enableSolar && solarSavings && solarSavings > 0) ? solarSavings : 0;
            const subtotal = breakdown.generationCharge + breakdown.capacityCharge + breakdown.networkCharge +
                breakdown.retailCharge + breakdown.automaticFuelAdjustment - breakdown.energyEfficiencyIncentive - solarOffset;

            items.push({
                charge: 'Total Charge',
                rate: '',
                calculation: '',
                amount: subtotal,
                isSubtotal: true
            });

            // KWTBB
            if (breakdown.kwtbb && breakdown.kwtbb > 0) {
                items.push({
                    charge: 'KWTBB (1.6%)',
                    rate: '1.6%',
                    calculation: `1.6% × ${formatCurrency(subtotal)} (Total Charge)`,
                    amount: breakdown.kwtbb
                });
            }

            // SST
            if (breakdown.sst && breakdown.sst > 0) {
                const taxableUsage = usage - 600;
                let sstCalculation = '';

                if (inputs.enableToU) {
                    // For ToU, show the weighted average rate used in SST calculation
                    const peakRate = usage <= 1500
                        ? timeOfUseTariff.energyChargeToURates.usageUpTo1500KWhPerMonth.peakRateSenPerKWh
                        : timeOfUseTariff.energyChargeToURates.usageOver1500KWhPerMonth.peakRateSenPerKWh;
                    const offPeakRate = usage <= 1500
                        ? timeOfUseTariff.energyChargeToURates.usageUpTo1500KWhPerMonth.offPeakRateSenPerKWh
                        : timeOfUseTariff.energyChargeToURates.usageOver1500KWhPerMonth.offPeakRateSenPerKWh;

                    const peakPercentage = inputs.touPeakPercentage;
                    const weightedRate = (peakRate * peakPercentage + offPeakRate * (100 - peakPercentage)) / 100;

                    sstCalculation = `8% × ${taxableUsage} kWh × ${weightedRate.toFixed(2)} sen/kWh (ToU weighted avg)`;
                } else {
                    // Regular tariff
                    const sstRateValue = usage <= 1500
                        ? generalDomesticTariff.components.generationCharge.tier1.rateSenPerKWh
                        : generalDomesticTariff.components.generationCharge.tier2.rateSenPerKWh;
                    const sstRate = sstRateValue.toFixed(2);
                    sstCalculation = `8% × ${taxableUsage} kWh × ${sstRate} sen/kWh`;
                }

                items.push({
                    charge: 'SST (8%)',
                    rate: '8%',
                    calculation: sstCalculation,
                    amount: breakdown.sst
                });
            }

        } else {
            // Old tariff structure - detailed breakdown
            const usage = inputs.monthlyUsageKWh;

            // Parse detailed block charges from calculation text (only energy charges, not solar credits)
            const energySection = detailedText.split('Subtotal:')[0]; // Only look at the energy charge section
            const blockMatches = energySection.match(/(\d+-\d+|\d+\+) kWh: (\d+) kWh × ([\d.]+) sen\/kWh = RM ([\d.]+)/g);

            if (blockMatches) {
                blockMatches.forEach(match => {
                    const blockMatch = match.match(/(\d+-\d+|\d+\+) kWh: (\d+) kWh × ([\d.]+) sen\/kWh = RM ([\d.]+)/);
                    if (blockMatch) {
                        const [, range, kWh, rate, amount] = blockMatch;
                        items.push({
                            charge: `Block ${range} kWh`,
                            rate: `${rate} sen/kWh`,
                            calculation: `${kWh} kWh × ${rate} sen/kWh`,
                            amount: parseFloat(amount)
                        });
                    }
                });
            } else {
                // Fallback to simplified display if parsing fails
                items.push({
                    charge: 'Energy Charge',
                    rate: 'Tiered',
                    calculation: `${usage} kWh (Block rates)`,
                    amount: breakdown.generationCharge || 0
                });
            }

            // Energy charge subtotal (before additional charges)
            items.push({
                charge: 'Energy Charge Subtotal',
                rate: '',
                calculation: 'Sum of all blocks',
                amount: breakdown.generationCharge || 0,
                isSubtotal: true
            });

            // Solar Credit (for old tariff)
            if (inputs.enableSolar && solarSavings && solarSavings > 0) {
                // Extract solar credit details from detailed calculation
                const solarCreditMatch = detailedText.match(/Total Solar Credit \(Lebihan Tenaga yang Dijana\): RM ([\d.]+)/);
                const solarAmount = solarCreditMatch ? parseFloat(solarCreditMatch[1]) : solarSavings;

                items.push({
                    charge: 'Solar Credit (NEM)',
                    rate: 'Variable',
                    calculation: `${inputs.solarExcessKWh} kWh excess generation`,
                    amount: -solarAmount,
                    isRebate: true
                });
            }

            // Renewable Energy Fund
            if (breakdown.renewableEnergyFund) {
                items.push({
                    charge: 'Renewable Energy Fund',
                    rate: '1.6%',
                    calculation: '1.6% × Energy Charge',
                    amount: breakdown.renewableEnergyFund
                });
            }

            // Service Tax - parse from detailed calculation text
            const serviceTaxMatch = detailedText.match(/Service Tax \(8% on taxable energy charge\): RM ([\d.]+)/);
            const serviceTaxWaivedMatch = detailedText.match(/Service Tax \(8%\): RM 0\.00 \(Waived for usage ≤ 600 kWh\)/);

            if (serviceTaxMatch) {
                const serviceTaxAmount = parseFloat(serviceTaxMatch[1]);
                // Calculate taxable usage and description
                const taxableUsage = usage - 600;
                let taxableDescription = '';

                if (taxableUsage <= 300) {
                    taxableDescription = `8% × ${taxableUsage} kWh × 54.6 sen/kWh`;
                } else {
                    const block1 = 300;
                    const block2 = taxableUsage - 300;
                    taxableDescription = `8% × (${block1} kWh × 54.6 + ${block2} kWh × 57.1) sen/kWh`;
                }

                items.push({
                    charge: 'Service Tax',
                    rate: '8%',
                    calculation: taxableDescription,
                    amount: serviceTaxAmount
                });
            } else if (serviceTaxWaivedMatch) {
                items.push({
                    charge: 'Service Tax',
                    rate: '8%',
                    calculation: 'Waived (usage ≤ 600 kWh)',
                    amount: 0
                });
            }

            // ICPT - always show with different formats
            const icptRebateMatch = detailedText.match(/ICPT \(Rebat 2 sen\/kWh\): RM ([-\d.]+)/);
            const icptNilMatch = detailedText.match(/ICPT \(Tiada rebat\/surcaj\): RM ([\d.]+)/);
            const icptSurchargeMatch = detailedText.match(/ICPT \(Surcaj 10 sen\/kWh untuk (\d+) kWh\): RM ([\d.]+)/);

            if (icptRebateMatch) {
                const icptAmount = parseFloat(icptRebateMatch[1]);
                items.push({
                    charge: 'ICPT',
                    rate: 'Rebat 2 sen/kWh',
                    calculation: `${usage} kWh × 2 sen/kWh rebate`,
                    amount: icptAmount,
                    isRebate: true
                });
            } else if (icptNilMatch) {
                const icptAmount = parseFloat(icptNilMatch[1]);
                items.push({
                    charge: 'ICPT',
                    rate: 'Tiada rebat/surcaj',
                    calculation: `601-1500 kWh range`,
                    amount: icptAmount
                });
            } else if (icptSurchargeMatch) {
                const excessKWh = parseInt(icptSurchargeMatch[1]);
                const icptAmount = parseFloat(icptSurchargeMatch[2]);
                items.push({
                    charge: 'ICPT',
                    rate: 'Surcaj 10 sen/kWh',
                    calculation: `${excessKWh} kWh × 10 sen/kWh surcharge`,
                    amount: icptAmount
                });
            }
        }

        // Final total
        items.push({
            charge: 'Estimated Bill',
            rate: '',
            calculation: '',
            amount: breakdown.totalAmount,
            isTotal: true
        });

        return items;
    };

    const chargeItems = parseCalculationData();

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Estimated Bill Breakdown
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-blue-50 dark:bg-blue-950/30">
                                <TableHead className="font-semibold text-blue-900 dark:text-blue-100">Charge</TableHead>
                                <TableHead className="font-semibold text-blue-900 dark:text-blue-100 text-center">Rate</TableHead>
                                <TableHead className="font-semibold text-blue-900 dark:text-blue-100 text-center">Calculation</TableHead>
                                <TableHead className="font-semibold text-blue-900 dark:text-blue-100 text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {chargeItems.map((item, index) => (
                                <TableRow
                                    key={index}
                                    className={
                                        item.isTotal
                                            ? "bg-blue-600 dark:bg-blue-700 text-white font-bold"
                                            : item.isSubtotal
                                                ? "bg-blue-100 dark:bg-blue-950/50 font-semibold"
                                                : item.isRebate
                                                    ? "bg-green-50 dark:bg-green-950/30"
                                                    : "hover:bg-muted/50"
                                    }
                                >
                                    <TableCell className={`font-medium ${item.isTotal ? 'text-white' : ''}`}>
                                        {item.charge}
                                        {item.isRebate && (
                                            <Badge variant="outline" className="ml-2 text-green-600 dark:text-green-400 border-green-600 dark:border-green-400">
                                                Rebate
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className={`text-center ${item.isTotal ? 'text-white' : ''}`}>
                                        {item.rate}
                                    </TableCell>
                                    <TableCell className={`text-center ${item.isTotal ? 'text-white' : ''}`}>
                                        {item.calculation}
                                    </TableCell>
                                    <TableCell className={`text-right font-mono ${item.isTotal ? 'text-white text-lg' : ''}`}>
                                        {item.isTotal ? (
                                            <span className="text-lg font-bold">RM {formatCurrency(item.amount)}</span>
                                        ) : (
                                            <span className={item.isRebate ? 'text-green-600 dark:text-green-400' : ''}>
                                                {item.isRebate ? '-' : ''}
                                                {item.amount === 0 ? '0.00' : formatCurrency(Math.abs(item.amount))}
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Additional Information */}
                <div className="p-4 bg-muted border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="font-medium">Usage:</span>
                            <span>{inputs.monthlyUsageKWh} kWh</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calculator className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="font-medium">Tariff:</span>
                            <Badge variant={inputs.tariffType === 'new' ? 'default' : 'secondary'}>
                                {inputs.tariffType === 'new' ? 'New General Domestic' : 'Old Tariff'}
                            </Badge>
                        </div>
                        {inputs.enableSolar && inputs.solarExcessKWh > 0 && (
                            <div className="flex items-center gap-2">
                                <Sun className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span className="font-medium">Solar:</span>
                                <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-600 dark:border-green-400">
                                    {inputs.solarExcessKWh} kWh excess
                                </Badge>
                            </div>
                        )}
                        {inputs.enableToU && (
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Time of Use:</span>
                                <Badge variant="outline">Enabled</Badge>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
} 