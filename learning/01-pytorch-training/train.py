"""Train a small MLP on a reproducible two-dimensional XOR dataset."""

from __future__ import annotations

import argparse
from pathlib import Path

import torch
from torch import Tensor, nn
from torch.utils.data import DataLoader, TensorDataset, random_split

DEFAULT_SEED = 20260823


def generate_xor_data(
    samples_per_cluster: int,
    noise: float,
    seed: int,
) -> tuple[Tensor, Tensor]:
    """Generate four noisy clusters whose labels follow the XOR pattern."""
    centers = torch.tensor(
        [
            [-1.0, -1.0],
            [-1.0, 1.0],
            [1.0, -1.0],
            [1.0, 1.0],
        ]
    )
    labels = torch.tensor([0, 1, 1, 0], dtype=torch.long)
    generator = torch.Generator().manual_seed(seed)

    features = centers.repeat_interleave(samples_per_cluster, dim=0)
    features = features + noise * torch.randn(
        features.shape,
        generator=generator,
    )
    targets = labels.repeat_interleave(samples_per_cluster)
    return features, targets


class XorMLP(nn.Module):
    """A two-layer perceptron that can learn a nonlinear XOR boundary."""

    def __init__(self, hidden_size: int = 16) -> None:
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(2, hidden_size),
            nn.ReLU(),
            nn.Linear(hidden_size, 2),
        )

    def forward(self, features: Tensor) -> Tensor:
        """Return one logit per class for every input point."""
        return self.layers(features)


def train_one_epoch(
    model: nn.Module,
    data_loader: DataLoader,
    loss_function: nn.Module,
    optimizer: torch.optim.Optimizer,
    device: torch.device,
) -> dict[str, float]:
    """Update model parameters once for every batch and return aggregate metrics."""
    model.train()
    total_loss = 0.0
    total_correct = 0
    total_examples = 0

    for features, labels in data_loader:
        features = features.to(device)
        labels = labels.to(device)

        optimizer.zero_grad()
        logits = model(features)
        loss = loss_function(logits, labels)
        loss.backward()
        optimizer.step()

        batch_size = labels.shape[0]
        total_loss += loss.item() * batch_size
        total_correct += (logits.argmax(dim=1) == labels).sum().item()
        total_examples += batch_size

    return {
        "loss": total_loss / total_examples,
        "accuracy": total_correct / total_examples,
    }


def evaluate(
    model: nn.Module,
    data_loader: DataLoader,
    loss_function: nn.Module,
    device: torch.device,
) -> dict[str, float]:
    """Measure loss and accuracy without recording gradients or changing parameters."""
    model.eval()
    total_loss = 0.0
    total_correct = 0
    total_examples = 0

    with torch.no_grad():
        for features, labels in data_loader:
            features = features.to(device)
            labels = labels.to(device)
            logits = model(features)
            loss = loss_function(logits, labels)

            batch_size = labels.shape[0]
            total_loss += loss.item() * batch_size
            total_correct += (logits.argmax(dim=1) == labels).sum().item()
            total_examples += batch_size

    return {
        "loss": total_loss / total_examples,
        "accuracy": total_correct / total_examples,
    }


def save_checkpoint(
    path: Path,
    model: nn.Module,
    optimizer: torch.optim.Optimizer,
    epoch: int,
    loss: float,
) -> None:
    """Save everything required to continue this training run."""
    path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "loss": loss,
        },
        path,
    )


def load_checkpoint(
    path: Path,
    model: nn.Module,
    optimizer: torch.optim.Optimizer,
    device: torch.device,
) -> dict[str, int | float]:
    """Restore model and optimizer state and return progress metadata."""
    checkpoint = torch.load(path, map_location=device, weights_only=True)
    model.load_state_dict(checkpoint["model_state_dict"])
    optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
    return {
        "epoch": int(checkpoint["epoch"]),
        "loss": float(checkpoint["loss"]),
    }


