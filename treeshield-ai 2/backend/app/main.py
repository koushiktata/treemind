import io
import json
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from . import model_manager as mm
from .schemas import (
    TrainRequest, AttackRequest, RobustnessRequest,
    SensitivityRequest, HardeningRequest, ExplainRequest, FairnessRequest,
)
from .modules import attacks, robustness, sensitivity, hardening, explainability, fairness

app = FastAPI(title="TreeShield AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def err(e: Exception):
    raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "TreeShield AI"}


# ---------------------------------------------------------------- dataset --
@app.post("/api/dataset/sample")
def load_sample_dataset(session_id: str | None = Form(default=None)):
    session = mm.get_or_create_session(session_id)
    df = mm.generate_sample_dataset()
    try:
        mm.prepare_dataset(session, df, target_column="is_fraud")
    except Exception as e:
        err(e)
    return {
        "session_id": session.session_id,
        "columns": list(df.columns),
        "target_column": "is_fraud",
        "n_rows": len(df),
        "preview": df.head(10).to_dict(orient="records"),
    }


@app.post("/api/dataset/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    target_column: str = Form(...),
    session_id: str | None = Form(default=None),
):
    session = mm.get_or_create_session(session_id)
    raw = await file.read()
    try:
        df = mm.load_dataframe_from_bytes(raw)
        mm.prepare_dataset(session, df, target_column=target_column)
    except Exception as e:
        err(e)
    return {
        "session_id": session.session_id,
        "columns": list(df.columns),
        "target_column": target_column,
        "n_rows": len(df),
        "preview": df.head(10).to_dict(orient="records"),
    }


# ------------------------------------------------------------------ model --
@app.post("/api/model/train")
def train(req: TrainRequest):
    try:
        session = mm.require_session(req.session_id)
        metrics = mm.train_model(session, req.algorithm, req.test_size, req.random_state)
    except Exception as e:
        err(e)
    return {"session_id": session.session_id, "algorithm": req.algorithm, "metrics": metrics}


@app.get("/api/model/info")
def model_info(session_id: str):
    try:
        session = mm.require_trained(session_id)
    except Exception as e:
        err(e)
    return {
        "algorithm": session.algorithm,
        "metrics": session.metrics,
        "feature_columns": session.feature_columns,
        "target_column": session.target_column,
    }


# ---------------------------------------------------------------- modules --
@app.post("/api/attack/run")
def run_attack(req: AttackRequest):
    try:
        session = mm.require_trained(req.session_id)
        result = attacks.run_attack(session, req.epsilon, req.n_samples, req.max_iterations, req.strategy)
    except Exception as e:
        err(e)
    return result


@app.post("/api/robustness/verify")
def run_robustness(req: RobustnessRequest):
    try:
        session = mm.require_trained(req.session_id)
        result = robustness.verify_robustness(session, req.epsilons, req.n_samples)
    except Exception as e:
        err(e)
    return result


@app.post("/api/sensitivity/analyze")
def run_sensitivity(req: SensitivityRequest):
    try:
        session = mm.require_trained(req.session_id)
        result = sensitivity.analyze_sensitivity(session, req.n_samples, req.perturbation_pct)
    except Exception as e:
        err(e)
    return result


@app.post("/api/hardening/run")
def run_hardening_endpoint(req: HardeningRequest):
    try:
        session = mm.require_trained(req.session_id)
        result = hardening.run_hardening(session, req.epsilon, req.n_adv_samples)
    except Exception as e:
        err(e)
    return result


@app.post("/api/explain/shap")
def run_explain(req: ExplainRequest):
    try:
        session = mm.require_trained(req.session_id)
        result = explainability.explain(session, req.n_samples, req.local_index)
    except Exception as e:
        err(e)
    return result


@app.post("/api/fairness/analyze")
def run_fairness(req: FairnessRequest):
    try:
        session = mm.require_trained(req.session_id)
        result = fairness.analyze_fairness(session, req.sensitive_column, req.privileged_value, req.favorable_label)
    except Exception as e:
        err(e)
    return result


# ----------------------------------------------------------------- report --
@app.get("/api/report", response_class=PlainTextResponse)
def get_report(session_id: str):
    try:
        session = mm.require_trained(session_id)
    except Exception as e:
        err(e)

    lines = []
    lines.append("=" * 70)
    lines.append("TreeShield AI -- Model Security & Reliability Report")
    lines.append(f"Generated: {datetime.utcnow().isoformat()}Z")
    lines.append("=" * 70)
    lines.append("")
    lines.append(f"Algorithm: {session.algorithm}")
    lines.append(f"Features: {len(session.feature_columns)} | Target: {session.target_column}")
    lines.append(f"Base metrics: {json.dumps(session.metrics, indent=2)}")
    lines.append("")
    lines.append("-" * 70)
    lines.append("Module run history (most recent first)")
    lines.append("-" * 70)
    for entry in reversed(session.history):
        lines.append(f"\n[{entry['module'].upper()}]")
        lines.append(json.dumps(entry["summary"], indent=2))
    lines.append("")
    lines.append("=" * 70)
    lines.append("End of report.")
    return "\n".join(lines)
