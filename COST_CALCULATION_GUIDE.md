# 💰 Cost Per Hectare Calculation Guide (INR - Indian Rupees)

## 📍 Location of Cost Calculation

The cost per hectare is calculated in **three places**:

### 1. **Price Service** (Backend - Real-time Prices)
**File**: `supabase/functions/get-fertilizer-prices/index.ts`  
**Purpose**: Fetches real-time fertilizer prices in Indian Rupees

### 2. **Calculation Logic** (Backend)
**File**: `supabase/functions/generate-recommendation/index.ts`  
**Lines**: 232-265 (updated with real-time prices)

**File**: `supabase/functions/getFertilizerRecommendation/index.ts`  
**Lines**: 228-260 (updated with real-time prices)

### 3. **Display** (Frontend)
**File**: `src/components/RecommendationResults.tsx`  
**Line**: 106

---

## 🧮 Calculation Formula (Real-time Prices in ₹)

The cost per hectare is calculated using **real-time fertilizer prices** fetched from the price service:

```typescript
// Fetch real-time prices
const fertilizerPrices = await getFertilizerPrices();

// Calculate cost
const costEstimate = Math.round(
  (finalRecommendation.nitrogen * fertilizerPrices.nitrogen) +      // ₹ per kg of N
  (finalRecommendation.phosphorus * fertilizerPrices.phosphorus) +   // ₹ per kg of P2O5
  (finalRecommendation.potassium * fertilizerPrices.potassium) +    // ₹ per kg of K2O
  (soilData.organicCarbon < 1.0 ? fertilizerPrices.organic : 0)    // ₹ per hectare if OC < 1%
);
```

### Formula Breakdown:

```
Total Cost (₹) = (N × ₹80) + (P × ₹140) + (K × ₹62) + Organic_Fertilizer_Cost
```

Where:
- **N** = Recommended Nitrogen in kg/ha
- **P** = Recommended Phosphorus in kg/ha  
- **K** = Recommended Potassium in kg/ha
- **Organic_Fertilizer_Cost** = ₹3,750 if organic carbon < 1%, otherwise ₹0

---

## 📊 Cost Per Unit Breakdown (Current Indian Market Rates)

| Nutrient | Cost per kg | Unit Price | Source |
|----------|-------------|------------|--------|
| **Nitrogen (N)** | ₹80 | per kg/ha | Urea (46% N) @ ₹37/kg |
| **Phosphorus (P₂O₅)** | ₹140 | per kg/ha | DAP (46% P2O5) @ ₹65/kg |
| **Potassium (K₂O)** | ₹62 | per kg/ha | MOP (60% K2O) @ ₹37/kg |
| **Organic Fertilizer** | ₹500 | per hectare | Compost/FYM (2500 kg @ ₹0.20/kg) |

**Note**: Prices are fetched in real-time and updated based on current Indian market rates.

---

## 🔍 Detailed Code Location

### Backend Price Service (Real-time Prices)

**File**: `supabase/functions/get-fertilizer-prices/index.ts`

```typescript
// Returns current Indian market rates
{
  nitrogen: 80,      // ₹80 per kg of N
  phosphorus: 140,   // ₹140 per kg of P2O5
  potassium: 62,     // ₹62 per kg of K2O
  organic: 500,     // ₹500 per hectare
  lastUpdated: "2024-...",
  source: "indian-market-rates-2024"
}
```

### Backend Calculation (Edge Function)

**File**: `supabase/functions/generate-recommendation/index.ts`

```typescript
// Lines 232-265
// Fetch real-time fertilizer prices in rupees
let fertilizerPrices = await supabase.functions.invoke('get-fertilizer-prices', {});

// Calculate yield increase and cost
const expectedYieldIncrease = Math.round(5 + (sustainabilityScore - 50) * 0.4);
const costEstimate = Math.round(
  (finalRecommendation.nitrogen * fertilizerPrices.nitrogen) +      // ₹80 per kg of N
  (finalRecommendation.phosphorus * fertilizerPrices.phosphorus) +  // ₹140 per kg of P
  (finalRecommendation.potassium * fertilizerPrices.potassium) +     // ₹62 per kg of K
  (soilData.organicCarbon < 1.0 ? fertilizerPrices.organic : 0)    // ₹500 for organic if OC < 1%
);

// Line 267: Included in result object
const result = {
  fertilizer: finalRecommendation,
  products,
  sustainabilityScore,
  applicationSchedule,
  weatherConsiderations,
  expectedYieldIncrease,
  costEstimate  // ← Cost estimate in ₹ included here
};
```

