import { useMemo, useRef, useState } from 'react';
import { Calculator, Check, ChevronRight, PackageCheck, RotateCcw, Target, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type GoalType = 'profit' | 'return' | 'margin';
type MobilePanel = 'inputs' | 'results';
type InputTab = 'sale' | 'fees';
type StoreLevel = 'standard' | 'basic';
type CategoryKey = 'clothing' | 'athletic-shoes' | 'handbags' | 'trading-cards' | 'general' | 'custom';

type CalculatorInputs = {
  price: number;
  buyerShipping: number;
  quantity: number;
  itemCost: number;
  shippingCost: number;
  miscCost: number;
  salesTaxRate: number;
  adRate: number;
  customFeeRate: number;
  freeInsertion: boolean;
  category: CategoryKey;
  store: StoreLevel;
};

const defaults: CalculatorInputs = {
  price: 39.99,
  buyerShipping: 8.99,
  quantity: 1,
  itemCost: 7,
  shippingCost: 8.25,
  miscCost: 0.5,
  salesTaxRate: 0,
  adRate: 2,
  customFeeRate: 13.6,
  freeInsertion: true,
  category: 'clothing',
  store: 'basic',
};

const categories: Array<{ value: CategoryKey; label: string }> = [
  { value: 'clothing', label: 'Most Clothing, Shoes & Accessories' },
  { value: 'athletic-shoes', label: 'Men’s or Women’s Athletic Shoes' },
  { value: 'handbags', label: 'Women’s Bags & Handbags' },
  { value: 'trading-cards', label: 'Trading Cards / Collectible Card Games' },
  { value: 'general', label: 'Most other eBay categories' },
  { value: 'custom', label: 'Custom fee rate' },
];

export default function SalesCalculator() {
  const [inputs, setInputs] = useState(defaults);
  const [goalType, setGoalType] = useState<GoalType>('profit');
  const [goalValue, setGoalValue] = useState(20);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('inputs');
  const [inputTab, setInputTab] = useState<InputTab>('sale');
  const touchStartX = useRef<number | null>(null);
  const result = useMemo(() => calculateSale(inputs), [inputs]);
  const requiredPrice = useMemo(() => solvePriceForGoal(inputs, goalType, goalValue), [goalType, goalValue, inputs]);
  const goalResult = goalMetric(result, goalType);
  const goalMet = goalResult >= goalValue;

  const update = <K extends keyof CalculatorInputs>(key: K, value: CalculatorInputs[K]) => setInputs((current) => ({ ...current, [key]: value }));
  const handleTouchEnd = (endX: number) => {
    if (touchStartX.current == null) return;
    const distance = endX - touchStartX.current;
    if (mobilePanel === 'inputs' && distance > 60) setMobilePanel('results');
    if (mobilePanel === 'results' && distance < -60) setMobilePanel('inputs');
    touchStartX.current = null;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">Profit planning</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">eBay sales calculator</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Price a listing before you buy it. Estimate proceeds, marketplace fees, total costs, profit, return, and margin.</p>
        </div>
        <Button variant="outline" onClick={() => { setInputs(defaults); setGoalType('profit'); setGoalValue(20); setMobilePanel('inputs'); setInputTab('sale'); }}><RotateCcw className="h-4 w-4" /> Reset</Button>
      </header>

      <div className="xl:hidden" onTouchStart={(event) => { touchStartX.current = event.changedTouches[0]?.clientX ?? null; }} onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}>
        <Tabs value={mobilePanel} onValueChange={(value) => setMobilePanel(value as MobilePanel)} className="min-w-0">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl border border-border bg-card p-1 shadow-sm">
            <TabsTrigger value="inputs" className="py-2.5">Inputs</TabsTrigger>
            <TabsTrigger value="results" className="py-2.5">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="inputs" className="mt-4">
            <Tabs value={inputTab} onValueChange={(value) => setInputTab(value as InputTab)}>
              <TabsList className="grid h-auto w-full grid-cols-2">
                <TabsTrigger value="sale">1. Sale & costs</TabsTrigger>
                <TabsTrigger value="fees">2. Fees & goal</TabsTrigger>
              </TabsList>

          <TabsContent value="sale" className="mt-4 space-y-4">
            <InputSection title="Sale details" description="Start with the buyer’s price, shipping, and quantity.">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <MoneyField label="Buy It Now price" value={inputs.price} onChange={(value) => update('price', value)} />
                <MoneyField label="Buyer shipping" value={inputs.buyerShipping} onChange={(value) => update('buyerShipping', value)} />
                <NumberField label="Quantity" value={inputs.quantity} min={1} step={1} onChange={(value) => update('quantity', Math.max(1, Math.round(value)))} />
              </div>
            </InputSection>

            <InputSection title="Your costs" description="These are per-item costs and are multiplied by quantity.">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <MoneyField label="Item cost" value={inputs.itemCost} onChange={(value) => update('itemCost', value)} />
                <MoneyField label="Shipping label" value={inputs.shippingCost} onChange={(value) => update('shippingCost', value)} />
                <MoneyField label="Misc. cost" value={inputs.miscCost} onChange={(value) => update('miscCost', value)} />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-muted p-3 text-center">
                <QuickMetric label="Gross" value={money(result.grossCollected)} />
                <QuickMetric label="Total costs" value={money(result.totalCosts)} />
                <QuickMetric label="Profit" value={money(result.netProfit)} accent={result.netProfit >= 0} />
              </div>
            </InputSection>
            <div className="flex justify-end"><Button onClick={() => setInputTab('fees')}>Next: Fees & goal <ChevronRight className="h-4 w-4" /></Button></div>
          </TabsContent>

          <TabsContent value="fees" className="mt-4 space-y-4">
            <InputSection title="eBay fee settings" description="Choose the closest US fee preset, then add advertising and tax assumptions.">
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label="eBay category" value={inputs.category} onChange={(value) => update('category', value as CategoryKey)} options={categories} />
                <SelectField label="Store subscription" value={inputs.store} onChange={(value) => update('store', value as StoreLevel)} options={[{ value: 'standard', label: 'No Store / Starter Store' }, { value: 'basic', label: 'Basic or higher Store' }]} />
                <PercentField label="Promoted listing ad rate" value={inputs.adRate} onChange={(value) => update('adRate', value)} />
                <PercentField label="Buyer sales tax rate (optional)" value={inputs.salesTaxRate} onChange={(value) => update('salesTaxRate', value)} />
                {inputs.category === 'custom' ? <PercentField label="Custom final value fee" value={inputs.customFeeRate} onChange={(value) => update('customFeeRate', value)} /> : null}
                <div>
                  <Label className="text-xs">Free insertion fee</Label>
                  <button type="button" role="switch" aria-checked={inputs.freeInsertion} onClick={() => update('freeInsertion', !inputs.freeInsertion)} className="mt-2 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <span>{inputs.freeInsertion ? 'Yes — covered' : 'No — add $0.35'}</span>
                    <span className={cn('flex h-5 w-9 items-center rounded-full p-0.5 transition-colors', inputs.freeInsertion ? 'bg-emerald-600' : 'bg-muted-foreground/30')}><span className={cn('h-4 w-4 rounded-full bg-white transition-transform', inputs.freeInsertion && 'translate-x-4')} /></span>
                  </button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px]"><AssumptionChip label="Applied FVF" value={`${result.effectiveFeeRate.toFixed(2)}%`} /><AssumptionChip label="eBay fees" value={money(result.marketplaceFees)} /><AssumptionChip label="Fee basis" value={money(result.feeBasis)} /></div>
              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">Store subscription cost is not allocated to this sale. Sales tax is included only in eBay’s fee basis and not counted as your revenue.</p>
            </InputSection>

            <InputSection title="Pricing goal" description="Set your target and apply the suggested minimum price in one tap.">
              <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                <div>
                  <Label className="text-xs">Goal type</Label>
                  <div className="mt-2 grid grid-cols-3 rounded-lg border border-input bg-muted/40 p-1">
                    {([['profit', 'Net profit'], ['return', 'Return %'], ['margin', 'Margin %']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setGoalType(value)} className={cn('rounded-md px-2 py-2 text-xs font-medium transition-colors', goalType === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>{label}</button>)}
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">Return = profit ÷ total costs · Margin = profit ÷ gross collected</p>
                </div>
                {goalType === 'profit' ? <MoneyField label="Goal amount" value={goalValue} onChange={setGoalValue} /> : <PercentField label="Goal percentage" value={goalValue} onChange={setGoalValue} />}
              </div>
              <div className={cn('mt-4 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between', goalMet ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30' : 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30')}>
                <div className="flex items-start gap-3"><span className={cn('mt-0.5 rounded-full p-1', goalMet ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-amber-950')}>{goalMet ? <Check className="h-3.5 w-3.5" /> : <Target className="h-3.5 w-3.5" />}</span><div><p className="text-sm font-semibold">{goalMet ? 'Current price meets your goal' : 'Price adjustment suggested'}</p><p className="mt-0.5 text-xs text-muted-foreground">Minimum Buy It Now price: {requiredPrice == null ? 'Not available' : money(requiredPrice)}</p></div></div>
                {requiredPrice != null && Math.abs(requiredPrice - inputs.price) >= 0.01 ? <Button size="sm" variant="outline" onClick={() => update('price', requiredPrice)}>Use {money(requiredPrice)} <ChevronRight className="h-4 w-4" /></Button> : null}
              </div>
            </InputSection>
            <div className="flex justify-end"><Button onClick={() => setMobilePanel('results')}>View results <ChevronRight className="h-4 w-4" /></Button></div>
          </TabsContent>
            </Tabs>
            <p className="mt-4 text-center text-[11px] text-muted-foreground">Swipe right or tap Results to view the live breakdown.</p>
          </TabsContent>

          <TabsContent value="results" className="mt-4">
            <div className="mx-auto max-w-3xl"><ResultsPanel result={result} goalMet={goalMet} goalType={goalType} goalValue={goalValue} /></div>
            <p className="mt-4 text-center text-[11px] text-muted-foreground">Swipe left or tap Inputs to make changes.</p>
          </TabsContent>
        </Tabs>
      </div>

      <div className="hidden items-start gap-5 xl:grid xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
        <DesktopCalculatorInputs inputs={inputs} setInputs={setInputs} result={result} goalType={goalType} setGoalType={setGoalType} goalValue={goalValue} setGoalValue={setGoalValue} requiredPrice={requiredPrice} goalMet={goalMet} />
        <div className="sticky top-5"><ResultsPanel result={result} goalMet={goalMet} goalType={goalType} goalValue={goalValue} /></div>
      </div>
    </div>
  );
}

function DesktopCalculatorInputs({ inputs, setInputs, result, goalType, setGoalType, goalValue, setGoalValue, requiredPrice, goalMet }: {
  inputs: CalculatorInputs;
  setInputs: React.Dispatch<React.SetStateAction<CalculatorInputs>>;
  result: SaleResult;
  goalType: GoalType;
  setGoalType: (value: GoalType) => void;
  goalValue: number;
  setGoalValue: (value: number) => void;
  requiredPrice: number | null;
  goalMet: boolean;
}) {
  const update = <K extends keyof CalculatorInputs>(key: K, value: CalculatorInputs[K]) => setInputs((current) => ({ ...current, [key]: value }));
  return <div className="space-y-4">
    <InputSection title="Sale and costs" description="Enter what the buyer pays and your per-item costs.">
      <div className="grid grid-cols-3 gap-4">
        <MoneyField label="Buy It Now price" value={inputs.price} onChange={(value) => update('price', value)} />
        <MoneyField label="Buyer shipping" value={inputs.buyerShipping} onChange={(value) => update('buyerShipping', value)} />
        <NumberField label="Quantity" value={inputs.quantity} min={1} step={1} onChange={(value) => update('quantity', Math.max(1, Math.round(value)))} />
        <MoneyField label="Item cost" value={inputs.itemCost} onChange={(value) => update('itemCost', value)} />
        <MoneyField label="Shipping label" value={inputs.shippingCost} onChange={(value) => update('shippingCost', value)} />
        <MoneyField label="Misc. cost" value={inputs.miscCost} onChange={(value) => update('miscCost', value)} />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-muted p-3 text-center"><QuickMetric label="Gross" value={money(result.grossCollected)} /><QuickMetric label="Total costs" value={money(result.totalCosts)} /><QuickMetric label="Profit" value={money(result.netProfit)} accent={result.netProfit >= 0} /></div>
    </InputSection>

    <InputSection title="eBay fees" description="US fee presets with editable advertising and tax assumptions.">
      <div className="grid grid-cols-2 gap-4">
        <SelectField label="eBay category" value={inputs.category} onChange={(value) => update('category', value as CategoryKey)} options={categories} />
        <SelectField label="Store subscription" value={inputs.store} onChange={(value) => update('store', value as StoreLevel)} options={[{ value: 'standard', label: 'No Store / Starter Store' }, { value: 'basic', label: 'Basic or higher Store' }]} />
        <PercentField label="Promoted listing ad rate" value={inputs.adRate} onChange={(value) => update('adRate', value)} />
        <PercentField label="Buyer sales tax rate (optional)" value={inputs.salesTaxRate} onChange={(value) => update('salesTaxRate', value)} />
        {inputs.category === 'custom' ? <PercentField label="Custom final value fee" value={inputs.customFeeRate} onChange={(value) => update('customFeeRate', value)} /> : null}
        <div><Label className="text-xs">Free insertion fee</Label><button type="button" role="switch" aria-checked={inputs.freeInsertion} onClick={() => update('freeInsertion', !inputs.freeInsertion)} className="mt-2 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><span>{inputs.freeInsertion ? 'Yes — covered' : 'No — add $0.35'}</span><span className={cn('flex h-5 w-9 items-center rounded-full p-0.5 transition-colors', inputs.freeInsertion ? 'bg-emerald-600' : 'bg-muted-foreground/30')}><span className={cn('h-4 w-4 rounded-full bg-white transition-transform', inputs.freeInsertion && 'translate-x-4')} /></span></button></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-[11px]"><AssumptionChip label="Applied FVF" value={`${result.effectiveFeeRate.toFixed(2)}%`} /><AssumptionChip label="eBay fees" value={money(result.marketplaceFees)} /><AssumptionChip label="Fee basis" value={money(result.feeBasis)} /></div>
    </InputSection>

    <InputSection title="Pricing goal" description="Set a profit, return, or margin target and apply the suggested price.">
      <div className="grid grid-cols-[1fr_180px] gap-4">
        <div><Label className="text-xs">Goal type</Label><div className="mt-2 grid grid-cols-3 rounded-lg border border-input bg-muted/40 p-1">{([['profit', 'Net profit'], ['return', 'Return %'], ['margin', 'Margin %']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setGoalType(value)} className={cn('rounded-md px-2 py-2 text-xs font-medium transition-colors', goalType === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>{label}</button>)}</div><p className="mt-1.5 text-[10px] text-muted-foreground">Return = profit ÷ total costs · Margin = profit ÷ gross collected</p></div>
        {goalType === 'profit' ? <MoneyField label="Goal amount" value={goalValue} onChange={setGoalValue} /> : <PercentField label="Goal percentage" value={goalValue} onChange={setGoalValue} />}
      </div>
      <div className={cn('mt-4 flex items-center justify-between gap-3 rounded-xl border p-4', goalMet ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30' : 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30')}><div className="flex items-start gap-3"><span className={cn('mt-0.5 rounded-full p-1', goalMet ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-amber-950')}>{goalMet ? <Check className="h-3.5 w-3.5" /> : <Target className="h-3.5 w-3.5" />}</span><div><p className="text-sm font-semibold">{goalMet ? 'Current price meets your goal' : 'Price adjustment suggested'}</p><p className="mt-0.5 text-xs text-muted-foreground">Minimum Buy It Now price: {requiredPrice == null ? 'Not available' : money(requiredPrice)}</p></div></div>{requiredPrice != null && Math.abs(requiredPrice - inputs.price) >= 0.01 ? <Button size="sm" variant="outline" onClick={() => update('price', requiredPrice)}>Use {money(requiredPrice)} <ChevronRight className="h-4 w-4" /></Button> : null}</div>
    </InputSection>
  </div>;
}

function ResultsPanel({ result, goalMet, goalType, goalValue }: { result: SaleResult; goalMet: boolean; goalType: GoalType; goalValue: number }) {
  return <aside className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
    <div className="bg-slate-950 p-6 text-white dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Estimated net profit</p><p className={cn('mt-2 text-4xl font-semibold tabular-nums', result.netProfit >= 0 ? 'text-emerald-300' : 'text-red-300')}>{money(result.netProfit)}</p></div><span className="rounded-xl bg-white/10 p-3"><Calculator className="h-5 w-5" /></span></div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <DarkMetric label="Proceeds" value={money(result.netProceeds)} />
        <DarkMetric label="Return/cost" value={percent(result.returnRate)} />
        <DarkMetric label="Margin" value={percent(result.margin)} />
      </div>
      <p className={cn('mt-4 rounded-lg px-3 py-2 text-xs', goalMet ? 'bg-emerald-400/15 text-emerald-200' : 'bg-amber-400/15 text-amber-200')}>{goalMet ? 'Goal met' : 'Below goal'} · {goalLabel(goalType)} target {goalType === 'profit' ? money(goalValue) : `${goalValue.toFixed(1)}%`}</p>
    </div>

    <div className="p-5">
      <h2 className="text-sm font-semibold">Sale and proceeds</h2>
      <div className="mt-3 space-y-2.5"><ResultRow label="Item sales" value={result.itemSales} /><ResultRow label="Shipping collected" value={result.shippingIncome} icon={Truck} /><ResultRow label="Gross collected" value={result.grossCollected} strong /><ResultRow label="Estimated net proceeds" value={result.netProceeds} strong accent /></div>

      <div className="my-5 border-t border-border" />
      <h2 className="text-sm font-semibold">eBay cost breakdown</h2>
      <div className="mt-3 space-y-2.5"><ResultRow label={`Final value fee (${result.effectiveFeeRate.toFixed(2)}%)`} value={-result.finalValueFee} /><ResultRow label="Per-order fee" value={-result.orderFee} /><ResultRow label="Promoted listing fee" value={-result.adFee} /><ResultRow label="Insertion fee" value={-result.insertionFee} /></div>

      <div className="my-5 border-t border-border" />
      <h2 className="text-sm font-semibold">Your cost breakdown</h2>
      <div className="mt-3 space-y-2.5"><ResultRow label="Inventory cost" value={-result.inventoryCost} icon={PackageCheck} /><ResultRow label="Shipping labels" value={-result.shippingCost} icon={Truck} /><ResultRow label="Miscellaneous" value={-result.miscCost} /><ResultRow label="Total costs" value={-result.totalCosts} strong /></div>

      <div className="mt-5 flex items-center justify-between rounded-xl bg-muted px-4 py-4"><div><p className="text-xs text-muted-foreground">Net profit</p><p className="mt-1 text-xs text-muted-foreground">Gross collected − all costs</p></div><p className={cn('text-2xl font-semibold tabular-nums', result.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>{money(result.netProfit)}</p></div>
      <p className="mt-4 text-[11px] leading-5 text-muted-foreground">Estimate only. Actual fees can differ because of seller performance, international fees, taxes on seller fees, listing upgrades, refunds, and eBay fee changes.</p>
    </div>
  </aside>;
}

type SaleResult = ReturnType<typeof calculateSale>;

function calculateSale(input: CalculatorInputs) {
  const quantity = Math.max(1, Math.round(input.quantity));
  const itemSales = Math.max(0, input.price) * quantity;
  const shippingIncome = Math.max(0, input.buyerShipping) * quantity;
  const grossCollected = itemSales + shippingIncome;
  const salesTax = grossCollected * Math.max(0, input.salesTaxRate) / 100;
  const feeBasis = grossCollected + salesTax;
  const perItemFeeBasis = feeBasis / quantity;
  const categoryFee = variableCategoryFee(input.category, input.store, perItemFeeBasis, input.customFeeRate) * quantity;
  const orderFeeWaived = input.category === 'athletic-shoes' && perItemFeeBasis >= 150;
  const orderFee = orderFeeWaived ? 0 : feeBasis <= 10 ? 0.3 : 0.4;
  const adFee = feeBasis * Math.max(0, input.adRate) / 100;
  const insertionFee = input.freeInsertion ? 0 : 0.35;
  const marketplaceFees = categoryFee + orderFee + adFee + insertionFee;
  const inventoryCost = Math.max(0, input.itemCost) * quantity;
  const shippingCost = Math.max(0, input.shippingCost) * quantity;
  const miscCost = Math.max(0, input.miscCost) * quantity;
  const operatingCosts = inventoryCost + shippingCost + miscCost;
  const totalCosts = marketplaceFees + operatingCosts;
  const netProceeds = grossCollected - marketplaceFees;
  const netProfit = grossCollected - totalCosts;
  return { itemSales, shippingIncome, grossCollected, salesTax, feeBasis, finalValueFee: categoryFee, orderFee, adFee, insertionFee, marketplaceFees, inventoryCost, shippingCost, miscCost, operatingCosts, totalCosts, netProceeds, netProfit, returnRate: totalCosts ? netProfit / totalCosts : 0, margin: grossCollected ? netProfit / grossCollected : 0, effectiveFeeRate: feeBasis ? categoryFee / feeBasis * 100 : 0 };
}

function variableCategoryFee(category: CategoryKey, store: StoreLevel, amount: number, customRate: number) {
  if (category === 'custom') return amount * Math.max(0, customRate) / 100;
  if (category === 'athletic-shoes' && amount >= 150) return amount * (store === 'basic' ? 0.07 : 0.08);
  if (category === 'handbags') return amount * (store === 'basic' ? (amount <= 2000 ? 0.13 : 0.07) : (amount <= 2000 ? 0.15 : 0.09));
  if (category === 'trading-cards') return tieredFee(amount, store === 'basic' ? 0.1235 : 0.1325, store === 'basic' ? 2500 : 7500);
  return tieredFee(amount, store === 'basic' ? 0.127 : 0.136, store === 'basic' ? 2500 : 7500);
}

function tieredFee(amount: number, firstRate: number, threshold: number) {
  return Math.min(amount, threshold) * firstRate + Math.max(0, amount - threshold) * 0.0235;
}

function solvePriceForGoal(input: CalculatorInputs, type: GoalType, target: number) {
  if (target < 0) return 0;
  const metric = (price: number) => goalMetric(calculateSale({ ...input, price }), type);
  let low = 0;
  let high = Math.max(100, input.price * 2);
  while (metric(high) < target && high < 1_000_000) high *= 2;
  if (metric(high) < target) return null;
  for (let index = 0; index < 60; index += 1) {
    const middle = (low + high) / 2;
    if (metric(middle) >= target) high = middle;
    else low = middle;
  }
  return Math.ceil(high * 100) / 100;
}

function goalMetric(result: SaleResult, type: GoalType) {
  if (type === 'profit') return result.netProfit;
  return (type === 'return' ? result.returnRate : result.margin) * 100;
}

function InputSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-border bg-card p-5 shadow-sm"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{description}</p><div className="mt-5">{children}</div></section>;
}

function QuickMetric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <div className="min-w-0"><p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className={cn('mt-1 truncate text-sm font-semibold tabular-nums', accent && 'text-emerald-600 dark:text-emerald-400')}>{value}</p></div>;
}

function AssumptionChip({ label, value }: { label: string; value: string }) {
  return <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-muted-foreground"><span>{label}</span> <strong className="font-semibold text-foreground">{value}</strong></span>;
}

function MoneyField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <NumberField label={label} value={value} min={0} step={0.01} prefix="$" onChange={onChange} />;
}

function PercentField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <NumberField label={label} value={value} min={0} step={0.1} suffix="%" onChange={onChange} />;
}

function NumberField({ label, value, min, step, prefix, suffix, onChange }: { label: string; value: number; min?: number; step?: number; prefix?: string; suffix?: string; onChange: (value: number) => void }) {
  return <div><Label className="text-xs">{label}</Label><div className="relative mt-2">{prefix ? <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">{prefix}</span> : null}<Input type="number" inputMode="decimal" value={Number.isFinite(value) ? value : ''} min={min} step={step} onChange={(event) => onChange(Number(event.target.value) || 0)} className={cn(prefix && 'pl-7', suffix && 'pr-8')} />{suffix ? <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">{suffix}</span> : null}</div></div>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <div><Label className="text-xs">{label}</Label><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>;
}

function ResultRow({ label, value, strong, accent, icon: Icon }: { label: string; value: number; strong?: boolean; accent?: boolean; icon?: typeof Truck }) {
  return <div className={cn('flex items-center justify-between gap-4 text-sm', strong && 'border-t border-border pt-2.5 font-semibold')}><span className="flex items-center gap-2 text-muted-foreground">{Icon ? <Icon className="h-3.5 w-3.5" /> : null}{label}</span><span className={cn('tabular-nums', accent && 'text-emerald-600 dark:text-emerald-400')}>{money(value)}</span></div>;
}

function DarkMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-white/5 p-3"><p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold tabular-nums">{value}</p></div>;
}

function goalLabel(type: GoalType) {
  return type === 'profit' ? 'Net profit' : type === 'return' ? 'Return' : 'Margin';
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function percent(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 }).format(value);
}
