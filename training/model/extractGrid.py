from PIL import Image
import os


from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent

INPUT = ROOT / "training" / "datasets" / "grid.png"
OUTPUT = ROOT / "training" / "datasets" / "grid"

os.makedirs(OUTPUT, exist_ok=True)

img = Image.open(INPUT).convert("RGBA")

width, height = img.size

if width != height:
    raise ValueError(f"Expected a square image, got {width}x{height}")

cell = width // 8

# Top row
for col in range(8):
    square = img.crop((
        col * cell,
        0,
        (col + 1) * cell,
        cell
    ))
    square = square.resize((32, 32), Image.Resampling.LANCZOS)
    square.save(os.path.join(OUTPUT, f"top_{col}.png"))

# Bottom row
for col in range(8):
    square = img.crop((
        col * cell,
        7 * cell,
        (col + 1) * cell,
        8 * cell
    ))
    square = square.resize((32, 32), Image.Resampling.LANCZOS)
    square.save(os.path.join(OUTPUT, f"bottom_{col}.png"))

# Left column
for row in range(8):
    square = img.crop((
        0,
        row * cell,
        cell,
        (row + 1) * cell
    ))
    square = square.resize((32, 32), Image.Resampling.LANCZOS)
    square.save(os.path.join(OUTPUT, f"left_{row}.png"))

# Right column
for row in range(8):
    square = img.crop((
        7 * cell,
        row * cell,
        8 * cell,
        (row + 1) * cell
    ))
    square = square.resize((32, 32), Image.Resampling.LANCZOS)
    square.save(os.path.join(OUTPUT, f"right_{row}.png"))

print("Done")