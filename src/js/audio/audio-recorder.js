class AudioRecorder {
  constructor(sampleRate = 16000) {
    this.sampleRate = sampleRate;
    this.stream = null;
    this.audioContext = null;
    this.mediaStreamSource = null;
    this.processor = null;
    this.isRecording = false;
    this.onDataAvailable = null;
    this.onVolumeChange = null;
  }

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(
        this.stream
      );

      // Create audio processor
      await this.audioContext.audioWorklet.addModule(
        "./js/audio/audio-processor.js"
      );
      this.processor = new AudioWorkletNode(
        this.audioContext,
        "audio-recorder-processor"
      );

      // Handle audio data
      this.processor.port.onmessage = (event) => {
        if (event.data.type === "audio") {
          if (this.onDataAvailable) {
            this.onDataAvailable(event.data.buffer);
          }
        } else if (event.data.type === "volume") {
          if (this.onVolumeChange) {
            this.onVolumeChange(event.data.volume);
          }
        }
      };

      this.mediaStreamSource.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.isRecording = true;
    } catch (error) {
      console.error("Error starting audio recording:", error);
      throw error;
    }
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isRecording = false;
  }
}

export default AudioRecorder;
