"""Report the local Python and PyTorch environment with reproducible calculations."""

from __future__ import annotations

import argparse
import json
import os
import platform
import random

import numpy as np
import torch

DEFAULT_SEED = 20260822


def set_random_seed(seed: int) -> None:
    """Seed Python, NumPy, and every available PyTorch device."""
    os.environ.setdefault("CUBLAS_WORKSPACE_CONFIG", ":4096:8")
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

    torch.use_deterministic_algorithms(True)
    torch.backends.cudnn.benchmark = False


def calculate_on(device: torch.device) -> dict[str, object]:
    """Run a small matrix multiplication on the requested device."""
    matrix = torch.tensor([[1.0, 2.0], [3.0, 4.0]], device=device)
    result = matrix @ matrix.transpose(0, 1)
    if device.type == "cuda":
        torch.cuda.synchronize(device)

    return {
        "device": str(device),
        "calculation": result.cpu().tolist(),
    }


def collect_random_samples(cuda_available: bool) -> dict[str, object]:
    """Collect random values after all generators have been seeded."""
    samples: dict[str, object] = {
        "python": random.random(),
        "numpy": np.random.random(3).tolist(),
        "torch_cpu": torch.rand(3).tolist(),
    }
    if cuda_available:
        samples["torch_cuda"] = torch.rand(3, device="cuda:0").cpu().tolist()

    return samples


def build_report(seed: int) -> dict[str, object]:
    """Build a JSON-serializable environment and reproducibility report."""
    set_random_seed(seed)
    cuda_available = torch.cuda.is_available()

    cuda: dict[str, object] = {
        "available": cuda_available,
        "runtime": torch.version.cuda,
        "cudnn": torch.backends.cudnn.version(),
        "device_count": torch.cuda.device_count(),
    }
    gpu: dict[str, object] | None = None
    devices = {"cpu": calculate_on(torch.device("cpu"))}

    if cuda_available:
        device = torch.device("cuda:0")
        properties = torch.cuda.get_device_properties(device)
        gpu = {
            "name": properties.name,
            "total_memory_bytes": properties.total_memory,
            "compute_capability": f"{properties.major}.{properties.minor}",
        }
        devices["cuda"] = calculate_on(device)

    return {
        "seed": seed,
        "environment": {
            "python": platform.python_version(),
            "pytorch": torch.__version__,
            "numpy": np.__version__,
        },
        "cuda": cuda,
        "gpu": gpu,
        "devices": devices,
        "random_samples": collect_random_samples(cuda_available),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    print(json.dumps(build_report(args.seed), ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
