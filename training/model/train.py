import torch
import torch.nn as nn
import torch.optim as optim

from tqdm import tqdm

from torchvision import datasets
from torchvision import transforms
from torch.utils.data import DataLoader
from pathlib import Path

from torch.amp import autocast, GradScaler

from model import ChessCNN


ROOT_DIR = Path(__file__).resolve().parents[2]

TRAIN_DIR = ROOT_DIR / "training" / "datasets" / "train"
TEST_DIR = ROOT_DIR / "training" / "datasets" / "test"


OUTPUT_DIR = ROOT_DIR / "model" / "torch_outputs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


BATCH_SIZE = 512
EPOCHS = 15
LR = 1e-3


def next_version(prefix: str, extension: str) -> str:
    version = 1

    while Path(f"{prefix}_{version}.{extension}").exists():
        version += 1

    return f"{prefix}_{version}.{extension}"


def evaluate(model, loader, device):
    model.eval()

    correct = 0
    total = 0

    with torch.no_grad():
        for images, labels in loader:
            images = images.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)

            outputs = model(images)

            predictions = outputs.argmax(dim=1)

            correct += (predictions == labels).sum().item()
            total += labels.size(0)

    return correct / total


def main():
    torch.backends.cudnn.benchmark = True

    device = torch.device(
        "cuda"
        if torch.cuda.is_available()
        else "cpu"
    )

    print("Device:", device)

    if device.type == "cuda":
        print("GPU:", torch.cuda.get_device_name(0))

    transform = transforms.Compose([
        transforms.ToTensor(),
    ])

    train_dataset = datasets.ImageFolder(
        TRAIN_DIR,
        transform=transform,
    )

    test_dataset = datasets.ImageFolder(
        TEST_DIR,
        transform=transform,
    )

    print("Classes:")
    print(train_dataset.class_to_idx)

    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=8,
        pin_memory=True,
        persistent_workers=True,
        prefetch_factor=4,
    )

    test_loader = DataLoader(
        test_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=8,
        pin_memory=True,
        persistent_workers=True,
        prefetch_factor=4,
    )

    print("Train samples:", len(train_dataset))
    print("Test samples:", len(test_dataset))

    model = ChessCNN().to(device)

    criterion = nn.CrossEntropyLoss()

    optimizer = optim.AdamW(
        model.parameters(),
        lr=LR,
    )

    scaler = GradScaler("cuda")

    best_accuracy = 0

    for epoch in range(EPOCHS):
        model.train()

        running_loss = 0

        correct = 0
        total = 0

        progress = tqdm(
            train_loader,
            desc=f"Epoch {epoch + 1}/{EPOCHS}",
            unit="batch",
        )

        for images, labels in progress:
            images = images.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)

            optimizer.zero_grad(set_to_none=True)

            with autocast("cuda"):
                outputs = model(images)
                loss = criterion(outputs, labels)

            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()

            running_loss += loss.item()

            predictions = outputs.argmax(dim=1)

            correct += (predictions == labels).sum().item()
            total += labels.size(0)

            train_running_acc = (
                100.0 * correct / total
            )

            progress.set_postfix(
                loss=f"{loss.item():.4f}",
                acc=f"{train_running_acc:.2f}%"
            )

        train_acc = evaluate(
            model,
            train_loader,
            device,
        )

        test_acc = evaluate(
            model,
            test_loader,
            device,
        )

        print(
            f"\nEpoch {epoch + 1}: "
            f"Loss={running_loss / len(train_loader):.4f} "
            f"Train={train_acc:.4%} "
            f"Test={test_acc:.4%}"
        )

        if test_acc > best_accuracy:
            best_accuracy = test_acc

            model_path = next_version(str(OUTPUT_DIR / "best_model"), "pth")

            torch.save(
                model.state_dict(),
                model_path,
            )

            print(
                f"Saved {model_path} "
                f"({test_acc:.4%})"
            )

        print(
            f"Best Accuracy: "
            f"{best_accuracy:.4%}\n"
        )


if __name__ == "__main__":
    main()