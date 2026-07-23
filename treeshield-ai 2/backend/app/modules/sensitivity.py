"""
Data-aware Sensitivity Analysis
--------------------------------
For each feature, perturb it by a small percentage of its OBSERVED range
(data-aware, rather than an arbitrary fixed delta) while holding all other
features fixed, and measure how often the model's prediction flips and how
much its predicted probability moves. This flags features the model is
disproportionately (and perhaps fragile-ly) sensitive to, independent of
whether they're being adversarially attacked.
"""
import numpy as np


def analyze_sensitivity(session, n_samples: int, perturbation_pct: float):
    model = session.model
    X_test = session.X_test
    feature_names = session.feature_columns
    n = min(n_samples, len(X_test))
    idx = np.random.default_rng(11).choice(len(X_test), size=n, replace=False)
    X = X_test[idx]

    def proba(Xb):
        try:
            return model.predict_proba(Xb)[:, 1]
        except Exception:
            return model.predict(Xb).astype(float)

    base_preds = model.predict(X)
    base_proba = proba(X)

    results = []
    for fi, fname in enumerate(feature_names):
        rng_info = session.feature_ranges[fname]
        span = (rng_info["max"] - rng_info["min"]) or 1e-6
        delta = perturbation_pct * span

        X_up = X.copy(); X_up[:, fi] += delta
        X_down = X.copy(); X_down[:, fi] -= delta

        preds_up = model.predict(X_up)
        preds_down = model.predict(X_down)
        proba_up = proba(X_up)
        proba_down = proba(X_down)

        flip_rate = float(np.mean((preds_up != base_preds) | (preds_down != base_preds)))
        avg_prob_shift = float(np.mean(np.abs(proba_up - base_proba) + np.abs(proba_down - base_proba)) / 2)

        results.append({
            "feature": fname,
            "flip_rate": flip_rate,
            "avg_probability_shift": avg_prob_shift,
            "perturbation_delta": float(delta),
        })

    results.sort(key=lambda r: -r["flip_rate"])
    for rank, r in enumerate(results, start=1):
        r["rank"] = rank

    high_risk = [r["feature"] for r in results if r["flip_rate"] > 0.15]

    result = {
        "perturbation_pct": perturbation_pct,
        "n_samples_tested": n,
        "features": results,
        "high_sensitivity_features": high_risk,
    }
    session.log("sensitivity", {"high_sensitivity_features": high_risk, "n": n})
    return result
