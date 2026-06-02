from ultralytics import YOLO

model = YOLO("../../../runs/detect/model/yolo/board_detector-4/weights/best.pt")

# results = model("../../datasets/example.png")
# results = model("../../datasets/example1.png")
# results = model("../../datasets/example2.png")
results = model("../../datasets/example3.png")

results[0].show()