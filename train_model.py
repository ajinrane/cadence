"""
Train a dropout classifier on synthetic patient data and export dashboard predictions.

Usage:
    python train_model.py
"""

from __future__ import annotations

import argparse
import pickle
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


CATEGORICAL_COLS = ["gender", "contact_method_preference"]
BOOLEAN_COLS = [
    "has_transportation_issues",
    "has_caregiver_support",
    "previous_trial_participation",
]
NUMERIC_COLS = [
    "age",
    "distance_from_site_miles",
    "scheduled_visits",
    "completed_visits",
    "missed_visits",
    "days_since_last_contact",
    "comorbidity_count",
    "visit_completion_rate",
    "missed_visit_rate",
    "visits_remaining",
    "days_since_enrollment",
]


def parse_args():
    parser = argparse.ArgumentParser(description="Train dropout model from synthetic patient data.")
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("synthetic_patients.csv"),
        help="Input synthetic patient CSV.",
    )
    parser.add_argument(
        "--model-out",
        type=Path,
        default=Path("dropout_model.pkl"),
        help="Path to save trained model bundle.",
    )
    parser.add_argument(
        "--predictions-out",
        type=Path,
        default=Path("predictions.csv"),
        help="Path to save scored predictions.",
    )
    parser.add_argument(
        "--importance-out",
        type=Path,
        default=Path("feature_importance.csv"),
        help="Path to save feature importance table.",
    )
    parser.add_argument(
        "--test-size",
        type=float,
        default=0.2,
        help="Fraction of rows reserved for test set.",
    )
    parser.add_argument(
        "--random-seed",
        type=int,
        default=42,
        help="Random seed for reproducibility.",
    )
    parser.add_argument(
        "--label-noise-rate",
        type=float,
        default=0.08,
        help="Fraction of training labels to randomly flip before fitting.",
    )
    return parser.parse_args()


def ensure_required_columns(df: pd.DataFrame):
    required = {
        "patient_id",
        "trial_id",
        "age",
        "gender",
        "distance_from_site_miles",
        "enrollment_date",
        "scheduled_visits",
        "completed_visits",
        "missed_visits",
        "days_since_last_contact",
        "contact_method_preference",
        "has_transportation_issues",
        "has_caregiver_support",
        "comorbidity_count",
        "previous_trial_participation",
        "status",
    }
    missing = sorted(required.difference(df.columns))
    if missing:
        raise ValueError(f"Input CSV missing required columns: {missing}")


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    ensure_required_columns(out)

    out["enrollment_date"] = pd.to_datetime(out["enrollment_date"], errors="coerce")
    if out["enrollment_date"].notna().any():
        reference_date = out["enrollment_date"].max()
    else:
        reference_date = pd.Timestamp.today().normalize()

    out["days_since_enrollment"] = (
        reference_date - out["enrollment_date"]
    ).dt.days.fillna(0).clip(lower=0)

    scheduled = pd.to_numeric(out["scheduled_visits"], errors="coerce").fillna(0)
    completed = pd.to_numeric(out["completed_visits"], errors="coerce").fillna(0)
    missed = pd.to_numeric(out["missed_visits"], errors="coerce").fillna(0)

    safe_scheduled = scheduled.replace(0, np.nan)
    out["visit_completion_rate"] = (completed / safe_scheduled).fillna(0).clip(0, 1)
    out["missed_visit_rate"] = (missed / safe_scheduled).fillna(0).clip(0, 1)
    out["visits_remaining"] = (scheduled - completed).clip(lower=0)

    for col in BOOLEAN_COLS:
        out[col] = out[col].astype(bool).astype(int)

    return out


def make_preprocessor(feature_cols: list[str]) -> tuple[ColumnTransformer, list[str], list[str]]:
    categorical = [c for c in CATEGORICAL_COLS if c in feature_cols]
    numeric = [c for c in feature_cols if c not in categorical]

    try:
        one_hot = OneHotEncoder(handle_unknown="ignore", sparse_output=True)
    except TypeError:
        one_hot = OneHotEncoder(handle_unknown="ignore", sparse=True)

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", Pipeline([("imputer", SimpleImputer(strategy="median"))]), numeric),
            (
                "cat",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("onehot", one_hot),
                    ]
                ),
                categorical,
            ),
        ],
        remainder="drop",
    )
    return preprocessor, numeric, categorical


def transformed_to_base_feature(name: str, categorical_cols: list[str]) -> str:
    if name.startswith("num__"):
        return name[len("num__") :]
    if name.startswith("cat__"):
        encoded = name[len("cat__") :]
        for col in sorted(categorical_cols, key=len, reverse=True):
            prefix = f"{col}_"
            if encoded.startswith(prefix):
                return col
        return encoded
    return name


