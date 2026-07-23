"""
Explainability (SHAP)
-----------------------
Uses SHAP's TreeExplainer, which is exact and fast for tree ensembles
(no sampling approximation needed like KernelSHAP). Returns global
feature importance (mean |SHAP value|) and, optionally, a local
explanation for one specific test sample.
"""
import numpy as np
import shap


def explain(session, n_samples: int, local_index: int | None):
    model = session.model
    feature_names = session.feature_columns
    X_test = session.X_test
    n = min(n_samples, len(X_test))
    idx = np.random.default_rng(9).choice(len(X_test), size=n, replace=False)
    X_sample = X_test[idx]

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_sample)

    # normalize shape across libraries: some return a list per class, some a single array
    if isinstance(shap_values, list):
        sv = np.array(shap_values[-1])  # positive class
    else:
        sv = np.array(shap_values)
        if sv.ndim == 3:
            sv = sv[:, :, -1]

    mean_abs = np.abs(sv).mean(axis=0)
    global_importance = sorted(
        [{"feature": feature_names[i], "mean_abs_shap": float(mean_abs[i])} for i in range(len(feature_names))],
        key=lambda d: -d["mean_abs_shap"],
    )

    local_explanation = None
    if local_index is not None and 0 <= local_index < len(X_test):
        x = X_test[local_index]
        local_sv = explainer.shap_values(x.reshape(1, -1))
        if isinstance(local_sv, list):
            local_sv = np.array(local_sv[-1])[0]
        else:
            local_sv = np.array(local_sv)
            if local_sv.ndim == 3:
                local_sv = local_sv[0, :, -1]
            else:
                local_sv = local_sv[0]
        contributions = sorted(
            [{"feature": feature_names[i], "value": float(x[i]), "shap_value": float(local_sv[i])}
             for i in range(len(feature_names))],
            key=lambda d: -abs(d["shap_value"]),
        )
        local_explanation = {
            "sample_index": local_index,
            "prediction": int(model.predict(x.reshape(1, -1))[0]),
            "top_contributions": contributions[:10],
        }

    result = {
        "n_samples_used": n,
        "global_feature_importance": global_importance,
        "local_explanation": local_explanation,
    }
    session.log("explainability", {"top_feature": global_importance[0]["feature"] if global_importance else None})
    return result
