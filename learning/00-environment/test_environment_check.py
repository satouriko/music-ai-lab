import json
import subprocess
import sys
from pathlib import Path

import pytest

SCRIPT = Path(__file__).with_name("environment_check.py")
EXPECTED_CALCULATION = [[5.0, 11.0], [11.0, 25.0]]


def run_environment_check(seed: int = 20260822) -> dict[str, object]:
    result = subprocess.run(
        [sys.executable, str(SCRIPT), "--seed", str(seed)],
        capture_output=True,
        check=False,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)


def test_cli_reports_python_pytorch_and_cpu_calculation() -> None:
    report = run_environment_check()

    assert report["seed"] == 20260822
    assert report["environment"]["python"].startswith("3.11.")
    assert report["environment"]["pytorch"]
    assert report["devices"]["cpu"]["calculation"] == EXPECTED_CALCULATION


def test_cli_repeats_random_values_for_the_same_seed() -> None:
    first = run_environment_check(seed=57)
    second = run_environment_check(seed=57)

    assert first["random_samples"] == second["random_samples"]


def test_cli_runs_the_same_calculation_on_cuda_when_available() -> None:
    report = run_environment_check()

    if not report["cuda"]["available"]:
        pytest.skip("CUDA is not available on this machine")

    assert report["cuda"]["runtime"]
    assert report["gpu"]["name"]
    assert report["gpu"]["total_memory_bytes"] > 0
    assert report["devices"]["cuda"]["calculation"] == EXPECTED_CALCULATION
