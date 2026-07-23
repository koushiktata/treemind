import io
import uuid
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from catboost import CatBoostClassifier

ALGORITHMS = {
    "random_forest": lambda: RandomForestClassifier(
        n_estimators=120, max_depth=8, random_state=42, class_weight="balanced"),
    "xgboost": lambda: XGBClassifier(
        n_estimators=120, max_depth=6, eval_metric="logloss", random_state=42, verbosity=0),
    "lightgbm": lambda: LGBMClassifier(
        n_estimators=120, max_depth=6, random_state=42, verbose=-1, is_unbalance=True),
    "catboost": lambda: CatBoostClassifier(
        iterations=120, depth=6, random_state=42, verbose=False, auto_class_weights="Balanced"),
}


class Session:
    """Holds everything for one working session: raw data, trained model, splits."""

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.df: pd.DataFrame | None = None
        self.target_column: str | None = None
        self.feature_columns: list[str] = []
        self.feature_ranges: dict = {}  # per-feature (min, max, std) for epsilon scaling
        self.algorithm: str | None = None
        self.model = None
        self.X_train = self.X_test = self.y_train = self.y_test = None
        self.metrics: dict = {}
        self.history: list[dict] = []  # log of module runs, used for the report

    def log(self, module: str, summary: dict):
        self.history.append({"module": module, "summary": summary})


SESSIONS: dict[str, Session] = {}


def get_or_create_session(session_id: str | None) -> Session:
    if not session_id or session_id not in SESSIONS:
        session_id = session_id or str(uuid.uuid4())
        SESSIONS[session_id] = Session(session_id)
    return SESSIONS[session_id]


def require_session(session_id: str) -> Session:
    if session_id not in SESSIONS:
        raise ValueError("Unknown session_id. Load a dataset first.")
    return SESSIONS[session_id]


def require_trained(session_id: str) -> Session:
    s = require_session(session_id)
    if s.model is None:
        raise ValueError("No trained model in this session yet. Train a model first.")
    return s


def generate_sample_dataset(n=4000, seed=42) -> pd.DataFrame:
    """Synthetic transaction-fraud-style dataset -- realistic enough to demo
    every module (numeric features + a categorical sensitive attribute)."""
    rng = np.random.default_rng(seed)
    amount = rng.gamma(2.0, 120, n)
    account_age_days = rng.integers(1, 3000, n)
    txn_hour = rng.integers(0, 24, n)
    n_txn_last_24h = rng.poisson(3, n)
    avg_txn_amount_30d = amount * rng.uniform(0.5, 1.5, n)
    distance_from_home_km = rng.exponential(15, n)
    device_trust_score = rng.uniform(0, 1, n)
    merchant_risk_score = rng.uniform(0, 1, n)
    region = rng.choice(["north", "south", "east", "west"], size=n, p=[0.3, 0.3, 0.2, 0.2])

    risk = (
        0.02 * amount / 100
        + 1.5 * (account_age_days < 30)
        + 1.2 * (txn_hour < 5)
        + 0.8 * n_txn_last_24h
        + 2.0 * (distance_from_home_km > 50)
        + 2.5 * (1 - device_trust_score)
        + 2.5 * merchant_risk_score
        - 0.5 * (avg_txn_amount_30d > amount)
    )
    prob = 1 / (1 + np.exp(-(risk - risk.mean()) / risk.std()))
    is_fraud = (rng.uniform(0, 1, n) < prob * 0.35).astype(int)

    df = pd.DataFrame({
        "amount": amount.round(2),
        "account_age_days": account_age_days,
        "txn_hour": txn_hour,
        "n_txn_last_24h": n_txn_last_24h,
        "avg_txn_amount_30d": avg_txn_amount_30d.round(2),
        "distance_from_home_km": distance_from_home_km.round(2),
        "device_trust_score": device_trust_score.round(3),
        "merchant_risk_score": merchant_risk_score.round(3),
        "region": region,
        "is_fraud": is_fraud,
    })
    return df


def load_dataframe_from_bytes(raw: bytes) -> pd.DataFrame:
    return pd.read_csv(io.BytesIO(raw))


def prepare_dataset(session: Session, df: pd.DataFrame, target_column: str):
    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' not found in dataset.")
    df = df.copy()
    # one-hot encode any non-numeric feature columns so tree libs can consume them
    non_numeric = [c for c in df.columns if c != target_column and not pd.api.types.is_numeric_dtype(df[c])]
    if non_numeric:
        df = pd.get_dummies(df, columns=non_numeric, drop_first=False)

    session.df = df
    session.target_column = target_column
    session.feature_columns = [c for c in df.columns if c != target_column]
    session.feature_ranges = {
        c: {
            "min": float(df[c].min()),
            "max": float(df[c].max()),
            "std": float(df[c].std() or 1e-6),
        }
        for c in session.feature_columns
    }


def train_model(session: Session, algorithm: str, test_size: float, random_state: int) -> dict:
    if algorithm not in ALGORITHMS:
        raise ValueError(f"Unknown algorithm '{algorithm}'. Choose from {list(ALGORITHMS)}")
    X = session.df[session.feature_columns].values.astype(float)
    y = session.df[session.target_column].values.astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y if len(set(y)) > 1 else None
    )

    model = ALGORITHMS[algorithm]()
    if algorithm == "xgboost":
        pos, neg = (y_train == 1).sum(), (y_train == 0).sum()
        model.set_params(scale_pos_weight=float(neg / max(pos, 1)))
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    try:
        proba = model.predict_proba(X_test)[:, 1]
        auc = float(roc_auc_score(y_test, proba)) if len(set(y_test)) > 1 else None
    except Exception:
        auc = None

    metrics = {
        "accuracy": float(accuracy_score(y_test, preds)),
        "f1": float(f1_score(y_test, preds, zero_division=0)),
        "roc_auc": auc,
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "n_features": int(X.shape[1]),
    }

    session.algorithm = algorithm
    session.model = model
    session.X_train, session.X_test = X_train, X_test
    session.y_train, session.y_test = y_train, y_test
    session.metrics = metrics
    session.log("train", {"algorithm": algorithm, **metrics})
    return metrics
