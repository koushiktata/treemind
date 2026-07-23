from pydantic import BaseModel
from typing import Optional, List


class TrainRequest(BaseModel):
    session_id: str
    algorithm: str = "random_forest"  # random_forest | xgboost | lightgbm | catboost
    target_column: str
    test_size: float = 0.25
    random_state: int = 42


class AttackRequest(BaseModel):
    session_id: str
    epsilon: float = 0.1
    n_samples: int = 25
    max_iterations: int = 80
    strategy: str = "greedy"  # greedy | random


class RobustnessRequest(BaseModel):
    session_id: str
    epsilons: Optional[List[float]] = None
    n_samples: int = 25


class SensitivityRequest(BaseModel):
    session_id: str
    n_samples: int = 100
    perturbation_pct: float = 0.05


class HardeningRequest(BaseModel):
    session_id: str
    epsilon: float = 0.1
    n_adv_samples: int = 60


class ExplainRequest(BaseModel):
    session_id: str
    n_samples: int = 100
    local_index: Optional[int] = None


class FairnessRequest(BaseModel):
    session_id: str
    sensitive_column: str
    privileged_value: str
    favorable_label: int = 0
