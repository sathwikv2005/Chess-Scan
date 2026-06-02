import numpy as np
import onnxruntime as ort

from PIL import Image
from torchvision import transforms

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent

image_path = ROOT / "debug" / "squares" / "5-7.png"


labels = [
    "Empty",
    "bB",
    "bK",
    "bN",
    "bP",
    "bQ",
    "bR",
    "wB",
    "wK",
    "wN",
    "wP",
    "wQ",
    "wR",
]

class ChessPiecePredictor:
    def __init__(self, model_path: str, labels: list[str]):
        self.labels = labels

        self.session = ort.InferenceSession(model_path)

        self.transform = transforms.ToTensor()

    def predict(self, image_path: str):
        image = Image.open(image_path).convert("RGB")

        x = self.transform(image).unsqueeze(0).numpy()

        outputs = self.session.run(
            None,
            {
                self.session.get_inputs()[0].name: x
            },
        )[0]

        logits = outputs[0]

        probs = np.exp(logits - np.max(logits))
        probs /= np.sum(probs)

        pred_idx = int(np.argmax(probs))

        return {
            "index": pred_idx,
            "label": self.labels[pred_idx],
            "confidence": float(probs[pred_idx]),
            "probabilities": probs.tolist(),
        }

    def predict_index(self, image_path: str) -> int:
        return self.predict(image_path)["index"]

    def predict_label(self, image_path: str) -> str:
        return self.predict(image_path)["label"]
    
    
predictor = ChessPiecePredictor(
    "../../model/chess-piece_1.onnx",
    labels,
)

result = predictor.predict(image_path)

print(result)