def plot_decision_boundary(
    model: nn.Module,
    features: Tensor,
    labels: Tensor,
    device: torch.device,
    output_path: Path,
) -> None:
    """Plot the dataset together with the class predicted across a dense grid."""
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    x_min, x_max = features[:, 0].min().item() - 0.5, features[:, 0].max().item() + 0.5
    y_min, y_max = features[:, 1].min().item() - 0.5, features[:, 1].max().item() + 0.5
    grid_x, grid_y = torch.meshgrid(
        torch.linspace(x_min, x_max, 200),
        torch.linspace(y_min, y_max, 200),
        indexing="xy",
    )
    grid = torch.stack((grid_x.reshape(-1), grid_y.reshape(-1)), dim=1).to(device)

    model.eval()
    with torch.no_grad():
        predictions = model(grid).argmax(dim=1).cpu().reshape(grid_x.shape)

    figure, axes = plt.subplots(figsize=(6, 5))
    axes.contourf(grid_x, grid_y, predictions, levels=[-0.5, 0.5, 1.5], alpha=0.3)
    axes.scatter(
        features[:, 0],
        features[:, 1],
        c=labels,
        edgecolors="black",
        cmap="coolwarm",
    )
    axes.set(title="XOR decision boundary", xlabel="x₁", ylabel="x₂")
    figure.tight_layout()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    figure.savefig(output_path, dpi=160)
    plt.close(figure)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--samples-per-cluster", type=int, default=200)
    parser.add_argument("--noise", type=float, default=0.3)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--hidden-size", type=int, default=16)
    parser.add_argument("--learning-rate", type=float, default=0.03)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--device", choices=("auto", "cpu", "cuda"), default="auto")
    parser.add_argument("--resume", type=Path)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).with_name("runs"),
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    torch.manual_seed(args.seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(args.seed)

    if args.device == "auto":
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(args.device)
    if device.type == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA was requested, but it is not available")

    features, labels = generate_xor_data(
        samples_per_cluster=args.samples_per_cluster,
        noise=args.noise,
        seed=args.seed,
    )
    dataset = TensorDataset(features, labels)
    validation_size = max(1, round(len(dataset) * 0.2))
    training_size = len(dataset) - validation_size
    split_generator = torch.Generator().manual_seed(args.seed)
    training_data, validation_data = random_split(
        dataset,
        [training_size, validation_size],
        generator=split_generator,
    )
    shuffle_generator = torch.Generator().manual_seed(args.seed)
    training_loader = DataLoader(
        training_data,
        batch_size=args.batch_size,
        shuffle=True,
        generator=shuffle_generator,
    )
    validation_loader = DataLoader(
        validation_data,
        batch_size=args.batch_size,
    )

    model = XorMLP(hidden_size=args.hidden_size).to(device)
    loss_function = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=args.learning_rate)
    checkpoint_path = args.output_dir / "checkpoint.pt"
    start_epoch = 0
    if args.resume is not None:
        metadata = load_checkpoint(args.resume, model, optimizer, device)
        start_epoch = int(metadata["epoch"])
        print(f"resumed_from_epoch={start_epoch} checkpoint_loss={metadata['loss']:.4f}")

    print(f"device={device} samples={len(dataset)} seed={args.seed}")
    for epoch_index in range(start_epoch, args.epochs):
        training_metrics = train_one_epoch(
            model,
            training_loader,
            loss_function,
            optimizer,
            device,
        )
        validation_metrics = evaluate(
            model,
            validation_loader,
            loss_function,
            device,
        )
        completed_epoch = epoch_index + 1
        print(
            f"epoch={completed_epoch} "
            f"train_loss={training_metrics['loss']:.4f} "
            f"train_accuracy={training_metrics['accuracy']:.3f} "
            f"validation_loss={validation_metrics['loss']:.4f} "
            f"validation_accuracy={validation_metrics['accuracy']:.3f}"
        )
        save_checkpoint(
            checkpoint_path,
            model,
            optimizer,
            epoch=completed_epoch,
            loss=validation_metrics["loss"],
        )

    plot_decision_boundary(
        model,
        features,
        labels,
        device,
        args.output_dir / "decision-boundary.png",
    )
    print(f"checkpoint={checkpoint_path}")
    print(f"plot={args.output_dir / 'decision-boundary.png'}")


if __name__ == "__main__":
    main()
