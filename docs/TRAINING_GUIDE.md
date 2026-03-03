# Training a Custom F1 Pit Stop Detection Model

This guide walks through training a custom YOLOv8 model for F1 pit stop analysis using the built-in pipeline.

## Overview

The default COCO-pretrained model detects generic classes (person, car, truck). A custom model trained on F1 pit stop footage can detect domain-specific objects with much higher accuracy:

| Class | Description |
|-------|------------|
| `pit_crew` | Individual crew members working on the car |
| `tire` | Tires being carried, mounted, or removed |
| `jack` | Front and rear jacks lifting the car |
| `f1_car` | The F1 car itself in the pit box |
| `pit_box` | The pit box / garage area |
| `wheel_gun` | Pneumatic wheel guns used to remove/attach wheels |
| `helmet` | Crew member helmets (useful for counting personnel) |

## Step 1: Collect Source Videos

Find 3-5 F1 pit stop videos showing different teams, angles, and lighting conditions. Good sources:
- Official F1 YouTube channel pit stop compilations
- Onboard pit stop cameras
- Broadcast footage showing the full pit lane

Upload each video through the Upload page or use the YouTube URL feature.

## Step 2: Extract Frames

1. Go to **Frames** page
2. Select a completed video
3. Choose extraction settings:
   - **Number of frames**: 100-200 per video (aim for 400+ total across all videos)
   - **Strategy**: `uniform` spreads frames evenly across the video
4. Click **Extract**
5. Repeat for each uploaded video

## Step 3: Annotate Frames

1. Go to the **Frames** page and click on an unlabeled frame
2. Use the annotation tool to draw bounding boxes:
   - Draw a tight box around each object
   - Select the correct class from the dropdown
   - Include all visible instances (every crew member, every tire, etc.)
3. Save annotations for each frame

### Annotation Tips
- **Be consistent**: Always label objects the same way across frames
- **Tight boxes**: Draw boxes as tight as possible around each object
- **Label everything visible**: If a tire is partially visible, still label it
- **Minimum 200 labeled frames**: More is better; aim for 300-500 for best results
- **Balance classes**: Try to have roughly equal representation of each class
- **Varied conditions**: Include frames with different zoom levels, angles, and lighting

## Step 4: Create a Dataset

1. Go to **Datasets** page
2. Click **Create Dataset**
3. Name it (e.g., `f1-pitstop-v1`)
4. Select all 7 F1 classes
5. Add your labeled frames to the dataset
6. Click **Split** to create train/val splits (default 80/20 is good)

## Step 5: Train the Model

1. Go to **Training** page
2. Configure training:
   - **Dataset**: Select your dataset
   - **Model name**: e.g., `f1-pitstop-v1`
   - **Base model**: `yolov8s.pt` (recommended balance of speed and accuracy)
   - **Epochs**: 100 (default; increase to 150-200 for larger datasets)
   - **Batch size**: 16 (reduce to 8 if you run out of memory)
   - **Image size**: 640
   - **Patience**: 20 (early stopping if no improvement)
3. Click **Start Training**
4. Monitor progress on the training page

### Expected Training Time
- **CPU only**: 2-8 hours depending on dataset size
- **GPU (CUDA)**: 15-60 minutes

### What to Look For
- **mAP50** should steadily increase and ideally reach 0.5+ for a useful model
- **Loss** values should decrease over epochs
- Training stops early if mAP50 doesn't improve for `patience` epochs

## Step 6: Compare Models

1. Go to **Compare** page
2. Select a video that has been analyzed
3. Set **Model A** to `default` (COCO baseline)
4. Set **Model B** to your custom model name
5. If the custom model hasn't been run on this video yet, click **Run**
6. Use the frame slider to browse detections side-by-side
7. Review the comparison table for per-class detection counts

## Iterating on Your Model

If results aren't satisfactory:
- Add more training data (more labeled frames)
- Review annotations for consistency errors
- Try a larger base model (`yolov8m.pt`) for better accuracy at the cost of speed
- Increase epochs to 200
- Create a new dataset version with corrected annotations and retrain
