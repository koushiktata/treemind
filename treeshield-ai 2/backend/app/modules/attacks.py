"""
Adversarial Attack Engine
-------------------------
Tree ensembles (RF/XGB/LGBM/CatBoost) are non-differentiable, so gradient
attacks (FGSM/PGD) don't directly apply. Instead we use black-box,
query-based attacks that only need model.predict():

- "greedy": perturbs the single most-important feature (by model
  feature_importances_) first, in the direction that increases the
  predicted probability of the opposite class, then moves to the next
  most important feature -- a coordinate-greedy boundary search.
- "random": random search within the epsilon ball (baseline to compare
  the greedy strategy against).

Perturbation budget epsilon is expressed as a fraction of each feature's
observed std, so a single epsilon is meaningful across differently-scaled
features (amount vs. a 0-1 score).
"""
import numpy as np


def _feature_importances(model, n_features):
    imp = getattr(model, "feature_importances_", None)
    if imp is None:
        return np.ones(n_features) / n_features
    imp = np.asarray(imp, dtype=float)
    if imp.sum() == 0:
        return np.ones(n_features) / n_features
    return imp / imp.sum()


def _predict_proba_class1(model, X):
    try:
        return model.predict_proba(X)[:, 1]
    except Exception:
        return model.predict(X).astype(float)


def greedy_attack_single(model, x, stds, importances, epsilon, max_iterations, order):
    """Try to flip the prediction of a single sample x via coordinate-greedy
    perturbation, spending budget on the most important features first."""
    orig_pred = int(model.predict(x.reshape(1, -1))[0])
    x_adv = x.copy()
    budget = epsilon * stds  # per-feature absolute perturbation budget

    # Spend the iteration budget on the most-important features only -- past
    # the top ~8, features rarely swing tree-ensemble predictions enough to
    # be worth the query cost, and this keeps the search fast.
    top_order = order[: min(8, len(order))]
    steps_per_feature = max(1, max_iterations // max(1, len(top_order)))
    for feat_idx in top_order:
        step = budget[feat_idx] / steps_per_feature
        if step == 0:
            continue
        for direction in (1, -1):
            trial = x_adv.copy()
            for _ in range(steps_per_feature):
                candidate = trial.copy()
                candidate[feat_idx] += direction * step
                # clip to the allowed budget around the ORIGINAL value
                lo = x[feat_idx] - budget[feat_idx]
                hi = x[feat_idx] + budget[feat_idx]
                candidate[feat_idx] = float(np.clip(candidate[feat_idx], lo, hi))
                pred = int(model.predict(candidate.reshape(1, -1))[0])
                trial = candidate
                if pred != orig_pred:
                    l2 = float(np.linalg.norm((trial - x) / np.where(stds == 0, 1, stds)))
                    return True, trial, l2
            x_adv = trial if direction == 1 else x_adv  # keep best-so-far, try other direction from original
    return False, x_adv, None


def random_attack_single(model, x, stds, epsilon, max_iterations, rng):
    orig_pred = int(model.predict(x.reshape(1, -1))[0])
    budget = epsilon * stds
    for _ in range(max_iterations):
        noise = rng.uniform(-1, 1, size=x.shape) * budget
        candidate = x + noise
        pred = int(model.predict(candidate.reshape(1, -1))[0])
        if pred != orig_pred:
            l2 = float(np.linalg.norm((candidate - x) / np.where(stds == 0, 1, stds)))
            return True, candidate, l2
    return False, x.copy(), None


def run_attack(session, epsilon: float, n_samples: int, max_iterations: int, strategy: str):
    model = session.model
    X_test = session.X_test
    feature_names = session.feature_columns
    n = min(n_samples, len(X_test))
    rng = np.random.default_rng(7)
    idx = rng.choice(len(X_test), size=n, replace=False)
    samples = X_test[idx]

    stds = np.array([session.feature_ranges[f]["std"] for f in feature_names])
    importances = _feature_importances(model, len(feature_names))
    order = np.argsort(-importances)  # most important first

    successes = 0
    l2_distances = []
    per_feature_hits = np.zeros(len(feature_names))
    examples = []

    for i, x in enumerate(samples):
        if strategy == "random":
            ok, x_adv, l2 = random_attack_single(model, x, stds, epsilon, max_iterations, rng)
        else:
            ok, x_adv, l2 = greedy_attack_single(model, x, stds, importances, epsilon, max_iterations, order)
        if ok:
            successes += 1
            l2_distances.append(l2)
            changed = np.where(np.abs(x_adv - x) > 1e-9)[0]
            for fi in changed:
                per_feature_hits[fi] += 1
            if len(examples) < 5:
                examples.append({
                    "original": {feature_names[j]: float(x[j]) for j in range(len(feature_names))},
                    "adversarial": {feature_names[j]: float(x_adv[j]) for j in range(len(feature_names))},
                    "original_pred": int(model.predict(x.reshape(1, -1))[0]),
                    "adversarial_pred": int(model.predict(x_adv.reshape(1, -1))[0]),
                    "l2_distance": l2,
                })

    attack_success_rate = successes / n if n else 0.0
    most_exploited = sorted(
        zip(feature_names, per_feature_hits.tolist()), key=lambda t: -t[1]
    )
    most_exploited = [{"feature": f, "times_perturbed": int(c)} for f, c in most_exploited if c > 0][:10]

    result = {
        "strategy": strategy,
        "epsilon": epsilon,
        "n_samples_tested": n,
        "successful_attacks": successes,
        "attack_success_rate": attack_success_rate,
        "avg_l2_distance": float(np.mean(l2_distances)) if l2_distances else None,
        "most_exploited_features": most_exploited,
        "example_adversarial_cases": examples,
    }
    session.log("attack", {
        "strategy": strategy, "epsilon": epsilon,
        "attack_success_rate": attack_success_rate, "n": n,
    })
    return result
