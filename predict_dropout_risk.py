"""
Score dropout risk for CRC actioning using a trained model bundle.

Modes:
1) Score user-provided context rows:
   python predict_dropout_risk.py --input my_contexts.csv

2) Score existing graph dropout events:
   python predict_dropout_risk.py --from-graph
"""

from __future__ import annotations

import argparse
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


def parse_args():
    parser = argparse.ArgumentParser(description="Predict dropout risk from trained model.")
    parser.add_argument(
        "--model",
        type=Path,
        default=Path("model_artifacts/dropout_weight_model.joblib"),
        help="Path to trained model bundle.",
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=None,
        help="CSV of new context rows to score.",
    )
    parser.add_argument(
        "--from-graph",
        action="store_true",
        help="Score dropout_event rows from ctgov_graph_edges.csv.",
    )
    parser.add_argument(
        "--edges",
        type=Path,
        default=Path("ctgov_graph_edges.csv"),
        help="Graph edges CSV used when --from-graph is set.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("model_artifacts/dropout_risk_predictions.csv"),
        help="Output CSV path.",
    )
    parser.add_argument(
        "--top-n",
        type=int,
        default=25,
        help="Rows to print in terminal preview.",
    )
    return parser.parse_args()


def _action_hint(reason: str) -> str:
    r = (reason or "").lower()
    if "adverse" in r:
        return "Prioritize safety follow-up cadence and symptom triage outreach."
    if "lost to follow" in r or "follow-up" in r:
        return "Strengthen retention logistics: reminders, transport, and re-contact workflow."
    if "withdrawal" in r or "withdrew" in r:
        return "Run expectation alignment and motivational touchpoints before next visit."
    if "protocol" in r or "deviation" in r:
        return "Reinforce site protocol training and participant instruction clarity."
    return "Review participant burden and site workflow for targeted retention intervention."


def _ensure_template(input_path: Path, numeric_features: list, categorical_features: list):
    template = pd.DataFrame(columns=numeric_features + categorical_features)
    input_path.parent.mkdir(parents=True, exist_ok=True)
    template.to_csv(input_path, index=False)


def _load_bundle(model_path: Path):
    if not model_path.exists():
        raise FileNotFoundError(f"Model bundle not found: {model_path}")
    bundle = joblib.load(model_path)
    model = bundle["model"]
    metadata = bundle.get("metadata", {})
    features = metadata.get("features", {})
    numeric = features.get("numeric", [])
    categorical = features.get("categorical", [])
    if not numeric and not categorical:
        raise ValueError("Model metadata missing feature definitions.")
    return model, numeric, categorical


def _load_from_graph(edges_path: Path) -> pd.DataFrame:
    if not edges_path.exists():
        raise FileNotFoundError(f"Graph edges file not found: {edges_path}")
    edges = pd.read_csv(edges_path)
    df = edges[edges["edge_type"] == "dropout_event"].copy()
    if df.empty:
        raise ValueError("No dropout_event rows found in graph edges CSV.")
    return df


def _prepare_features(df: pd.DataFrame, numeric_features: list, categorical_features: list) -> pd.DataFrame:
    x = df.copy()
    for col in numeric_features + categorical_features:
        if col not in x.columns:
            x[col] = np.nan
    for col in numeric_features:
        x[col] = pd.to_numeric(x[col], errors="coerce")
    return x[numeric_features + categorical_features]


def _add_risk_labels(scored: pd.DataFrame) -> pd.DataFrame:
    if scored.empty:
        scored["risk_percentile"] = []
        scored["risk_tier"] = []
        return scored

    scored["risk_percentile"] = scored["predicted_graph_weight"].rank(pct=True, method="average")
    scored["risk_tier"] = np.where(
        scored["risk_percentile"] >= 0.80,
        "high",
        np.where(scored["risk_percentile"] >= 0.50, "medium", "low"),
    )
    scored["action_hint"] = scored["reason"].apply(_action_hint) if "reason" in scored.columns else ""
    return scored


def main():
    args = parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)

    model, numeric_features, categorical_features = _load_bundle(args.model)

    if args.from_graph:
        source = _load_from_graph(args.edges)
    else:
        if args.input is None:
            default_template = Path("new_dropout_contexts.csv")
            _ensure_template(default_template, numeric_features, categorical_features)
            raise FileNotFoundError(
                f"No --input provided. Template created at {default_template}. "
                f"Fill it and rerun with --input {default_template}."
            )
        if not args.input.exists():
            _ensure_template(args.input, numeric_features, categorical_features)
            raise FileNotFoundError(
                f"Input file not found. Template created at {args.input}. "
                f"Fill it and rerun."
            )
        source = pd.read_csv(args.input)

    x = _prepare_features(source, numeric_features, categorical_features)
    preds = model.predict(x)

    scored = source.copy()
    scored["predicted_graph_weight"] = preds
    scored = _add_risk_labels(scored)
    scored = scored.sort_values("predicted_graph_weight", ascending=False)

    scored.to_csv(args.output, index=False)

    preview_cols = [
        c
        for c in [
            "trial_id",
            "reason",
            "period_title",
            "arm_id",
            "predicted_graph_weight",
            "risk_percentile",
            "risk_tier",
            "action_hint",
        ]
        if c in scored.columns
    ]
    preview = scored[preview_cols].head(max(args.top_n, 1))

    print("Prediction complete")
    print(f"Output: {args.output}")
    print(f"Rows scored: {len(scored)}")
    if len(preview) > 0:
        print("\nTop predicted risks:")
        print(preview.to_string(index=False))


if __name__ == "__main__":
    main()
