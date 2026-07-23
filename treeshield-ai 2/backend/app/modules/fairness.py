"""
Fairness Analysis
-------------------
Because features get one-hot encoded during preprocessing, the sensitive
column the user names (e.g. "region") may now be several binary columns
(e.g. "region_north", "region_south", ...). We match on that prefix, and
compare the privileged group (the value the user names) against everyone
else on:
  - Demographic parity difference: P(favorable | privileged) - P(favorable | other)
  - Equal opportunity difference: same, but conditioned on true favorable outcome
    (i.e. difference in true positive rate for the favorable class)
"""
import numpy as np


def analyze_fairness(session, sensitive_column: str, privileged_value: str, favorable_label: int):
    model = session.model
    feature_names = session.feature_columns
    X_test, y_test = session.X_test, session.y_test

    encoded_col = f"{sensitive_column}_{privileged_value}"
    if encoded_col in feature_names:
        col_idx = feature_names.index(encoded_col)
        privileged_mask = X_test[:, col_idx] == 1
    elif sensitive_column in feature_names:
        col_idx = feature_names.index(sensitive_column)
        try:
            val = float(privileged_value)
        except ValueError:
            raise ValueError(
                f"'{sensitive_column}' is numeric in the trained model; give a numeric privileged_value."
            )
        privileged_mask = X_test[:, col_idx] == val
    else:
        raise ValueError(
            f"Could not find '{sensitive_column}' (or '{encoded_col}') among model features. "
            f"Available: {feature_names}"
        )

    if privileged_mask.sum() == 0 or (~privileged_mask).sum() == 0:
        raise ValueError("One of the two groups is empty in the test set -- can't compare.")

    preds = model.predict(X_test)
    fav_priv = float(np.mean(preds[privileged_mask] == favorable_label))
    fav_other = float(np.mean(preds[~privileged_mask] == favorable_label))
    demographic_parity_diff = fav_priv - fav_other

    true_fav_priv_mask = privileged_mask & (y_test == favorable_label)
    true_fav_other_mask = (~privileged_mask) & (y_test == favorable_label)
    tpr_priv = float(np.mean(preds[true_fav_priv_mask] == favorable_label)) if true_fav_priv_mask.sum() else None
    tpr_other = float(np.mean(preds[true_fav_other_mask] == favorable_label)) if true_fav_other_mask.sum() else None
    equal_opportunity_diff = (tpr_priv - tpr_other) if (tpr_priv is not None and tpr_other is not None) else None

    def band(v):
        if v is None:
            return "n/a"
        av = abs(v)
        if av < 0.05:
            return "fair"
        if av < 0.1:
            return "watch"
        return "concerning"

    result = {
        "sensitive_column": sensitive_column,
        "privileged_value": privileged_value,
        "group_sizes": {"privileged": int(privileged_mask.sum()), "other": int((~privileged_mask).sum())},
        "favorable_rate": {"privileged": fav_priv, "other": fav_other},
        "demographic_parity_difference": demographic_parity_diff,
        "demographic_parity_verdict": band(demographic_parity_diff),
        "equal_opportunity_difference": equal_opportunity_diff,
        "equal_opportunity_verdict": band(equal_opportunity_diff),
    }
    session.log("fairness", {
        "demographic_parity_verdict": result["demographic_parity_verdict"],
        "equal_opportunity_verdict": result["equal_opportunity_verdict"],
    })
    return result
