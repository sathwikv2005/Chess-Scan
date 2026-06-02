from ultralytics import YOLO

def main():
    model = YOLO("yolov8n.pt")

    model.train(
    data="dataset.yaml",
    epochs=20,
    imgsz=512,
    batch=8,
    workers=4,
    project="model/yolo",
    name="board_detector"
)

if __name__ == "__main__":
    main()