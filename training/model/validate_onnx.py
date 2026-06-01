import random

import numpy as np
import onnx
import onnxruntime as ort
import torch

from PIL import Image
from torchvision import datasets, transforms

from model import ChessCNN

MODEL_PATH = "../../model/chess-piece_1.onnx"
CHECKPOINT_PATH = "../../model/torch_outputs/best_model_8.pth"
DATASET_PATH = "../../training/datasets/test"

NUM_SAMPLES = 100

model = onnx.load(MODEL_PATH)
onnx.checker.check_model(model)

print("Model valid")

ort_session = ort.InferenceSession(MODEL_PATH)

print("Input shape:", ort_session.get_inputs()[0].shape)
print("Output shape:", ort_session.get_outputs()[0].shape)

state_dict = torch.load(
    CHECKPOINT_PATH,
    map_location="cpu",
)

torch_model = ChessCNN()
torch_model.load_state_dict(state_dict)
torch_model.eval()

dataset = datasets.ImageFolder(DATASET_PATH)

labels = dataset.classes

samples = dataset.samples

if len(samples) < NUM_SAMPLES:
    NUM_SAMPLES = len(samples)

selected = random.sample(samples, NUM_SAMPLES)

transform = transforms.ToTensor()

torch_correct = 0
onnx_correct = 0
prediction_matches = 0

max_logit_diff = 0.0
max_prob_diff = 0.0

mismatches = []

for image_path, target_idx in selected:
    image = Image.open(image_path).convert("RGB")

    x = transform(image).unsqueeze(0)

    with torch.no_grad():
        torch_out = torch_model(x).numpy()

    onnx_out = ort_session.run(
        None,
        {
            ort_session.get_inputs()[0].name: x.numpy()
        },
    )[0]

    torch_pred = int(np.argmax(torch_out))
    onnx_pred = int(np.argmax(onnx_out))

    if torch_pred == target_idx:
        torch_correct += 1

    if onnx_pred == target_idx:
        onnx_correct += 1

    if torch_pred == onnx_pred:
        prediction_matches += 1
    else:
        mismatches.append(
            (
                image_path,
                labels[target_idx],
                labels[torch_pred],
                labels[onnx_pred],
            )
        )

    logit_diff = np.max(np.abs(torch_out - onnx_out))
    max_logit_diff = max(max_logit_diff, float(logit_diff))

    torch_probs = torch.softmax(
        torch.tensor(torch_out),
        dim=1,
    ).numpy()

    onnx_probs = np.exp(
        onnx_out - np.max(onnx_out, axis=1, keepdims=True)
    )

    onnx_probs /= np.sum(
        onnx_probs,
        axis=1,
        keepdims=True,
    )

    prob_diff = np.max(
        np.abs(torch_probs - onnx_probs)
    )

    max_prob_diff = max(
        max_prob_diff,
        float(prob_diff),
    )

print()

print(f"Samples tested        : {NUM_SAMPLES}")
print(f"PyTorch accuracy      : {torch_correct / NUM_SAMPLES:.4%}")
print(f"ONNX accuracy         : {onnx_correct / NUM_SAMPLES:.4%}")
print(f"Prediction agreement  : {prediction_matches / NUM_SAMPLES:.4%}")
print(f"Max logit difference  : {max_logit_diff:.10f}")
print(f"Max probability diff  : {max_prob_diff:.10f}")

if mismatches:
    print()
    print(f"Prediction mismatches: {len(mismatches)}")

    for image_path, expected, torch_pred, onnx_pred in mismatches[:10]:
        print()
        print("Image    :", image_path)
        print("Expected :", expected)
        print("PyTorch  :", torch_pred)
        print("ONNX     :", onnx_pred)
else:
    print()
    print("No prediction mismatches found.")