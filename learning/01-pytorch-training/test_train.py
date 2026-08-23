import importlib.util
import subprocess
import sys
from pathlib import Path
from types import ModuleType

import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

SCRIPT = Path(__file__).with_name("train.py")


def load_training_module() -> ModuleType:
    assert SCRIPT.exists(), f"Missing training module: {SCRIPT}"
    spec = importlib.util.spec_from_file_location("mlp_training", SCRIPT)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_xor_data_is_reproducible_for_the_same_seed() -> None:
    training = load_training_module()

    first_features, first_labels = training.generate_xor_data(
        samples_per_cluster=4,
        noise=0.2,
        seed=57,
    )
    second_features, second_labels = training.generate_xor_data(
        samples_per_cluster=4,
        noise=0.2,
        seed=57,
    )

    assert torch.equal(first_features, second_features)
    assert torch.equal(first_labels, second_labels)
    assert first_features.shape == (16, 2)
    assert first_labels.shape == (16,)


def test_mlp_forward_preserves_batch_and_returns_two_logits() -> None:
    training = load_training_module()
    model = training.XorMLP(hidden_size=8)

    logits = model(torch.randn(5, 2))

    assert logits.shape == (5, 2)
    assert logits.dtype == torch.float32
    assert torch.isfinite(logits).all()


def test_training_loop_can_overfit_one_small_batch() -> None:
    training = load_training_module()
    torch.manual_seed(7)
    features, labels = training.generate_xor_data(
        samples_per_cluster=4,
        noise=0.05,
        seed=7,
    )
    loader = DataLoader(TensorDataset(features, labels), batch_size=len(labels))
    model = training.XorMLP(hidden_size=16)
    loss_function = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.05)
    device = torch.device("cpu")

    initial = training.evaluate(model, loader, loss_function, device)
    for _ in range(100):
        training.train_one_epoch(model, loader, loss_function, optimizer, device)
    final = training.evaluate(model, loader, loss_function, device)

    assert final["loss"] < initial["loss"] * 0.1
    assert final["accuracy"] == 1.0


def test_checkpoint_restores_model_optimizer_epoch_and_next_update(tmp_path: Path) -> None:
    training = load_training_module()
    torch.manual_seed(11)
    features, labels = training.generate_xor_data(
        samples_per_cluster=2,
        noise=0.1,
        seed=11,
    )
    loader = DataLoader(TensorDataset(features, labels), batch_size=len(labels))
    loss_function = nn.CrossEntropyLoss()
    device = torch.device("cpu")

    original_model = training.XorMLP(hidden_size=8)
    original_optimizer = torch.optim.Adam(original_model.parameters(), lr=0.02)
    metrics = training.train_one_epoch(
        original_model,
        loader,
        loss_function,
        original_optimizer,
        device,
    )
    checkpoint_path = tmp_path / "nested" / "checkpoint.pt"
    training.save_checkpoint(
        checkpoint_path,
        original_model,
        original_optimizer,
        epoch=3,
        loss=metrics["loss"],
    )

    restored_model = training.XorMLP(hidden_size=8)
    restored_optimizer = torch.optim.Adam(restored_model.parameters(), lr=0.02)
    metadata = training.load_checkpoint(
        checkpoint_path,
        restored_model,
        restored_optimizer,
        device,
    )

    assert metadata["epoch"] == 3
    assert metadata["loss"] == metrics["loss"]
    assert restored_optimizer.state_dict()["state"]
    for original, restored in zip(
        original_model.parameters(),
        restored_model.parameters(),
        strict=True,
    ):
        assert torch.equal(original, restored)

    training.train_one_epoch(
        original_model,
        loader,
        loss_function,
        original_optimizer,
        device,
    )
    training.train_one_epoch(
        restored_model,
        loader,
        loss_function,
        restored_optimizer,
        device,
    )
    for original, restored in zip(
        original_model.parameters(),
        restored_model.parameters(),
        strict=True,
    ):
        assert torch.equal(original, restored)


def test_cli_trains_and_writes_checkpoint_and_decision_boundary(tmp_path: Path) -> None:
    output_directory = tmp_path / "run"

    result = subprocess.run(
        [
            sys.executable,
            str(SCRIPT),
            "--epochs",
            "2",
            "--samples-per-cluster",
            "4",
            "--batch-size",
            "8",
            "--hidden-size",
            "8",
            "--learning-rate",
            "0.05",
            "--device",
            "cpu",
            "--output-dir",
            str(output_directory),
        ],
        capture_output=True,
        check=False,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert "epoch=1" in result.stdout
    assert "epoch=2" in result.stdout
    assert (output_directory / "checkpoint.pt").stat().st_size > 0
    assert (output_directory / "decision-boundary.png").stat().st_size > 0


def test_cli_resumes_at_the_epoch_after_the_checkpoint(tmp_path: Path) -> None:
    output_directory = tmp_path / "run"
    common_arguments = [
        "--samples-per-cluster",
        "4",
        "--batch-size",
        "8",
        "--hidden-size",
        "8",
        "--learning-rate",
        "0.05",
        "--device",
        "cpu",
        "--output-dir",
        str(output_directory),
    ]
    first = subprocess.run(
        [sys.executable, str(SCRIPT), "--epochs", "1", *common_arguments],
        capture_output=True,
        check=False,
        text=True,
    )
    assert first.returncode == 0, first.stderr

    checkpoint_path = output_directory / "checkpoint.pt"
    resumed = subprocess.run(
        [
            sys.executable,
            str(SCRIPT),
            "--epochs",
            "3",
            "--resume",
            str(checkpoint_path),
            *common_arguments,
        ],
        capture_output=True,
        check=False,
        text=True,
    )

    assert resumed.returncode == 0, resumed.stderr
    assert "resumed_from_epoch=1" in resumed.stdout
    assert "epoch=2" in resumed.stdout
    assert "epoch=3" in resumed.stdout
