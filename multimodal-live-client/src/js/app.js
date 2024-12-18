// This file is the main entry point for the JavaScript application, initializing the app and setting up event listeners.

import { connectWebSocket } from "./api/websocket.js";
import { startAudioRecording, stopAudioRecording } from "./audio/recorder.js";
import { startVideoStream, stopVideoStream } from "./video/camera.js";
import { updateUI } from "./ui/controls.js";

document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("start-button");
  const stopButton = document.getElementById("stop-button");

  startButton.addEventListener("click", () => {
    connectWebSocket();
    startAudioRecording();
    startVideoStream();
    updateUI("Streaming started");
  });

  stopButton.addEventListener("click", () => {
    stopAudioRecording();
    stopVideoStream();
    updateUI("Streaming stopped");
  });
});
