// This file implements the audio recording functionality, allowing the user to capture audio from the microphone.

class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.chunks = [];
    this.isRecording = false;
  }

  async init() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(stream);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const audioBlob = new Blob(this.chunks, { type: "audio/wav" });
      this.chunks = [];
      return audioBlob;
    };
  }

  startRecording() {
    if (this.mediaRecorder && !this.isRecording) {
      this.mediaRecorder.start();
      this.isRecording = true;
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
  }

  isRecordingActive() {
    return this.isRecording;
  }
}

let recorderInstance = null;

export function startAudioRecording() {
  if (!recorderInstance) {
    recorderInstance = new AudioRecorder();
    recorderInstance.init();
  }
  recorderInstance.startRecording();
}

export function stopAudioRecording() {
  if (recorderInstance) {
    recorderInstance.stopRecording();
  }
}

export default AudioRecorder;