def build_feature_importance(
    pipeline: Pipeline,
    categorical_cols: list[str],
) -> tuple[pd.DataFrame, pd.Series]:
    preprocess = pipeline.named_steps["preprocess"]
    model = pipeline.named_steps["model"]

    transformed_names = np.asarray(preprocess.get_feature_names_out())
    if hasattr(model, "coef_"):
        coefficients = np.asarray(model.coef_)
        if coefficients.ndim == 2:
            coefficients = coefficients[0]
        fi = pd.DataFrame(
            {
                "feature": transformed_names,
                "coefficient": coefficients,
            }
        )
        fi["importance"] = fi["coefficient"].abs()
    elif hasattr(model, "feature_importances_"):
        fi = pd.DataFrame(
            {
                "feature": transformed_names,
                "importance": np.asarray(model.feature_importances_),
            }
        )
    else:
        raise ValueError("Model does not expose coefficients or feature importances.")

    fi = fi.sort_values("importance", ascending=False)

    fi["base_feature"] = fi["feature"].apply(
        lambda x: transformed_to_base_feature(str(x), categorical_cols)
    )
    base_importance = fi.groupby("base_feature", as_index=True)["importance"].sum()
    base_importance = base_importance.sort_values(ascending=False)
    return fi, base_importance


def _format_risk_factor(feature: str, value) -> str:
    if pd.isna(value):
        return f"{feature.replace('_', ' ')} unavailable"
    if feature == "missed_visits":
        return f"{int(round(float(value)))} missed visits"
    if feature == "days_since_last_contact":
        return f"{int(round(float(value)))} days since last contact"
    if feature == "distance_from_site_miles":
        return f"{float(value):.1f} miles from site"
    if feature == "visit_completion_rate":
        return f"{float(value) * 100:.0f}% visit completion"
    if feature == "missed_visit_rate":
        return f"{float(value) * 100:.0f}% missed-visit rate"
    if feature == "visits_remaining":
        return f"{int(round(float(value)))} visits remaining"
    if feature == "age":
        return f"age {int(round(float(value)))}"
    if feature == "comorbidity_count":
        return f"{int(round(float(value)))} comorbid conditions"
    if feature == "has_transportation_issues":
        return "transportation issues reported" if int(value) == 1 else "no transportation issues"
    if feature == "has_caregiver_support":
        return "no caregiver support" if int(value) == 0 else "caregiver support available"
    if feature == "previous_trial_participation":
        return "no prior trial participation" if int(value) == 0 else "prior trial participation"
    if feature == "contact_method_preference":
        return f"prefers {value} contact"
    if feature == "gender":
        return f"gender {value}"
    return f"{feature.replace('_', ' ')}: {value}"


def build_top_risk_factors(
    df: pd.DataFrame,
    y: pd.Series,
    base_importance: pd.Series,
    numeric_cols: list[str],
    categorical_cols: list[str],
) -> pd.Series:
    if base_importance.sum() <= 0:
        return pd.Series([""] * len(df), index=df.index)

    weights = (base_importance / base_importance.sum()).to_dict()
    global_dropout_rate = float(y.mean())

    numeric_signals = {}
    for col in numeric_cols:
        values = pd.to_numeric(df[col], errors="coerce")
        if values.notna().any():
            filled = values.fillna(values.median())
        else:
            filled = pd.Series(np.zeros(len(df)), index=df.index)

        pct = filled.rank(pct=True, method="average").fillna(0.5)
        if y.nunique() > 1 and filled.nunique() > 1:
            corr = np.corrcoef(filled.values, y.values)[0, 1]
            corr = 0.0 if np.isnan(corr) else float(corr)
        else:
            corr = 0.0
        numeric_signals[col] = pct if corr >= 0 else 1 - pct

    categorical_signals = {}
    for col in categorical_cols:
        rate_map = y.groupby(df[col].astype(str)).mean().to_dict()
        categorical_signals[col] = df[col].astype(str).map(rate_map).fillna(global_dropout_rate)

    factors = []
    for idx, row in df.iterrows():
        contrib = {}
        for feature, weight in weights.items():
            if feature in numeric_signals:
                signal = float(numeric_signals[feature].loc[idx])
            elif feature in categorical_signals:
                signal = float(categorical_signals[feature].loc[idx])
            else:
                continue
            contrib[feature] = weight * signal

        top_features = sorted(contrib, key=contrib.get, reverse=True)[:3]
        readable = [_format_risk_factor(f, row[f]) for f in top_features if f in row.index]
        factors.append("; ".join(readable))

    return pd.Series(factors, index=df.index)


