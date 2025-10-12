import pandas as pd
import numpy as np
import joblib, json
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.metrics import classification_report, mean_absolute_error, r2_score
from sklearn.tree import _tree

# Config
DATA = "fertilizer_recommendation_datasettt.csv"
OUT_DIR = "models"
TEST_SIZE = 0.2
RANDOM_STATE = 42

OUT = Path(OUT_DIR); OUT.mkdir(parents=True, exist_ok=True)

# ----------------- Load -----------------
df = pd.read_csv(DATA)
print("Loaded dataset:", df.shape)

# flexible column lookup
cols = {c.lower(): c for c in df.columns}
def getcol(choices):
    for x in choices:
        if x.lower() in cols:
            return cols[x.lower()]
    return None

n_col = getcol(["N_ppm","n","nitrogen"])
p_col = getcol(["P_ppm","p","phosphorus"])
k_col = getcol(["K_ppm","k","potassium"])
ph_col= getcol(["pH","ph"])
crop_col = getcol(["Crop_Type","crop_type","crop"])
soil_col = getcol(["Soil_Type","soil_type","texture"])
y_class_col = getcol(["Fertilizer_Label","fertilizer_label","fertilizer"])
yN = getcol(["Recommended_N_kg_per_ha","recommended_n"])
yP = getcol(["Recommended_P2O5_kg_per_ha","recommended_p2o5"])
yK = getcol(["Recommended_K2O_kg_per_ha","recommended_k"])

print("Using cols:", n_col, p_col, k_col, ph_col, crop_col, soil_col)
print("Targets:", y_class_col, yN, yP, yK)

# ----------------- Build X -----------------
num_cols = [c for c in [n_col,p_col,k_col,ph_col] if c]
cat_cols = [c for c in [crop_col,soil_col] if c]

if len(num_cols) == 0:
    raise SystemExit("No numeric feature columns found (N/P/K/pH) - check CSV headers.")

X = pd.DataFrame()
for c in num_cols:
    X[c] = pd.to_numeric(df[c], errors="coerce")
    med = X[c].median()
    X[c] = X[c].fillna(med)

for c in cat_cols:
    X[c] = df[c].astype(str).fillna("unknown").str.strip().str.lower()

print("Feature frame shape:", X.shape)

# ----------------- Preprocessor -----------------
ohe = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
preprocessor = ColumnTransformer([
    ("num", StandardScaler(), num_cols),
    ("cat", ohe, cat_cols)
], remainder="drop")

preprocessor.fit(X)
joblib.dump(preprocessor, OUT / "preprocessor.joblib")

try:
    cat_names = list(preprocessor.named_transformers_['cat'].get_feature_names_out(cat_cols))
except Exception:
    cat_names = list(preprocessor.named_transformers_['cat'].get_feature_names(cat_cols))
feature_names = list(num_cols) + cat_names

# Export preprocessing stats
scaler = preprocessor.named_transformers_['num']
preprocessing_stats = {
    "numeric_features": num_cols,
    "categorical_features": cat_cols,
    "means": scaler.mean_.tolist(),
    "scales": scaler.scale_.tolist(),
    "feature_names": feature_names
}

# Get categorical mappings
cat_mapping = {}
for i, cat_col in enumerate(cat_cols):
    categories = ohe.categories_[i].tolist()
    cat_mapping[cat_col] = categories

preprocessing_stats["categorical_mappings"] = cat_mapping

with open(OUT / "preprocessing_stats.json", "w") as f:
    json.dump(preprocessing_stats, f, indent=2)

print("Saved preprocessing stats")

# ----------------- Helper: Export Tree Rules -----------------
def tree_to_rules(tree, feature_names, max_depth=5):
    """Extract simplified rules from a decision tree"""
    tree_ = tree.tree_
    feature_name = [feature_names[i] if i != _tree.TREE_UNDEFINED else "undefined" 
                    for i in tree_.feature]
    
    rules = []
    
    def recurse(node, depth, conditions):
        if depth > max_depth or tree_.feature[node] == _tree.TREE_UNDEFINED:
            # Leaf node
            value = tree_.value[node]
            if value.shape[1] == 1:  # Regression
                prediction = float(value[0, 0])
            else:  # Classification
                prediction = int(np.argmax(value[0]))
            
            rules.append({
                "conditions": conditions.copy(),
                "prediction": prediction,
                "samples": int(tree_.n_node_samples[node])
            })
            return
        
        feature = feature_name[node]
        threshold = float(tree_.threshold[node])
        
        # Left branch (<=)
        left_conditions = conditions + [{"feature": feature, "op": "<=", "value": threshold}]
        recurse(tree_.children_left[node], depth + 1, left_conditions)
        
        # Right branch (>)
        right_conditions = conditions + [{"feature": feature, "op": ">", "value": threshold}]
        recurse(tree_.children_right[node], depth + 1, right_conditions)
    
    recurse(0, 0, [])
    return rules