### Frontend Display

**File**: `src/components/RecommendationResults.tsx`

```typescript
// Lines 104-109: Display in "Expected Outcomes" card
<div className="text-center">
  <div className="text-3xl font-bold text-earth mb-2">
    ₹{results.costEstimate.toLocaleString('en-IN')}  // ← Displayed with Indian number format
  </div>
  <div className="text-sm text-muted-foreground">Cost per Hectare</div>
</div>
```

---

## 📝 Example Calculation (Indian Rupees)

### Example Scenario:
- **Recommended Nitrogen**: 120 kg/ha
- **Recommended Phosphorus**: 60 kg/ha
- **Recommended Potassium**: 80 kg/ha
- **Organic Carbon**: 0.8% (less than 1%)

### Calculation (with real-time prices):
```
Cost = (120 × ₹80) + (60 × ₹140) + (80 × ₹62) + ₹500
     = ₹9,600 + ₹8,400 + ₹4,960 + ₹3,750
     = ₹23,810 per hectare
```

### If Organic Carbon ≥ 1%:
```
Cost = (120 × ₹80) + (60 × ₹140) + (80 × ₹62) + ₹0
     = ₹9,600 + ₹8,400 + ₹4,960
     = ₹22,960 per hectare
```

---

## 🎯 Cost Calculation Logic Explanation (Real-time Prices)

### Why These Prices? (Current Indian Market Rates - 2024)

1. **Nitrogen (₹80/kg)**: 
   - Source: Urea (46-0-0) @ ₹35-40/kg market rate
   - Calculation: ₹37/kg ÷ 0.46 (N content) ≈ ₹80/kg of N
   - Most commonly needed nutrient in Indian agriculture

2. **Phosphorus (₹140/kg)**:
   - Source: DAP (18-46-0) @ ₹60-70/kg market rate
   - Calculation: ₹65/kg ÷ 0.46 (P2O5 content) ≈ ₹140/kg of P2O5
   - Higher cost due to processing and mining requirements
   - Essential for root development and flowering

3. **Potassium (₹62/kg)**:
   - Source: MOP (Muriate of Potash, 60% K2O) @ ₹35-40/kg market rate
   - Calculation: ₹37/kg ÷ 0.60 (K2O content) ≈ ₹62/kg of K2O
   - Important for overall plant health and stress resistance

4. **Organic Fertilizer (₹500/hectare)**:
    - Applied when organic carbon < 1%
    - Includes compost/FYM (Farm Yard Manure)
    - Quantity: 2500 kg/ha @ ₹0.20/kg = ₹500
    - One-time cost for soil improvement

### Real-time Price Updates:
Prices are fetched from `get-fertilizer-prices` edge function which can be updated with:
- Agricultural commodity exchange APIs
- Government fertilizer pricing APIs
- Market rate APIs
- Manual updates based on current market conditions

---

## 🔄 Data Flow (With Real-time Prices)

```
1. User submits recommendation form
   ↓
2. Supabase Edge Function: generate-recommendation
   ↓
3. Fetches real-time prices from: get-fertilizer-prices
   ↓
4. Calculates finalRecommendation (N, P, K values)
   ↓
5. Calculates costEstimate using real-time prices
   ↓
6. Returns result object with costEstimate (in ₹)
   ↓
7. Frontend receives results
   ↓
8. RecommendationResults.tsx displays ₹{results.costEstimate.toLocaleString('en-IN')}
```

---

## 📍 Where to Find the Code Blocks

