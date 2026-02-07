"""
Train a baseline model for dropout risk weighting from graph exports.

Inputs:
    - ctgov_graph_edges.csv
    - ctgov_graph_nodes.csv

Outputs (default: ./model_artifacts):
    - dropout_weight_model.joblib
    - metrics.json
    - feature_importance.csv
    - scored_dropout_events.csv

Usage:
    python train_dropout_model.py
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


RANDOM_SEED = 42
DEFAULT_TARGET = "graph_weight"


def parse_args():
    parser = argparse.ArgumentParser(description="Train dropout context-graph model.")
    parser.add_argument(
        "--edges",
        type=Path,
        default=Path("ctgov_graph_edges.csv"),
        help="Path to graph edges CSV.",
    )
    parser.add_argument(
        "--nodes",
        type=Path,
        default=Path("ctgov_graph_nodes.csv"),
        help="Path to graph nodes CSV.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("model_artifacts"),
        help="Directory to write model artifacts.",
    )
    parser.add_argument(
        "--target",
        type=str,
        default=DEFAULT_TARGET,
        help="Target column to predict from edges table.",
    )
    parser.add_argument(
        "--test-size",
        type=float,
        default=0.2,
        help="Test set fraction.",
    )
    return parser.parse_args()


def load_data(edges_path: Path, nodes_path: Path) -> tuple[pd.DataFrame, pd.DataFrame]:
    if not edges_path.exists():
        raise FileNotFoundError(f"Edges file not found: {edges_path}")
    if not nodes_path.exists():
        raise FileNotFoundError(f"Nodes file not found: {nodes_path}")
    return pd.read_csv(edges_path), pd.read_csv(nodes_path)


def prepare_training_frame(
    edges: pd.DataFrame, nodes: pd.DataFrame, target_col: str
) -> tuple[pd.DataFrame, pd.Series, dict]:
    dropout_edges = edges[edges["edge_type"] == "dropout_event"].copy()
    if dropout_edges.empty:
        raise ValueError("No dropout_event edges found in edges CSV.")
    if target_col not in dropout_edges.columns:
        raise ValueError(f"Target column '{target_col}' missing from dropout edges.")

    trial_nodes = nodes[nodes["node_type"] == "trial"].copy()
    keep_trial_cols = [
        "trial_id",
        "search_condition",
        "sponsor_class",
        "enrollment_count",
        "num_countries",
        "total_sites",
        "completion_date",
    ]
    keep_trial_cols = [c for c in keep_trial_cols if c in trial_nodes.columns]
    trial_nodes = trial_nodes[keep_trial_cols].drop_duplicates(subset=["trial_id"])

    df = dropout_edges.merge(trial_nodes, on="trial_id", how="left")

    numeric_cols = [
        "discontinued_n",
        "started_n",
        "completed_n",
        "rate_vs_trial_start",
        "base_rate",
        "size_factor_log1p_started",
        "recency_decay",
        "evidence_quality",
        "enrollment_count",
        "num_countries",
        "total_sites",
    ]
    categorical_cols = [
        "reason",
        "period_title",
        "arm_id",
        "search_condition",
        "sponsor_class",
    ]

    numeric_cols = [c for c in numeric_cols if c in df.columns]
    categorical_cols = [c for c in categorical_cols if c in df.columns]

    # Coerce numeric features
    for col in numeric_cols + [target_col]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=[target_col]).copy()
    if df.empty:
        raise ValueError("No rows left after dropping missing target values.")

    x = df[numeric_cols + categorical_cols].copy()
    y = df[target_col].copy()

    meta = {
        "row_count": int(len(df)),
        "numeric_features": numeric_cols,
        "categorical_features": categorical_cols,
        "target": target_col,
    }
    return x, y, meta


def temporal_or_random_split(
    x: pd.DataFrame, y: pd.Series, original_df: pd.DataFrame | None = None, test_size: float = 0.2
):
    if original_df is not None and "completion_date" in original_df.columns:
        date_series = pd.to_datetime(original_df["completion_date"], errors="coerce")
        valid_dates = date_series.notna().sum()
        if valid_dates >= max(100, int(0.5 * len(date_series))):
            cutoff = date_series.quantile(1 - test_size)
            train_mask = date_series <= cutoff
            test_mask = date_series > cutoff
            if train_mask.sum() > 0 and test_mask.sum() > 0:
                return (
                    x[train_mask],
                    x[test_mask],
                    y[train_mask],
                    y[test_mask],
                    {
                        "split_strategy": "temporal",
                        "cutoff_date": str(cutoff.date()),
                        "train_rows": int(train_mask.sum()),
                        "test_rows": int(test_mask.sum()),
                    },
                )

    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=test_size, random_state=RANDOM_SEED
    )
    return (
        x_train,
        x_test,
        y_train,
        y_test,
        {
            "split_strategy": "random",
            "cutoff_date": None,
            "train_rows": int(len(x_train)),
            "test_rows": int(len(x_test)),
        },
    )


def train_model(x_train: pd.DataFrame, y_train: pd.Series, numeric_cols: list, categorical_cols: list):
    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
        ]
    )
    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    preprocess = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_cols),
            ("cat", categorical_transformer, categorical_cols),
        ]
    )

    model = RandomForestRegressor(
        n_estimators=400,
        random_state=RANDOM_SEED,
        n_jobs=-1,
        min_samples_leaf=2,
    )

    pipeline = Pipeline(steps=[("preprocess", preprocess), ("model", model)])
    pipeline.fit(x_train, y_train)
    return pipeline


def evaluate_model(model: Pipeline, x_test: pd.DataFrame, y_test: pd.Series) -> dict:
    preds = model.predict(x_test)
    rmse = mean_squared_error(y_test, preds) ** 0.5
    return {
        "mae": float(mean_absolute_error(y_test, preds)),
        "rmse": float(rmse),
        "r2": float(r2_score(y_test, preds)),
    }


def collect_feature_importance(
    model: Pipeline, numeric_cols: list, categorical_cols: list
) -> pd.DataFrame:
    rf = model.named_steps["model"]
    preprocess = model.named_steps["preprocess"]

    feature_names = preprocess.get_feature_names_out()
    importances = rf.feature_importances_

    df = pd.DataFrame(
        {
            "feature": feature_names,
            "importance": importances,
        }
    ).sort_values("importance", ascending=False)

    df["feature_group"] = np.where(
        df["feature"].str.startswith("num__"), "numeric", "categorical"
    )
    return df


def main():
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    edges, nodes = load_data(args.edges, args.nodes)
    x, y, meta = prepare_training_frame(edges, nodes, args.target)

    # For split logic that can use completion date, rebuild source frame with that column.
    split_source = edges[edges["edge_type"] == "dropout_event"].merge(
        nodes[nodes["node_type"] == "trial"][["trial_id", "completion_date"]]
        if "completion_date" in nodes.columns
        else nodes[nodes["node_type"] == "trial"][["trial_id"]],
        on="trial_id",
        how="left",
    )
    split_source = split_source.loc[x.index]

    x_train, x_test, y_train, y_test, split_meta = temporal_or_random_split(
        x, y, original_df=split_source, test_size=args.test_size
    )

    pipeline = train_model(
        x_train,
        y_train,
        meta["numeric_features"],
        meta["categorical_features"],
    )
    metrics = evaluate_model(pipeline, x_test, y_test)
    feature_importance = collect_feature_importance(
        pipeline,
        meta["numeric_features"],
        meta["categorical_features"],
    )

    all_preds = pipeline.predict(x)
    scored = x.copy()
    scored["actual_target"] = y.values
    scored["predicted_target"] = all_preds
    scored["absolute_error"] = (scored["actual_target"] - scored["predicted_target"]).abs()

    model_bundle = {
        "model": pipeline,
        "metadata": {
            "created_at": datetime.now().isoformat(),
            "seed": RANDOM_SEED,
            "target": args.target,
            "train_rows": split_meta["train_rows"],
            "test_rows": split_meta["test_rows"],
            "split_strategy": split_meta["split_strategy"],
            "cutoff_date": split_meta["cutoff_date"],
            "features": {
                "numeric": meta["numeric_features"],
                "categorical": meta["categorical_features"],
            },
            "metrics": metrics,
        },
    }

    model_path = args.output_dir / "dropout_weight_model.joblib"
    metrics_path = args.output_dir / "metrics.json"
    fi_path = args.output_dir / "feature_importance.csv"
    scored_path = args.output_dir / "scored_dropout_events.csv"

    joblib.dump(model_bundle, model_path)
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(model_bundle["metadata"], f, indent=2)
    feature_importance.to_csv(fi_path, index=False)
    scored.to_csv(scored_path, index=False)

    print("Training complete")
    print(f"Model:   {model_path}")
    print(f"Metrics: {metrics_path}")
    print(f"Top features: {fi_path}")
    print(f"Scored rows:  {scored_path}")
    print(
        f"Evaluation -> MAE: {metrics['mae']:.6f}, RMSE: {metrics['rmse']:.6f}, R2: {metrics['r2']:.4f}"
    )


if __name__ == "__main__":
    main()
