"""
Robustness Verification
------------------------
Empirically estimates robust accuracy: for a sweep of perturbation
budgets (epsilon), what fraction of test samples KEEP their original,
correct prediction under the strongest attack we can find within that
budget? This gives a robustness curve rather than a single brittle
accuracy number, and a "certified-style" verdict at each budget level
(exact verification of tree ensembles is NP-hard in general, so this is
an empirical lower bound via attack search, which is the standard
practical approach used in robustness benchmarking).
"""
import numpy as np
from .attacks import greedy_attack_single, _feature_importances


def robust_accuracy_at_epsilon(session, epsilon, n_samples, max_iterations=60):
    model = session.model
    X_test, y_test = session.X_test, session.y_test
    feature_names = session.feature_columns
    n = min(n_samples, len(X_test))
    idx = np.random.default_rng(3).choice(len(X_test), size=n, replace=False)
    X, y = X_test[idx], y_test[idx]

    stds = np.array([session.feature_ranges[f]["std"] for f in feature_names])
    importances = _feature_importances(model, len(feature_names))
    order = np.argsort(-importances)

    preds = model.predict(X)
    correct_mask = preds == y

    robust_count = 0
    for i, x in enumerate(X):
        if not correct_mask[i]:
            continue  # already wrong -- can't be "robustly correct"
        flipped, _, _ = greedy_attack_single(model, x, stds, importances, epsilon, max_iterations, order)
        if not flipped:
            robust_count += 1

    clean_accuracy = float(correct_mask.mean())
    robust_accuracy = robust_count / n if n else 0.0
    return clean_accuracy, robust_accuracy


def verify_robustness(session, epsilons: list[float] | None, n_samples: int):
    if not epsilons:
        epsilons = [0.01, 0.03, 0.05, 0.1, 0.15, 0.2, 0.3]

    curve = []
    clean_acc = None
    for eps in epsilons:
        ca, ra = robust_accuracy_at_epsilon(session, eps, n_samples)
        clean_acc = ca
        curve.append({"epsilon": eps, "robust_accuracy": ra})

    # simple verdict banding for the dashboard
    def verdict(ra):
        if ra >= 0.9:
            return "strong"
        if ra >= 0.7:
            return "moderate"
        if ra >= 0.4:
            return "weak"
        return "critical"

    for point in curve:
        point["verdict"] = verdict(point["robust_accuracy"])

    result = {
        "clean_accuracy": clean_acc,
        "curve": curve,
        "overall_verdict": verdict(np.mean([p["robust_accuracy"] for p in curve])),
    }
    session.log("robustness", {"overall_verdict": result["overall_verdict"], "epsilons": epsilons})
    return result
