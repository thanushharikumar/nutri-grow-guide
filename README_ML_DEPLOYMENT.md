# ML Model Deployment Guide

## Step 1: Train Models Locally

1. Install required Python packages:
```bash
pip install pandas numpy scikit-learn joblib
```

2. Prepare your dataset file: `fertilizer_recommendation_datasettt.csv`

3. Run the training script:
```bash
python train_models_with_export.py
```

This will create a `models/` directory containing:
- `preprocessing_stats.json` - Feature normalization parameters
- `regressor_N_rules.json` - Nitrogen prediction rules
- `regressor_P2O5_rules.json` - Phosphorus prediction rules
- `regressor_K2O_rules.json` - Potassium prediction rules
- `*.joblib` files (backup, not used in edge function)

## Step 2: Export JSON Rules to Edge Function

1. Open `supabase/functions/getFertilizerRecommendation/index.ts`

2. Locate the `ML_RULES` constant (around line 21)

3. Update the preprocessing stats:
```typescript
preprocessing: {
  numeric_features: [...], // Copy from preprocessing_stats.json
  means: [...],
  scales: [...],
  categorical_mappings: {...}
}
```

4. Copy tree rules for each nutrient:
   - Copy `regressor_N_rules.json` content to `n_regressor`
   - Copy `regressor_P2O5_rules.json` content to `p_regressor`
   - Copy `regressor_K2O_rules.json` content to `k_regressor`

Example:
```typescript
const ML_RULES = {
  preprocessing: {
    numeric_features: ["nitrogen", "phosphorus", "potassium", "ph"],
    means: [52.3, 28.7, 32.1, 6.8],
    scales: [18.5, 12.3, 14.2, 0.9]
  },
  n_regressor: {
    "target": "N",
    "mae": 12.5,
    "r2": 0.85,
    "trees": [
      [...rules from regressor_N_rules.json...]
    ]
  },
  // ... same for p_regressor and k_regressor
};
```

## Step 3: Test the Integration

The edge function will:
1. ✅ Use ML predictions when rules are loaded
2. ✅ Fall back to crop-based requirements if ML rules are null
3. ✅ Log ML usage in the database

Test by calling the recommendation API and checking:
- Response includes `ml_predictions` field
- `model_used: true` when ML rules are active
- Predictions are reasonable (50-200 kg/ha for most crops)

## Step 4: Monitor Performance

Check edge function logs for:
```
ML predictions: { mlN: 120, mlP: 65, mlK: 45 }
```

Query recommendation_logs table to compare ML vs rule-based accuracy:
```sql
SELECT 
  crop,
  output->'ml_used' as ml_used,
  output->'ml_predictions' as ml_predictions,
  output->'fertilizer' as recommendations
FROM recommendation_logs
ORDER BY ts DESC
LIMIT 100;
```

## Step 5: Iterate and Improve

To update models:
1. Collect more data from recommendation_logs
2. Retrain models with updated dataset
3. Re-export JSON rules
4. Update edge function
5. Deploy (automatic in Lovable)

## Architecture Notes

**Why JSON rules instead of ONNX/TensorFlow.js?**
- ✅ Lightweight (< 100KB vs several MB)
- ✅ Fast inference (< 5ms)
- ✅ Human-readable and debuggable
- ✅ No external dependencies
- ✅ Works natively in Deno edge functions

**Limitations:**
- Only supports tree-based models (RandomForest, XGBoost, etc.)
- Limited to ~5-8 depth trees for reasonable JSON size
- No support for neural networks (use ONNX if needed)

**Trade-offs:**
- Slightly less accurate than full ensemble (3 trees vs 50-200)
- Good enough for most agricultural recommendations (MAE typically < 15 kg/ha)
