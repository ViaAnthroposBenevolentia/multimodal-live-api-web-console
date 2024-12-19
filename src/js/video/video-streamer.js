export class VideoStreamer {
  constructor(options = {}) {
    this.worker = new Worker(
      new URL("../workers/video-processor.js", import.meta.url),
      {
        type: "classic",
      }
    );
    this.targetFPS = options.targetFPS || 30;
    this.quality = options.quality || 0.5;
    this.minInterval = 1000 / this.targetFPS;
    this.lastCaptureTime = 0;
    this.droppedFrames = 0;
    this.isStreaming = false;
    this.onFrame = options.onFrame || (() => {});
    this.maxWidth = options.maxWidth || 640; // Max width for resizing
    this.motionThreshold = options.motionThreshold || 0.05; // Motion detection threshold
    this.previousImageData = null;

    // Setup worker message handling
    this.worker.onmessage = (e) => {
      const { buffer, hasMotion } = e.data;
      if (hasMotion || !this.previousImageData) {
        this.onFrame(buffer);
      }
    };
  }

  async start(videoElement) {
    if (this.isStreaming) return;

    // Wait for video to be ready
    await new Promise((resolve) => {
      if (videoElement.readyState >= 2) {
        resolve();
      } else {
        videoElement.addEventListener("loadeddata", resolve, { once: true });
      }
    });

    this.isStreaming = true;
    this.videoElement = videoElement;
    this.adaptiveQualityController = new AdaptiveQualityController();

    const processFrame = async (timestamp) => {
      if (!this.isStreaming) return;

      const elapsed = timestamp - this.lastCaptureTime;
      if (elapsed >= this.minInterval) {
        try {
          // Check if video is playing and has valid dimensions
          if (
            this.videoElement.readyState >= 2 &&
            this.videoElement.videoWidth > 0 &&
            this.videoElement.videoHeight > 0
          ) {
            const frame = await createImageBitmap(this.videoElement);

            // Calculate optimal quality based on network conditions
            const quality = this.adaptiveQualityController.getOptimalQuality();

            // Send frame to worker
            this.worker.postMessage(
              {
                frame,
                width: this.videoElement.videoWidth,
                height: this.videoElement.videoHeight,
                maxWidth: this.maxWidth,
                quality,
                motionThreshold: this.motionThreshold,
                previousImageData: this.previousImageData,
              },
              [frame]
            );

            this.lastCaptureTime = timestamp;
          }
        } catch (error) {
          console.warn("Frame processing error:", error);
          this.droppedFrames++;
        }
      }

      this.animationFrame = requestAnimationFrame(processFrame);
    };

    this.animationFrame = requestAnimationFrame(processFrame);
  }

  stop() {
    this.isStreaming = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  setQuality(quality) {
    this.quality = quality;
  }

  setTargetFPS(fps) {
    this.targetFPS = fps;
    this.minInterval = 1000 / fps;
  }
}

// Helper class for adaptive quality control
class AdaptiveQualityController {
  constructor() {
    this.processingTimes = [];
    this.maxProcessingTime = 100; // ms
    this.minQuality = 0.3;
    this.maxQuality = 0.8;
    this.currentQuality = 0.5;
  }

  addProcessingTime(time) {
    this.processingTimes.push(time);
    if (this.processingTimes.length > 10) {
      this.processingTimes.shift();
    }
  }

  getOptimalQuality() {
    if (this.processingTimes.length < 5) return this.currentQuality;

    const avgProcessingTime =
      this.processingTimes.reduce((a, b) => a + b) /
      this.processingTimes.length;

    if (avgProcessingTime > this.maxProcessingTime) {
      this.currentQuality = Math.max(
        this.minQuality,
        this.currentQuality - 0.1
      );
    } else if (avgProcessingTime < this.maxProcessingTime / 2) {
      this.currentQuality = Math.min(
        this.maxQuality,
        this.currentQuality + 0.05
      );
    }

    return this.currentQuality;
  }
}
