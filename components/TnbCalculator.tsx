"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Info, Calculator, Zap, Sun, Clock } from 'lucide-react';
import { calculateElectricityBill } from '../utils/calculator';
import type { CalculatorInputs } from '../types/calculator';
import tariffData from '../data/db.json';

export default function TnbCalculator() {
    const [inputs, setInputs] = useState<CalculatorInputs>({
        monthlyUsageKWh: 778,
        tariffType: 'new',
        enableToU: false,
        touPeakPercentage: 30,
        enableSolar: false,
        solarExcessKWh: 0,
        afaSenPerKWh: 0.0, // Default AFA rate
    });

    const [showCalculation, setShowCalculation] = useState(false);

    const result = useMemo(() => {
        if (inputs.monthlyUsageKWh > 0) {
            return calculateElectricityBill(inputs);
        }
        return null;
    }, [inputs]);

    const handleInputChange = (field: keyof CalculatorInputs, value: string | number | boolean) => {
        setInputs(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const formatCurrency = (amount: number) => {
        return `RM ${amount.toFixed(2)}`;
    };

    const formatPercentage = (percentage: number) => {
        return `${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%`;
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
                    <Calculator className="h-8 w-8 text-blue-600" />
                    TNB Electricity Bill Calculator
                </h1>
                <p className="text-gray-600">
                    Compare tariffs and estimate your electricity bill for Peninsular Malaysia
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Panel */}
                <Card>
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
                                onChange={(e) => handleInputChange('monthlyUsageKWh', Number(e.target.value))}
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
                                onValueChange={(value: 'old' | 'new') => handleInputChange('tariffType', value)}
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
                            <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-blue-600" />
                                        <Label htmlFor="tou-toggle">Enable Time of Use (ToU)</Label>
                                    </div>
                                    <Switch
                                        id="tou-toggle"
                                        checked={inputs.enableToU}
                                        onCheckedChange={(checked) => handleInputChange('enableToU', checked)}
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
                                                onValueChange={(value) => handleInputChange('touPeakPercentage', value[0])}
                                                max={100}
                                                min={0}
                                                step={5}
                                                className="w-full"
                                            />
                                            <div className="flex justify-between text-sm text-gray-600">
                                                <span>Peak: {inputs.touPeakPercentage}%</span>
                                                <span>Off-Peak: {100 - inputs.touPeakPercentage}%</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Solar Integration */}
                        <div className="space-y-4 p-4 border rounded-lg bg-green-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sun className="h-4 w-4 text-green-600" />
                                    <Label htmlFor="solar-toggle">Enable Solar Integration</Label>
                                </div>
                                <Switch
                                    id="solar-toggle"
                                    checked={inputs.enableSolar}
                                    onCheckedChange={(checked) => handleInputChange('enableSolar', checked)}
                                />
                            </div>

                            {inputs.enableSolar && (
                                <div className="space-y-2">
                                    <Label htmlFor="solar-excess">Excess Energy Generated (kWh)</Label>
                                    <Input
                                        id="solar-excess"
                                        type="number"
                                        value={inputs.solarExcessKWh}
                                        onChange={(e) => handleInputChange('solarExcessKWh', Number(e.target.value))}
                                        placeholder="e.g., 474"
                                        min="0"
                                        step="1"
                                    />
                                    {inputs.tariffType === 'old' && (
                                        <p className="text-xs text-gray-600">
                                            Solar offset will be calculated using the same block rates as your consumption.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* AFA Adjustment - Only for New Tariff */}
                        {inputs.tariffType === 'new' && (
                            <div className="space-y-4 p-4 border rounded-lg bg-orange-50">
                                <div className="flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-orange-600" />
                                    <Label>Automatic Fuel Adjustment (AFA): {inputs.afaSenPerKWh > 0 ? '+' : ''}{inputs.afaSenPerKWh.toFixed(1)} sen/kWh</Label>
                                </div>

                                <div className="space-y-2">
                                    <Slider
                                        value={[inputs.afaSenPerKWh]}
                                        onValueChange={(value) => handleInputChange('afaSenPerKWh', value[0])}
                                        max={3}
                                        min={-3}
                                        step={0.1}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-gray-600">
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

                        <Button
                            onClick={() => setShowCalculation(true)}
                            className="w-full"
                            disabled={!inputs.monthlyUsageKWh || inputs.monthlyUsageKWh <= 0}
                        >
                            Calculate Bill
                        </Button>
                    </CardContent>
                </Card>

                {/* Results Panel */}
                <Card>
                    <CardHeader>
                        <CardTitle>Bill Estimation</CardTitle>
                        <CardDescription>
                            {result ? 'Your estimated electricity bill' : 'Enter usage details to see calculation'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {result ? (
                            <div className="space-y-6">
                                {/* Total Amount */}
                                <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
                                    <div className="text-3xl font-bold text-blue-600">
                                        {formatCurrency(result.breakdown.totalAmount)}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">
                                        Estimated Monthly Bill
                                    </div>
                                </div>

                                {/* Solar Savings */}
                                {(result.solarSavings ?? 0) > 0 && (
                                    <Alert>
                                        <Sun className="h-4 w-4" />
                                        <AlertDescription>
                                            <strong>Solar Savings:</strong> {formatCurrency(result.solarSavings ?? 0)} saved this month
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {/* ToU Comparison */}
                                {result.touComparison && (
                                    <div className="p-4 border rounded-lg bg-blue-50">
                                        <h4 className="font-semibold mb-2">Time of Use Comparison</h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <div className="text-gray-600">General Tariff</div>
                                                <div className="font-semibold">{formatCurrency(result.touComparison.generalTariffAmount)}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-600">ToU Tariff</div>
                                                <div className="font-semibold">{formatCurrency(result.touComparison.touAmount)}</div>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm">Potential Savings:</span>
                                                <div className="text-right">
                                                    <div className={`font-semibold ${result.touComparison.savings > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {result.touComparison.savings > 0 ? '-' : '+'}{formatCurrency(Math.abs(result.touComparison.savings))}
                                                    </div>
                                                    <div className={`text-xs ${result.touComparison.savings > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {formatPercentage(result.touComparison.savingsPercentage)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Quick Summary */}
                                <div className="space-y-2">
                                    <h4 className="font-semibold">Quick Summary</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Usage:</span>
                                            <span>{inputs.monthlyUsageKWh} kWh</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Tariff:</span>
                                            <Badge variant={inputs.tariffType === 'new' ? 'default' : 'secondary'}>
                                                {inputs.tariffType === 'new' ? 'New' : 'Old'}
                                            </Badge>
                                        </div>
                                        {inputs.enableToU && (
                                            <div className="flex justify-between">
                                                <span>ToU:</span>
                                                <Badge variant="outline">Enabled</Badge>
                                            </div>
                                        )}
                                        {inputs.enableSolar && inputs.solarExcessKWh > 0 && (
                                            <div className="flex justify-between">
                                                <span>Solar:</span>
                                                <Badge variant="outline">{inputs.solarExcessKWh} kWh</Badge>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Enter your monthly kWh usage to see the calculation</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Calculation */}
            {result && showCalculation && (
                <Card>
                    <CardHeader>
                        <CardTitle>Detailed Calculation</CardTitle>
                        <CardDescription>
                            Step-by-step breakdown of your electricity bill
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="breakdown" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="breakdown">Calculation Breakdown</TabsTrigger>
                                <TabsTrigger value="tariff-info">Tariff Information</TabsTrigger>
                            </TabsList>

                            <TabsContent value="breakdown" className="space-y-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <pre className="text-sm font-mono whitespace-pre-wrap">
                                        {result.detailedCalculation.join('\n')}
                                    </pre>
                                </div>
                            </TabsContent>

                            <TabsContent value="tariff-info" className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                                <div>• 0-1500 kWh: 27.03 sen/kWh</div>
                                                <div>• &gt;1500 kWh: 37.03 sen/kWh</div>
                                                <div><strong>Capacity Charge:</strong> 4.55 sen/kWh</div>
                                                <div><strong>Network Charge:</strong> 12.85 sen/kWh</div>
                                                <div><strong>Retail Charge:</strong> RM 10.00/month</div>
                                                <div className="text-xs text-gray-600">(Waived if usage ≤ 600 kWh)</div>
                                                <div><strong>EEI Rebate:</strong> Tiered rates</div>
                                                <div className="text-xs text-gray-600">(1-200 kWh: 25 sen/kWh, decreasing by tier up to 1000 kWh)</div>
                                            </div>
                                        </div>
                                    )}

                                    {inputs.tariffType === 'new' && (
                                        <div className="p-4 border rounded-lg bg-green-50">
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
                                        <div className="p-4 border rounded-lg bg-blue-50">
                                            <h4 className="font-semibold mb-2">Time of Use Rates</h4>
                                            <div className="space-y-1 text-sm">
                                                <div><strong>Peak Hours (2PM-10PM, Weekdays):</strong></div>
                                                <div>• 0-1500 kWh: 28.52 sen/kWh</div>
                                                <div>• &gt;1500 kWh: 38.52 sen/kWh</div>
                                                <div><strong>Off-Peak Hours:</strong></div>
                                                <div>• 0-1500 kWh: 24.43 sen/kWh</div>
                                                <div>• &gt;1500 kWh: 34.43 sen/kWh</div>
                                                <div className="text-xs text-gray-600 mt-2">
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