# ----------------- Classifier -----------------
if y_class_col:
    y_class = df[y_class_col].astype(str).str.strip().str.lower()
    mask = ~y_class.isna()
    print("Classifier rows:", mask.sum())
    
    if mask.sum() >= 30:
        Xc = X[mask]; yc = y_class[mask]
        Xc_tr, Xc_te, yc_tr, yc_te = train_test_split(Xc, yc, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=yc)
        Xc_tr_t = preprocessor.transform(Xc_tr)
        Xc_te_t = preprocessor.transform(Xc_te)
        
        clf = RandomForestClassifier(n_estimators=50, max_depth=8, random_state=RANDOM_STATE, n_jobs=-1)
        clf.fit(Xc_tr_t, yc_tr)
        preds = clf.predict(Xc_te_t)
        print("Classifier report:\n", classification_report(yc_te, preds, zero_division=0))
        
        joblib.dump(clf, OUT / "classifier.joblib")
        
        # Export classifier rules (aggregate from multiple trees)
        classes = list(clf.classes_)
        feature_importance = dict(zip(feature_names, clf.feature_importances_.tolist()))
        
        # Export top 3 trees
        classifier_export = {
            "classes": classes,
            "feature_importance": feature_importance,
            "trees": []
        }
        
        for i in range(min(3, len(clf.estimators_))):
            tree_rules = tree_to_rules(clf.estimators_[i], feature_names, max_depth=5)
            classifier_export["trees"].append(tree_rules)
        
        with open(OUT / "classifier_rules.json", "w") as f:
            json.dump(classifier_export, f, indent=2)
        
        print(f"Exported classifier with {len(classes)} classes")

# ----------------- Regression trainer -----------------
def train_rf_reg(target_col, shortname):
    if not target_col:
        print("No target for", shortname); return
    
    y = pd.to_numeric(df[target_col], errors="coerce")
    mask = ~y.isna()
    print(f"Regressor {shortname} rows:", mask.sum())
    
    if mask.sum() < 30:
        print(f"Not enough rows for {shortname} - skipping")
        return
    
    Xr = X[mask]; yr = y[mask]
    Xr_tr, Xr_te, yr_tr, yr_te = train_test_split(Xr, yr, test_size=TEST_SIZE, random_state=RANDOM_STATE)
    Xr_tr_t = preprocessor.transform(Xr_tr)
    Xr_te_t = preprocessor.transform(Xr_te)
    
    reg = RandomForestRegressor(n_estimators=50, max_depth=8, random_state=RANDOM_STATE, n_jobs=-1)
    reg.fit(Xr_tr_t, yr_tr)
    
    preds = reg.predict(Xr_te_t)
    mae = mean_absolute_error(yr_te, preds)
    r2 = r2_score(yr_te, preds)
    print(f"{shortname} MAE: {mae:.2f}, R2: {r2:.3f}")
    
    joblib.dump(reg, OUT / f"rf_reg_{shortname}.joblib")
    
    # Export regressor rules
    feature_importance = dict(zip(feature_names, reg.feature_importances_.tolist()))
    
    regressor_export = {
        "target": shortname,
        "mae": float(mae),
        "r2": float(r2),
        "feature_importance": feature_importance,
        "trees": []
    }
    
    # Export top 3 trees
    for i in range(min(3, len(reg.estimators_))):
        tree_rules = tree_to_rules(reg.estimators_[i], feature_names, max_depth=5)
        regressor_export["trees"].append(tree_rules)
    
    with open(OUT / f"regressor_{shortname}_rules.json", "w") as f:
        json.dump(regressor_export, f, indent=2)
    
    print(f"Exported {shortname} regressor rules")

train_rf_reg(yN, "N")
train_rf_reg(yP, "P2O5")
train_rf_reg(yK, "K2O")

print("\n✓ All done. Models and JSON rules saved to", OUT.resolve())
print("\nGenerated files:")
print("  - preprocessing_stats.json")
print("  - classifier_rules.json")
print("  - regressor_N_rules.json")
print("  - regressor_P2O5_rules.json")
print("  - regressor_K2O_rules.json")