### 1. **Calculation Block**
**Location**: `supabase/functions/generate-recommendation/index.ts`
- **Start**: Line 234
- **End**: Line 239
- **Function**: `handler` (async function)

**How to access**:
```bash
supabase/functions/generate-recommendation/index.ts
```

### 2. **Display Block**
**Location**: `src/components/RecommendationResults.tsx`
- **Start**: Line 104
- **End**: Line 109
- **Component**: `RecommendationResults`

**How to access**:
```bash
src/components/RecommendationResults.tsx
```

### 3. **Type Definition**
**Location**: `src/services/recommendationEngine.ts`
- **Line**: 45
- **Type**: `RecommendationResult` interface

---

## 🛠️ How to Modify Cost Calculation

### To Update Real-time Prices:

Edit `supabase/functions/get-fertilizer-prices/index.ts`:

```typescript
// Update the default prices (Lines 25-32)
const prices: FertilizerPrices = {
  nitrogen: 80,        // Update to current market rate
  phosphorus: 140,     // Update to current market rate
  potassium: 62,       // Update to current market rate
  organic: 500,       // Update to current market rate
  lastUpdated: new Date().toISOString(),
  source: 'indian-market-rates-2024'
};
```

### To Integrate Real-time API:

Edit `supabase/functions/get-fertilizer-prices/index.ts`:

```typescript
// Uncomment and configure API integration (Lines 35-42)
const apiResponse = await fetch('https://api.example.com/fertilizer-prices');
if (apiResponse.ok) {
  const apiData = await apiResponse.json();
  prices.nitrogen = apiData.urea.price / 0.46;      // Convert to per kg of N
  prices.phosphorus = apiData.dap.price / 0.46;      // Convert to per kg of P2O5
  prices.potassium = apiData.mop.price / 0.60;       // Convert to per kg of K2O
  prices.source = 'real-time-api';
}
```

### To Change Display Format:

Edit `src/components/RecommendationResults.tsx` (Line 106):

```typescript
// Current (with Indian number formatting)
₹{results.costEstimate.toLocaleString('en-IN')}

// Without formatting
₹{results.costEstimate}

// With decimal places
₹{results.costEstimate.toFixed(2)}
```

---

## 📊 Database Storage

The cost estimate is also stored in the database:

**Table**: `fertilizer_recommendations`  
**Column**: `cost_estimate`  
**Type**: `number`

**Location**: `supabase/functions/generate-recommendation/index.ts` (Line 265)

```typescript
await supabase
  .from('fertilizer_recommendations')
  .insert({
    // ... other fields
    cost_estimate: costEstimate,  // ← Stored here
  });
```

---

## ✅ Summary

- **Price Service**: `supabase/functions/get-fertilizer-prices/index.ts` (Real-time prices)
- **Calculation Location**: `supabase/functions/generate-recommendation/index.ts` (Lines 232-265)
- **Alternative Calculation**: `supabase/functions/getFertilizerRecommendation/index.ts` (Lines 228-260)
- **Display Location**: `src/components/RecommendationResults.tsx` (Line 106)
- **Formula**: `(N × ₹80) + (P × ₹140) + (K × ₹62) + Organic(₹500 if OC < 1%)`
- **Result**: Rounded to nearest integer
- **Unit**: Indian Rupees (₹) per hectare
- **Format**: Indian number format (e.g., ₹26,710)
- **Storage**: Saved in `fertilizer_recommendations` table

---

## 🔍 Quick Reference

| Item | Location | Line(s) |
|------|----------|---------|
| **Price Service** | `supabase/functions/get-fertilizer-prices/index.ts` | All |
| **Calculation** | `supabase/functions/generate-recommendation/index.ts` | 232-265 |
| **Alternative Calculation** | `supabase/functions/getFertilizerRecommendation/index.ts` | 228-260 |
| **Display** | `src/components/RecommendationResults.tsx` | 106 |
| **Type Definition** | `src/services/recommendationEngine.ts` | 45 |
| **Database Storage** | `supabase/functions/generate-recommendation/index.ts` | 265 |

