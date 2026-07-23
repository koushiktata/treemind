"""
Adversarial Hardening
----------------------
Generates adversarial examples near TRAINING points (using the attack
engine), labels each adversarial example with its point-of-origin's TRUE
label (that's the whole point: the model was fooled into predicting the
wrong class near that point, so we teach it the right answer there), and
retrains on original + adversarial data. We then re-run robustness
verification before vs. after to quantify the improvement.
"""
import numpy as np
from sklearn.metrics import accuracy_score, f1_score
from .attacks import greedy_attack_single, _feature_importances
from .robustness import robust_accuracy_at_epsilon
from ..model_manager import ALGORITHMS


def generate_adversarial_training_set(session, epsilon: float, n_adv_samples: int):
    model = session.model
    X_train, y_train = session.X_train, session.y_train
    feature_names = session.feature_columns
    n = min(n_adv_samples, len(X_train))
    idx = np.random.default_rng(5).choice(len(X_train), size=n, replace=False)

    stds = np.array([session.feature_ranges[f]["std"] for f in feature_names])
    importances = _feature_importances(model, len(feature_names))
    order = np.argsort(-importances)

    adv_X, adv_y = [], []
    for i in idx:
        x, y_true = X_train[i], y_train[i]
        flipped, x_adv, _ = greedy_attack_single(model, x, stds, importances, epsilon, 60, order)
        if flipped:
            adv_X.append(x_adv)
            adv_y.append(y_true)  # correct label -- this is what teaches robustness
    if not adv_X:
        return np.empty((0, X_train.shape[1])), np.empty((0,))
    return np.array(adv_X), np.array(adv_y)


def run_hardening(session, epsilon: float, n_adv_samples: int):
    if session.algorithm not in ALGORITHMS:
        raise ValueError("Unknown algorithm on session.")

    # --- BEFORE snapshot ---
    clean_before, robust_before = robust_accuracy_at_epsilon(session, epsilon, n_samples=25, max_iterations=40)
    preds_before = session.model.predict(session.X_test)
    f1_before = float(f1_score(session.y_test, preds_before, zero_division=0))

    # --- generate adversarial augmentation from training data ---
    adv_X, adv_y = generate_adversarial_training_set(session, epsilon, n_adv_samples)

    X_aug = np.vstack([session.X_train, adv_X]) if len(adv_X) else session.X_train
    y_aug = np.concatenate([session.y_train, adv_y]) if len(adv_y) else session.y_train

    hardened_model = ALGORITHMS[session.algorithm]()
    hardened_model.fit(X_aug, y_aug)

    # swap in the hardened model to measure AFTER, using the same helper
    original_model = session.model
    session.model = hardened_model
    clean_after, robust_after = robust_accuracy_at_epsilon(session, epsilon, n_samples=25, max_iterations=40)
    preds_after = hardened_model.predict(session.X_test)
    f1_after = float(f1_score(session.y_test, preds_after, zero_division=0))

    result = {
        "epsilon": epsilon,
        "n_adversarial_examples_added": int(len(adv_X)),
        "before": {"clean_accuracy": clean_before, "robust_accuracy": robust_before, "f1": f1_before},
        "after": {"clean_accuracy": clean_after, "robust_accuracy": robust_after, "f1": f1_after},
        "robust_accuracy_gain": robust_after - robust_before,
        "clean_accuracy_delta": clean_after - clean_before,
    }

    if result["robust_accuracy_gain"] >= 0.03 and result["clean_accuracy_delta"] > -0.03:
        result["recommendation"] = "accept"
        session.model = hardened_model  # keep the hardened model live
    else:
        result["recommendation"] = "reject"
        session.model = original_model  # not enough gain, or it hurt clean accuracy -- revert

    session.log("hardening", {
        "recommendation": result["recommendation"],
        "robust_accuracy_gain": result["robust_accuracy_gain"],
    })
    return result
