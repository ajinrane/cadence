"""
Generate dashboard-ready predictions.csv from a trained dropout model.

Example:
    python generate_predictions_csv.py --model model_artifacts/dropout_weight_model.joblib --data ctgov_graph_edges.csv
"""

from __future__ import annotations

import argparse
import pickle
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


TRIAL_ID_CANDIDATES = ("trial_id", "nct_id", "nctid", "NCTId")


def parse_args():
    parser = argparse.ArgumentParser(description="Generate predictions.csv for CRC dashboard.")
    parser.add_argument(
        "--model",
        type=Path,
        default=Path("model_artifacts/dropout_weight_model.joblib"),
        help="Path to trained model file (.joblib, .pkl, .pickle).",
    )
    parser.add_argument(
        "--data",
        type=Path,
        default=Path("ctgov_graph_edges.csv"),
        help="Path to scraped trial CSV.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("predictions.csv"),
        help="Output CSV path.",
    )
    parser.add_argument(
        "--trial-id-col",
        type=str,
        default=None,
        help="Trial identifier column name. If omitted, auto-detects common names.",
    )
    parser.add_argument(
        "--edge-type-filter",
        type=str,
        default="dropout_event",
        help="If edge_type exists, keep only this value. Use empty string to disable.",
    )
    return parser.parse_args()


def load_model(model_path: Path):
    if not model_path.exists():
        raise FileNotFoundError(f"Model file not found: {model_path}")

    suffix = model_path.suffix.lower()
    if suffix == ".joblib":
        payload = joblib.load(model_path)
    elif suffix in {".pkl", ".pickle"}:
        with open(model_path, "rb") as fh:
            payload = pickle.load(fh)
    else:
        raise ValueError(
            f"Unsupported model format '{suffix}'. Use .joblib, .pkl, or .pickle."
        )

    if isinstance(payload, dict) and "model" in payload:
        model = payload["model"]
        metadata = payload.get("metadata", {})
    else:
        model = payload
        metadata = {}
    return model, metadata


def detect_trial_id_column(df: pd.DataFrame, requested_col: str | None) -> str:
    if requested_col:
        if requested_col not in df.columns:
            raise ValueError(
                f"Requested --trial-id-col '{requested_col}' not found. Available: {list(df.columns)}"
            )
        return requested_col

    for col in TRIAL_ID_CANDIDATES:
        if col in df.columns:
            return col
    raise ValueError(
        "Could not find a trial ID column. Use --trial-id-col with your identifier field."
    )


def prepare_features(df: pd.DataFrame, metadata: dict) -> pd.DataFrame:
    features = metadata.get("features", {}) if isinstance(metadata, dict) else {}
    numeric = list(features.get("numeric", []))
    categorical = list(features.get("categorical", []))

    if numeric or categorical:
        x = df.copy()
        for col in numeric + categorical:
            if col not in x.columns:
                x[col] = np.nan
        for col in numeric:
            x[col] = pd.to_numeric(x[col], errors="coerce")
        return x[numeric + categorical]

    # Fallback for plain model objects without metadata.
    x = df.select_dtypes(include=[np.number]).copy()
    if x.empty:
        raise ValueError(
            "No feature metadata in model and no numeric columns found in input data."
        )
    return x


def predict_dropout_risk(model, x: pd.DataFrame) -> np.ndarray:
    if hasattr(model, "predict_proba"):
        probs = np.asarray(model.predict_proba(x))
        if probs.ndim == 2 and probs.shape[1] >= 2:
            risk = probs[:, 1]
        elif probs.ndim == 2:
            risk = probs[:, 0]
        else:
            risk = probs
    else:
        # Regressor fallback: map direct predictions to 0..1.
        risk = np.asarray(model.predict(x), dtype=float)

    risk = np.asarray(risk, dtype=float).reshape(-1)
    return np.clip(risk, 0.0, 1.0)


def risk_level_from_score(risk: np.ndarray) -> np.ndarray:
    return np.where(risk > 0.7, "High", np.where(risk > 0.4, "Medium", "Low"))


def main():
    args = parse_args()

    model, metadata = load_model(args.model)
    df = pd.read_csv(args.data)

    if args.edge_type_filter and "edge_type" in df.columns:
        df = df[df["edge_type"] == args.edge_type_filter].copy()
        if df.empty:
            raise ValueError(
                f"No rows found after edge_type filter: {args.edge_type_filter}"
            )

    trial_col = detect_trial_id_column(df, args.trial_id_col)
    x = prepare_features(df, metadata)
    risk = predict_dropout_risk(model, x)
    now_ts = datetime.now().isoformat(timespec="seconds")

    predictions = pd.DataFrame(
        {
            "trial_id": df[trial_col].astype(str).values,
            "patient_id": [f"PT-{i:04d}" for i in range(1, len(df) + 1)],
            "dropout_risk": risk.astype(float),
            "risk_level": risk_level_from_score(risk),
            "last_updated": now_ts,
        }
    )

    predictions = predictions[
        ["trial_id", "patient_id", "dropout_risk", "risk_level", "last_updated"]
    ]
    predictions.to_csv(args.output, index=False)

    print("Prediction export complete")
    print(f"Model: {args.model}")
    print(f"Input rows scored: {len(predictions)}")
    print(f"Output: {args.output}")


if __name__ == "__main__":
    main()
