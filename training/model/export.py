import torch
import json
from pathlib import Path

from model import ChessCNN
from labels import CLASSES

from pathlib import Path

OUTPUT_DIR = Path("../../model")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def latest_model() -> str:
    models = list(
        Path(OUTPUT_DIR / "torch_outputs").glob("best_model_*.pth")
    )

    if not models:
        raise FileNotFoundError(
            "No best_model_*.pth files found"
        )

    return str(
        max(
            models,
            key=lambda p: int(
                p.stem.split("_")[-1]
            )
        )
    )

MODEL_PATH = latest_model()


def next_version(prefix: str, extension: str) -> str:
    version = 1

    while Path(f"{prefix}_{version}.{extension}").exists():
        version += 1

    return f"{prefix}_{version}.{extension}"


def main():
    model = ChessCNN()

    model.load_state_dict(
        torch.load(
            MODEL_PATH,
            map_location="cpu",
        )
    )

    model.eval()

    onnx_path = next_version(
    str(OUTPUT_DIR / "chess-piece"),
    "onnx"
)

    labels_path = next_version(
        str(OUTPUT_DIR / "labels"),
        "json"
    )

    dummy = torch.randn(
        1,
        3,
        32,
        32,
    )

    torch.onnx.export(
        model,
        dummy,
        onnx_path,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={
            "input": {0: "batch"},
            "output": {0: "batch"},
        },
        opset_version=17,
    )

    with open(labels_path, "w") as f:
        json.dump(
            CLASSES,
            f,
            indent=2,
        )

    print(f"Exported {onnx_path}")
    print(f"Exported {labels_path}")


if __name__ == "__main__":
    main()