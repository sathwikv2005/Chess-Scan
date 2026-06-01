from pathlib import Path

import numpy as np
import torch

from tqdm import tqdm
from sklearn.metrics import confusion_matrix
from torchvision import datasets
from torchvision import transforms
from torch.utils.data import DataLoader

from model import ChessCNN

TEST_DIR = "training/datasets/test"


def latest_model() -> Path:
    models = list(
        Path("model/torch_outputs").glob(
            "best_model_*.pth"
        )
    )

    if not models:
        raise FileNotFoundError(
            "No models found in model/torch_outputs"
        )

    return max(
        models,
        key=lambda p: int(
            p.stem.split("_")[-1]
        )
    )


def main():
    device = torch.device(
        "cuda"
        if torch.cuda.is_available()
        else "cpu"
    )

    print(f"Device: {device}")

    if device.type == "cuda":
        print(
            f"GPU: {torch.cuda.get_device_name(0)}"
        )

    model_path = latest_model()

    print(f"Loading {model_path}")

    model = ChessCNN().to(device)

    model.load_state_dict(
        torch.load(
            model_path,
            map_location=device,
        )
    )

    model.eval()

    transform = transforms.Compose([
        transforms.ToTensor(),
    ])

    dataset = datasets.ImageFolder(
        TEST_DIR,
        transform=transform,
    )

    print("\nClass mapping:")
    print(dataset.class_to_idx)

    idx_to_class = {
        v: k
        for k, v in dataset.class_to_idx.items()
    }

    class_names = [
        idx_to_class[i]
        for i in range(len(idx_to_class))
    ]

    loader = DataLoader(
        dataset,
        batch_size=512,
        shuffle=False,
        num_workers=8,
        pin_memory=True,
        persistent_workers=True,
    )

    y_true = []
    y_pred = []

    correct = 0
    total = 0

    print(
        f"\nEvaluating {len(dataset):,} images..."
    )

    with torch.no_grad():
        progress = tqdm(
            loader,
            desc="Evaluating",
            unit="batch",
        )

        for images, labels in progress:
            images = images.to(
                device,
                non_blocking=True,
            )

            labels = labels.to(
                device,
                non_blocking=True,
            )

            outputs = model(images)

            predictions = outputs.argmax(dim=1)

            correct += (
                predictions == labels
            ).sum().item()

            total += labels.size(0)

            progress.set_postfix(
                acc=f"{100 * correct / total:.4f}%"
            )

            y_true.extend(
                labels.cpu().numpy()
            )

            y_pred.extend(
                predictions.cpu().numpy()
            )

    accuracy = (
        100.0
        * np.mean(
            np.array(y_true)
            == np.array(y_pred)
        )
    )

    print(
        f"\nFinal Accuracy: "
        f"{accuracy:.4f}%"
    )

    cm = confusion_matrix(
        y_true,
        y_pred,
        labels=np.arange(
            len(class_names)
        ),
    )

    print("\n=== Misclassifications ===")

    total_errors = 0

    for i, actual in enumerate(class_names):
        for j, predicted in enumerate(
            class_names
        ):
            if i == j:
                continue

            count = cm[i, j]

            if count > 0:
                total_errors += count

                print(
                    f"{actual:>5} -> "
                    f"{predicted:<5}: "
                    f"{count}"
                )

    print(
        f"\nTotal errors: "
        f"{total_errors}"
    )

    print("\n=== Confusion Matrix ===")

    header = (
        "      "
        + " ".join(
            f"{c:>5}"
            for c in class_names
        )
    )

    print(header)

    for i, row in enumerate(cm):
        print(
            f"{class_names[i]:>5} "
            + " ".join(
                f"{v:>5}"
                for v in row
            )
        )

    


if __name__ == "__main__":
    main()