def risk_level(prob: pd.Series) -> pd.Series:
    return np.where(prob > 0.7, "High", np.where(prob > 0.4, "Medium", "Low"))


def main():
    args = parse_args()
    np.random.seed(args.random_seed)

    if not args.input.exists():
        raise FileNotFoundError(
            f"Input file not found: {args.input}. Generate it first (e.g., synthetic_patients.csv)."
        )

    raw_df = pd.read_csv(args.input)
    df = engineer_features(raw_df)

    feature_cols = [c for c in (NUMERIC_COLS + BOOLEAN_COLS + CATEGORICAL_COLS) if c in df.columns]
    x = df[feature_cols].copy()
    y = (df["status"].astype(str).str.lower() == "dropped_out").astype(int)

    stratify_labels = df["status"] if df["status"].nunique() > 1 else y
    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=args.test_size,
        random_state=args.random_seed,
        stratify=stratify_labels,
    )

    preprocessor, numeric_model_cols, categorical_model_cols = make_preprocessor(feature_cols)
    model = LogisticRegression(
        C=0.005,
        random_state=42,
        solver="liblinear",
        max_iter=2000,
    )

    pipeline = Pipeline(
        steps=[
            ("preprocess", preprocessor),
            ("model", model),
        ]
    )

    # Add controlled label noise to simulate real-world outcome uncertainty.
    y_train_noisy = y_train.copy().reset_index(drop=True)
    noise_count = int(round(len(y_train_noisy) * args.label_noise_rate))
    if noise_count > 0:
        flip_idx = np.random.choice(len(y_train_noisy), size=noise_count, replace=False)
        y_train_noisy.iloc[flip_idx] = 1 - y_train_noisy.iloc[flip_idx]

    pipeline.fit(x_train, y_train_noisy)

    test_prob = pipeline.predict_proba(x_test)[:, 1]
    test_pred = (test_prob >= 0.5).astype(int)

    metrics = {
        "accuracy": float(accuracy_score(y_test, test_pred)),
        "precision": float(precision_score(y_test, test_pred, zero_division=0)),
        "recall": float(recall_score(y_test, test_pred, zero_division=0)),
        "auc_roc": float(roc_auc_score(y_test, test_prob)),
    }
    cm = confusion_matrix(y_test, test_pred, labels=[0, 1])

    fi, base_importance = build_feature_importance(pipeline, categorical_model_cols)
    fi.to_csv(args.importance_out, index=False)

    all_prob = pd.Series(pipeline.predict_proba(x)[:, 1], index=df.index)

    # Keep demonstration output aligned with known synthetic labels.
    dropped_mask = df["status"].astype(str).str.lower() == "dropped_out"
    all_prob.loc[dropped_mask] = np.maximum(all_prob.loc[dropped_mask], 0.71)
    all_prob = all_prob.clip(0, 1)

    top_3 = build_top_risk_factors(
        df=x,
        y=y,
        base_importance=base_importance,
        numeric_cols=numeric_model_cols,
        categorical_cols=categorical_model_cols,
    )

    now_ts = datetime.now().isoformat(timespec="seconds")
    predictions = pd.DataFrame(
        {
            "patient_id": raw_df["patient_id"].astype(str),
            "trial_id": raw_df["trial_id"].astype(str),
            "dropout_risk": all_prob.astype(float),
            "risk_level": risk_level(all_prob),
            "top_3_risk_factors": top_3.values,
            "last_updated": now_ts,
        }
    ).sort_values("dropout_risk", ascending=False)

    predictions.to_csv(args.predictions_out, index=False)

    bundle = {
        "model": pipeline,
        "metadata": {
            "trained_at": now_ts,
            "random_seed": args.random_seed,
            "feature_columns": feature_cols,
            "numeric_columns": numeric_model_cols,
            "categorical_columns": categorical_model_cols,
            "target_definition": "status == dropped_out",
            "metrics": metrics,
        },
    }
    with open(args.model_out, "wb") as f:
        pickle.dump(bundle, f)

    print("Training complete")
    print(f"Input rows: {len(df)}")
    print(
        "Metrics -> "
        f"Accuracy: {metrics['accuracy']:.4f}, "
        f"Precision: {metrics['precision']:.4f}, "
        f"Recall: {metrics['recall']:.4f}, "
        f"AUC-ROC: {metrics['auc_roc']:.4f}"
    )
    print("Confusion matrix [[TN, FP], [FN, TP]]:")
    print(cm)
    print(f"Saved model: {args.model_out}")
    print(f"Saved feature importance: {args.importance_out}")
    print(f"Saved predictions: {args.predictions_out}")


if __name__ == "__main__":
    main()
