# TreeShield AI

An AI Security & Reliability Platform for tree-based ML models (Random
Forest, XGBoost, LightGBM, CatBoost). It answers a different question than
a normal ML dashboard: not just "how accurate is this model?" but **"is
this model safe, robust, explainable, and fair enough to deploy?"**

Four research-inspired modules run against any tree model you train or
upload data for:

| # | Module | What it does |
|---|--------|---------------|
| 1 | **Adversarial Attack Engine** | Black-box, query-only search (greedy coordinate + random baseline) that tries to flip predictions within a perturbation budget. No gradients needed -- works on any tree ensemble. |
| 2 | **Robustness Verification** | Sweeps the attack budget and reports robust accuracy at each level -- an empirical lower bound, since exact verification of tree ensembles is NP-hard in general. |
| 3 | **Data-aware Sensitivity Analysis** | Perturbs each feature by a fraction of its own observed range and measures how often that alone flips the prediction. |
| 4 | **Adversarial Hardening** | Generates adversarial examples near training data, retrains on the augmented set, and only adopts the hardened model if it actually improved. |

Plus two supporting modules: **SHAP explainability** (exact TreeExplainer,
global + local) and **fairness analysis** (demographic parity, equal
opportunity).

## Architecture

```
Upload/Sample Data → Train Model → Attack Engine → Robustness → Sensitivity
                                        ↓
                              Hardening → Explainability → Dashboard/Report
```

- **Backend**: FastAPI + scikit-learn/XGBoost/LightGBM/CatBoost + SHAP.
  In-memory session store (per `session_id`) holding the dataset split and
  trained model -- no database needed for the MVP.
- **Frontend**: React + Vite + Tailwind. A tab per module, each calling
  its own endpoint and rendering results (charts, tables, example
  adversarial cases).

## Quick start (Docker)

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000 (docs at `/docs`)

## Quick start (local dev)

**Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```
Frontend dev server runs on http://localhost:5173 and talks to the
backend at `http://localhost:8000` by default (override with a
`VITE_API_URL` env var).

## Using it

1. Click **"Load sample fraud-detection dataset"** (a synthetic
   transaction dataset is generated on the fly), or upload your own CSV
   and name the target column.
2. Pick an algorithm and **Train model**.
3. Work through the tabs: Attack Engine → Robustness → Sensitivity →
   Hardening → Explainability → Fairness.
4. Download the **Report** tab's plain-text summary of everything you ran,
   for a model sign-off packet.

Fairness analysis expects a categorical column from your dataset (e.g.
`region`) and a value to treat as the privileged group (e.g. `north`).

## Tech stack

React, Tailwind, FastAPI, scikit-learn, XGBoost, LightGBM, CatBoost, SHAP,
Docker.

## Notes on the approach

- Because tree ensembles are non-differentiable, the attack engine uses
  **black-box search** rather than gradient methods like FGSM/PGD --
  it only calls `model.predict()`, spending its budget on the
  most-important features first (via `feature_importances_`).
- "Robustness verification" here is **empirical**, not a formal proof --
  it reports the robust accuracy found by the attack search at each
  budget, which is the standard practical approach for tree ensembles
  (exact verification is NP-hard in general for this model class).
- Hardening **relabels adversarial examples with their point-of-origin's
  true label** and only keeps the retrained model if robust accuracy
  improved without meaningfully hurting clean accuracy.

## Project structure

```
treeshield-ai/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI routes
│   │   ├── model_manager.py   # sessions, dataset prep, training
│   │   ├── schemas.py         # request models
│   │   └── modules/
│   │       ├── attacks.py
│   │       ├── robustness.py
│   │       ├── sensitivity.py
│   │       ├── hardening.py
│   │       ├── explainability.py
│   │       └── fairness.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── components/
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

## Resume line

Built TreeShield AI, a research-inspired platform for adversarial
attacks, robustness verification, sensitivity analysis, adversarial
hardening, explainability, and AI model auditing on tree-based ML models.
