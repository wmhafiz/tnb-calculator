"use client";

import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { Info, Calculator, Zap, Sun, Clock } from 'lucide-react';
import { useCalculatorStore, calculatorSelectors } from '../store/calculatorStore';
import { useUrlState } from '../hooks/useUrlState';
import tariffData from '../data/db.json';
import BillBreakdown from './BillBreakdown';
import { ThemeToggle } from './ui/theme-toggle';

export default function TnbCalculator() {
    // Use URL state for inputs
    const {
        inputs,
        setMonthlyUsage,
        setTariffType,
        setEnableToU,
        setTouPeakPercentage,
        setEnableSolar,
        setSolarExcessKWh,
        setAfaSenPerKWh,
    } = useUrlState();

    // Use Zustand store for calculation results
    const result = useCalculatorStore(calculatorSelectors.result);
    const isCalculating = useCalculatorStore(calculatorSelectors.isCalculating);
    const error = useCalculatorStore(calculatorSelectors.error);
    const calculate = useCalculatorStore(state => state.calculate);

    // Use ref to track previous inputs to prevent infinite loops
    const prevInputsRef = useRef<string>('');

    // Trigger calculation when inputs change
    useEffect(() => {
        const inputsString = JSON.stringify(inputs);
        if (inputsString !== prevInputsRef.current) {
            prevInputsRef.current = inputsString;
            calculate(inputs);
        }
    }, [inputs]); // eslint-disable-line react-hooks/exhaustive-deps
    // Note: calculate is intentionally omitted from dependencies to prevent infinite loops

    const formatCurrency = (amount: number) => {
        return `RM ${amount.toFixed(2)}`;
    };

    const formatPercentage = (percentage: number) => {
        return `${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%`;
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="text-center space-y-2 relative">
                <div className="absolute top-0 right-0">
                    <ThemeToggle />
                </div>
                <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
                    <Calculator className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    TNB Electricity Bill Calculator
                </h1>
                <p className="text-muted-foreground">
                    Compare tariffs and estimate your electricity bill for Peninsular Malaysia
                </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Input Panel */}
                <Card className="flex-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5" />
                            Calculator Settings
                        </CardTitle>
                        <CardDescription>
                            Enter your consumption details and select options
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Monthly Usage */}
                        <div className="space-y-2">
                            <Label htmlFor="usage">Monthly Total kWh Usage</Label>
                            <Input
                                id="usage"
                                type="number"
                                value={inputs.monthlyUsageKWh}
                                onChange={(e) => setMonthlyUsage(Number(e.target.value))}
                                placeholder="e.g., 778"
                                min="0"
                                step="1"
                            />
                        </div>

                        {/* Tariff Selection */}
                        <div className="space-y-2">
                            <Label>Tariff Type</Label>
                            <Select
                                value={inputs.tariffType}
                                onValueChange={(value: 'old' | 'new') => setTariffType(value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="old">Old Tariff (Pre-July 2025)</SelectItem>
                                    <SelectItem value="new">New General Domestic Tariff (Post-July 2025)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Time of Use Option */}
                        {inputs.tariffType === 'new' && (
                            <div className="space-y-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/30">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <Label htmlFor="tou-toggle">Enable Time of Use (ToU)</Label>
                                    </div>
                                    <Switch
                                        id="tou-toggle"
                                        checked={inputs.enableToU}
                                        onCheckedChange={(checked) => setEnableToU(checked)}
                                    />
                                </div>

                                {inputs.enableToU && (
                                    <div className="space-y-3">
                                        <Alert>
                                            <Info className="h-4 w-4" />
                                            <AlertDescription>
                                                <strong>Peak Hours:</strong> 2:00 PM - 10:00 PM (Weekdays)<br />
                                                <strong>Off-Peak Hours:</strong> 10:00 PM - 2:00 PM (Weekdays), All day (Weekends & Holidays)
                                            </AlertDescription>
                                        </Alert>

                                        <div className="space-y-2">
                                            <Label>Peak Usage Distribution: {inputs.touPeakPercentage}%</Label>
                                            <Slider
                                                value={[inputs.touPeakPercentage]}
                                                onValueChange={(value) => setTouPeakPercentage(value[0])}
                                                max={100}
                                                min={0}
                                                step={5}
                                                className="w-full"
                                            />
                                            <div className="flex justify-between text-sm text-muted-foreground">
                                                <span>Peak: {inputs.touPeakPercentage}%</span>
                                                <span>Off-Peak: {100 - inputs.touPeakPercentage}%</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Solar Integration */}
                        <div className="space-y-4 p-4 border rounded-lg bg-green-50 dark:bg-green-950/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sun className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    <Label htmlFor="solar-toggle">Enable Solar Integration</Label>
                                </div>
                                <Switch
                                    id="solar-toggle"
                                    checked={inputs.enableSolar}
                                    onCheckedChange={(checked) => setEnableSolar(checked)}
                                />
                            </div>

                            {inputs.enableSolar && (
                                <div className="space-y-2">
                                    <Label htmlFor="solar-excess">Excess Energy Generated (kWh)</Label>
                                    <Input
                                        id="solar-excess"
                                        type="number"
                                        value={inputs.solarExcessKWh}
                                        onChange={(e) => setSolarExcessKWh(Number(e.target.value))}
                                        placeholder="e.g., 474"
                                        min="0"
                                        step="1"
                                    />
                                    {inputs.tariffType === 'old' && (
                                        <p className="text-xs text-muted-foreground">
                                            Solar offset will be calculated using the same block rates as your consumption.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* AFA Adjustment - Only for New Tariff */}
                        {inputs.tariffType === 'new' && (
                            <div className="space-y-4 p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/30">
                                <div className="flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                    <Label>Automatic Fuel Adjustment (AFA): {inputs.afaSenPerKWh > 0 ? '+' : ''}{inputs.afaSenPerKWh.toFixed(1)} sen/kWh</Label>
                                </div>

                                <div className="space-y-2">
                                    <Slider
                                        value={[inputs.afaSenPerKWh]}
                                        onValueChange={(value) => setAfaSenPerKWh(value[0])}
                                        max={3}
                                        min={-3}
                                        step={0.1}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>-3.0</span>
                                        <span>-2.0</span>
                                        <span>-1.0</span>
                                        <span>0.0</span>
                                        <span>+1.0</span>
                                        <span>+2.0</span>
                                        <span>+3.0</span>
                                    </div>
                                </div>

                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
                                        AFA is a variable mechanism that adjusts based on fuel costs.
                                        Current rate is typically around 0.00 sen/kWh but can fluctuate.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="flex-3 flex flex-col gap-6">
                    {error && (
                        <Alert className="mb-4">
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Error:</strong> {error}
                            </AlertDescription>
                        </Alert>
                    )}
                    {isCalculating ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
                            <p>Calculating...</p>
                        </div>
                    ) : result ? (
                        <div className="space-y-6">
                            <BillBreakdown />

                            {/* ToU Comparison */}
                            {result.touComparison && (
                                <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/30">
                                    <h4 className="font-semibold mb-2">Time of Use Comparison</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div className="text-muted-foreground">General Tariff</div>
                                            <div className="font-semibold">{formatCurrency(result.touComparison.generalTariffAmount)}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">ToU Tariff</div>
                                            <div className="font-semibold">{formatCurrency(result.touComparison.touAmount)}</div>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">Potential Savings:</span>
                                            <div className="text-right">
                                                <div className={`font-semibold ${result.touComparison.savings > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {result.touComparison.savings > 0 ? '-' : '+'}{formatCurrency(Math.abs(result.touComparison.savings))}
                                                </div>
                                                <div className={`text-xs ${result.touComparison.savings > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {formatPercentage(result.touComparison.savingsPercentage)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Enter your monthly kWh usage to see the calculation</p>
                        </div>
                    )}

                </div>
            </div>

            {/* Detailed Calculation */}
            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle>Detailed Calculation</CardTitle>
                        <CardDescription>
                            Step-by-step breakdown of your electricity bill
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="tariff-info" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="breakdown">Calculation Breakdown</TabsTrigger>
                                <TabsTrigger value="tariff-info">Tariff Information</TabsTrigger>
                            </TabsList>

                            <TabsContent value="breakdown" className="space-y-4">
                                <div className="bg-muted p-4 rounded-lg">
                                    <pre className="text-sm font-mono whitespace-pre-wrap">
                                        {result.detailedCalculation.join('\n')}
                                    </pre>
                                </div>
                            </TabsContent>

                            <TabsContent value="tariff-info" className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {inputs.tariffType === 'old' && (
                                        <div className="p-4 border rounded-lg">
                                            <h4 className="font-semibold mb-2">Old Tariff Structure</h4>
                                            <div className="space-y-1 text-sm">
                                                <div>Block 1: 0-200 kWh @ 21.80 sen/kWh</div>
                                                <div>Block 2: 201-300 kWh @ 33.40 sen/kWh</div>
                                                <div>Block 3: 301-600 kWh @ 51.60 sen/kWh</div>
                                                <div>Block 4: 601-900 kWh @ 54.60 sen/kWh</div>
                                                <div>Block 5: 901+ kWh @ 57.10 sen/kWh</div>
                                                <Separator className="my-2" />
                                                <div>+ Renewable Energy Fund (1.6%)</div>
                                                <div>+ Service Tax (8% if usage &gt; 600 kWh)</div>
                                            </div>
                                        </div>
                                    )}

                                    {inputs.tariffType === 'new' && (
                                        <div className="p-4 border rounded-lg">
                                            <h4 className="font-semibold mb-2">New Tariff Components</h4>
                                            <div className="space-y-1 text-sm">
                                                <div><strong>Generation Charge:</strong></div>
                                                <div>• 0-1500 kWh: {tariffData.tnbTariffRates.generalDomesticTariff.components.generationCharge.tier1.rateSenPerKWh} sen/kWh</div>
                                                <div>• &gt;1500 kWh: {tariffData.tnbTariffRates.generalDomesticTariff.components.generationCharge.tier2.rateSenPerKWh} sen/kWh</div>
                                                <div><strong>Capacity Charge:</strong> {tariffData.tnbTariffRates.generalDomesticTariff.components.capacityCharge.rateSenPerKWh} sen/kWh</div>
                                                <div><strong>Network Charge:</strong> {tariffData.tnbTariffRates.generalDomesticTariff.components.networkCharge.rateSenPerKWh} sen/kWh</div>
                                                <div><strong>Retail Charge:</strong> RM {tariffData.tnbTariffRates.generalDomesticTariff.components.retailCharge.monthlyFeeRM}/month</div>
                                                <div className="text-xs text-muted-foreground">(Waived if usage ≤ 600 kWh)</div>
                                                <div><strong>EEI Rebate:</strong> Tiered rates</div>
                                                <div className="text-xs text-muted-foreground">(1-200 kWh: {Math.abs(tariffData.tnbTariffRates.generalDomesticTariff.energyEfficiencyIncentive.tiers[0].rateSenPerKWh)} sen/kWh, decreasing by tier up to 1000 kWh)</div>
                                            </div>
                                        </div>
                                    )}

                                    {inputs.tariffType === 'new' && (
                                        <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/30">
                                            <h4 className="font-semibold mb-2">Energy Efficiency Incentive (EEI) Tiers</h4>
                                            <div className="space-y-1 text-xs">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div><strong>Usage Range</strong></div>
                                                    <div><strong>Rebate Rate</strong></div>
                                                </div>
                                                {tariffData.tnbTariffRates.generalDomesticTariff.energyEfficiencyIncentive.tiers.map((tier, index) => (
                                                    <div key={index} className="grid grid-cols-2 gap-2">
                                                        <div>{tier.usageKWhRange} kWh</div>
                                                        <div>{Math.abs(tier.rateSenPerKWh)} sen/kWh</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {inputs.enableToU && (
                                        <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/30">
                                            <h4 className="font-semibold mb-2">Time of Use Rates</h4>
                                            <div className="space-y-1 text-sm">
                                                <div><strong>Peak Hours (2PM-10PM, Weekdays):</strong></div>
                                                <div>• 0-1500 kWh: {tariffData.tnbTariffRates.timeOfUseTariff.energyChargeToURates.usageUpTo1500KWhPerMonth.peakRateSenPerKWh} sen/kWh</div>
                                                <div>• &gt;1500 kWh: {tariffData.tnbTariffRates.timeOfUseTariff.energyChargeToURates.usageOver1500KWhPerMonth.peakRateSenPerKWh} sen/kWh</div>
                                                <div><strong>Off-Peak Hours:</strong></div>
                                                <div>• 0-1500 kWh: {tariffData.tnbTariffRates.timeOfUseTariff.energyChargeToURates.usageUpTo1500KWhPerMonth.offPeakRateSenPerKWh} sen/kWh</div>
                                                <div>• &gt;1500 kWh: {tariffData.tnbTariffRates.timeOfUseTariff.energyChargeToURates.usageOver1500KWhPerMonth.offPeakRateSenPerKWh} sen/kWh</div>
                                                <div className="text-xs text-muted-foreground mt-2">
                                                    Other charges (Capacity, Network, Retail, EEI) remain the same
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            )}
        </div>
    );
} 