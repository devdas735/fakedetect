# FakeDetect - Image & Video Analyzer

## Current State
New project, no existing code.

## Requested Changes (Diff)

### Add
- Upload interface for images and videos
- Multi-metric analysis simulation (metadata, compression artifacts, pixel inconsistency, noise patterns, facial detection, deepfake indicators)
- Animated scanning/analysis progress UI
- Verdict display: FAKE or REAL with confidence score and detailed breakdown
- Analysis history list showing past uploads and results
- Support for image formats: JPG, PNG, GIF, WebP and video formats: MP4, MOV, AVI, WebM

### Modify
N/A

### Remove
N/A

## Implementation Plan
- Backend: store analysis records (filename, type, verdict, confidence, metrics, timestamp)
- Frontend: drag-and-drop upload zone, animated analysis progress with per-metric results, verdict card with visual indicators, history list
- Analysis simulation: deterministic-ish scoring based on file properties (name, size, type) to produce consistent results per file
