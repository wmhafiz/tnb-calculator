"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Receipt, Zap, Calculator, Sun } from 'lucide-react';
import { useCalculatorStore, selectBreakdownData } from '../store/calculatorStore';

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
    const inputs = useCalculatorStore(state => state.inputs);
    const solarSavings = useCalculatorStore(state => state.result?.solarSavings);

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
            items.push({
                charge: 'Energy Charge',
                rate: '27.03',
                calculation: `27.03 sen/kWh × ${usage}.00 kWh`,
                amount: breakdown.generationCharge
            });

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
            items.push({
                charge: 'Capacity Charge',
                rate: '4.55',
                calculation: `4.55 sen/kWh × ${usage}.00 kWh`,
                amount: breakdown.capacityCharge
            });

            // Network Charge
            items.push({
                charge: 'Network Charge',
                rate: '12.85',
                calculation: `12.85 sen/kWh × ${usage}.00 kWh`,
                amount: breakdown.networkCharge
            });

            // Retail Charge
            items.push({
                charge: 'Retail Charge',
                rate: '10.00',
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
                items.push({
                    charge: 'SST (8%)',
                    rate: '8%',
                    calculation: `8% × ${taxableUsage} kWh × 27.03 sen/kWh`,
                    amount: breakdown.sst
                });
            }

        } else {
            // Old tariff structure - simplified for display
            const usage = inputs.monthlyUsageKWh;

            // Energy charges (simplified as one line)
            items.push({
                charge: 'Energy Charge',
                rate: 'Tiered',
                calculation: `${usage} kWh (Block rates)`,
                amount: breakdown.generationCharge || 0
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

            // Service Tax
            if (breakdown.serviceTax) {
                items.push({
                    charge: 'Service Tax',
                    rate: '8%',
                    calculation: `8% × (${usage} - 600) kWh`,
                    amount: breakdown.serviceTax
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
                    Bill Breakdown
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-blue-50">
                                <TableHead className="font-semibold text-blue-900">Charge</TableHead>
                                <TableHead className="font-semibold text-blue-900 text-center">Rate</TableHead>
                                <TableHead className="font-semibold text-blue-900 text-center">Calculation</TableHead>
                                <TableHead className="font-semibold text-blue-900 text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {chargeItems.map((item, index) => (
                                <TableRow
                                    key={index}
                                    className={
                                        item.isTotal
                                            ? "bg-blue-600 text-white font-bold"
                                            : item.isSubtotal
                                                ? "bg-blue-100 font-semibold"
                                                : item.isRebate
                                                    ? "bg-green-50"
                                                    : "hover:bg-gray-50"
                                    }
                                >
                                    <TableCell className={`font-medium ${item.isTotal ? 'text-white' : ''}`}>
                                        {item.charge}
                                        {item.isRebate && (
                                            <Badge variant="outline" className="ml-2 text-green-600 border-green-600">
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
                                            <span className={item.isRebate ? 'text-green-600' : ''}>
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
                <div className="p-4 bg-gray-50 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">Usage:</span>
                            <span>{inputs.monthlyUsageKWh} kWh</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calculator className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">Tariff:</span>
                            <Badge variant={inputs.tariffType === 'new' ? 'default' : 'secondary'}>
                                {inputs.tariffType === 'new' ? 'New General Domestic' : 'Old Tariff'}
                            </Badge>
                        </div>
                        {inputs.enableToU && (
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Time of Use:</span>
                                <Badge variant="outline">Enabled</Badge>
                            </div>
                        )}
                        {inputs.enableSolar && inputs.solarExcessKWh > 0 && (
                            <div className="flex items-center gap-2">
                                <Sun className="h-4 w-4 text-green-600" />
                                <span className="font-medium">Solar:</span>
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                    {inputs.solarExcessKWh} kWh excess
                                </Badge>
                                {solarSavings && solarSavings > 0 && (
                                    <span className="text-green-600 font-medium">
                                        -RM {formatCurrency(solarSavings)}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
} 