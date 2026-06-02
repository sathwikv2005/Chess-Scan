from ultralytics import YOLO

model = YOLO("../../../runs/detect/model/yolo/board_detector-4/weights/best.pt")

model.export(
    format="onnx",
    simplify=True,
    opset=17
)