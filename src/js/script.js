import config from "./config.js";
import AudioRecorder from "./audio/audio-recorder.js";
import { VideoStreamer } from "./video/video-streamer.js";

class GeminiWebClient {
  constructor() {
    this.videoElement = document.getElementById("videoElement");
    this.connectBtn = document.getElementById("connectBtn");
    this.micBtn = document.getElementById("micBtn");
    this.cameraBtn = document.getElementById("cameraBtn");
    this.screenShareBtn = document.getElementById("screenShareBtn");
    this.connectionStatus = document.getElementById("connectionStatus");
    this.streamStatus = null;

    this.apiKey = config.GEMINI_API_KEY;
    if (!this.apiKey) {
      console.error("GEMINI_API_KEY not found in config.js");
    }
    this.wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;
    this.ws = null;

    this.isConnected = false;
    this.isStreaming = false;

    this.audioRecorder = new AudioRecorder();
    this.videoStream = null;
    this.screenStream = null;

    // Add audio queue management
    this.audioQueue = [];
    this.isPlayingAudio = false;

    // Add audio context and gain node for better control
    this.audioContext = null;
    this.gainNode = null;
    this.currentSource = null;

    this.videoStreamer = new VideoStreamer({
      targetFPS: 20,
      quality: 0.5,
      onFrame: (buffer) => {
        if (this.isConnected) {
          const base64Data = this.arrayBufferToBase64(buffer);
          this.sendMessage({
            realtimeInput: {
              mediaChunks: [
                {
                  mimeType: "image/jpeg",
                  data: base64Data,
                },
              ],
            },
          });
        }
      },
    });

    this.initializeEventListeners();
    this.updateConnectButton();
  }

  initializeEventListeners() {
    this.connectBtn.addEventListener("click", () => this.toggleConnection());
    this.micBtn.addEventListener("click", () => this.toggleMicrophone());
    this.cameraBtn.addEventListener("click", () => this.toggleCamera());
    this.screenShareBtn.addEventListener("click", () =>
      this.toggleScreenShare()
    );
  }

  async setupWebSocket() {
    try {
      console.log("Setting up WebSocket with URL:", this.wsUrl);
      if (!this.apiKey) {
        throw new Error("No API key configured");
      }

      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log("WebSocket connection established");
        this.isConnected = true;
        this.updateStatus();

        // Send initial setup message
        const setupMessage = {
          setup: {
            model: "models/gemini-2.0-flash-exp",
            generationConfig: {
              responseModalities: "audio",
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: "Aoede",
                  },
                },
              },
            },
          },
        };
        console.log("Sending setup message:", setupMessage);
        this.sendMessage(setupMessage);
      };

      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.handleConnectionError();
      };

      this.ws.onclose = (event) => {
        console.log(
          "WebSocket connection closed with code:",
          event.code,
          "reason:",
          event.reason
        );
        this.handleDisconnection();
      };
    } catch (error) {
      console.error("Failed to establish WebSocket connection:", error);
      this.handleConnectionError();
    }
  }

  handleWebSocketMessage(event) {
    if (event.data instanceof Blob) {
      // Handle binary data (audio/video)
      this.handleBinaryMessage(event.data);
    } else {
      // Handle JSON messages
      try {
        const message = JSON.parse(event.data);
        this.handleJsonMessage(message);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    }
  }

  async handleBinaryMessage(blob) {
    try {
      const message = await blob.text();
      try {
        const jsonMessage = JSON.parse(message);
        if (jsonMessage.serverContent?.modelTurn?.parts) {
          // Handle like a regular JSON message
          this.handleJsonMessage(jsonMessage);
          return;
        }
      } catch (e) {
        // Not JSON, continue with binary handling
        console.log("Received non-JSON binary message:", message);
      }
    } catch (error) {
      console.error("Error handling binary message:", error);
    }
  }

  handleJsonMessage(message) {
    if (message.setupComplete) {
      console.log("Setup completed successfully");
      this.isStreaming = true;
      this.updateStatus();
    } else if (message.serverContent) {
      const { serverContent } = message;
      if (serverContent.modelTurn && serverContent.modelTurn.parts) {
        console.log(
          "Received model turn parts:",
          serverContent.modelTurn.parts
        );
        // Only process the first audio part to avoid duplicates
        const audioPart = serverContent.modelTurn.parts.find((part) =>
          part.inlineData?.mimeType.startsWith("audio/")
        );
        if (audioPart?.inlineData) {
          console.log("Processing audio part:", audioPart.inlineData.mimeType);
          const audioData = this.base64ToArrayBuffer(audioPart.inlineData.data);
          this.playAudioBuffer(audioData);
        }
      }
      console.log("Received server content:", message.serverContent);
    } else if (message.toolCall) {
      console.log("Received tool call:", message.toolCall);
    }
  }

  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error("WebSocket is not connected");
    }
  }

  handleConnectionError() {
    this.isConnected = false;
    this.isStreaming = false;
    this.updateStatus();
    this.setControlsEnabled(false);
  }

  handleDisconnection() {
    this.isConnected = false;
    this.isStreaming = false;
    this.ws = null;
    this.updateStatus();
    this.setControlsEnabled(false);

    this.stopAudioRecording();
    this.stopVideoStream(false);
    this.stopVideoStream(true);
    this.stopCurrentAudio();
  }

  setControlsEnabled(enabled) {
    this.micBtn.disabled = !enabled;
    this.cameraBtn.disabled = !enabled;
    this.screenShareBtn.disabled = !enabled;
  }

  async toggleConnection() {
    if (!this.isConnected) {
      await this.setupWebSocket();
    } else {
      if (this.ws) {
        this.ws.close();
      }
      this.handleDisconnection();
    }
  }

  toggleMicrophone() {
    if (this.audioRecorder.isRecording) {
      this.stopAudioRecording();
    } else {
      this.startAudioRecording();
    }
  }

  toggleCamera() {
    if (this.videoStream) {
      this.stopVideoStream(false);
    } else {
      this.startVideoStream(false);
    }
  }

  toggleScreenShare() {
    if (this.screenStream) {
      this.stopVideoStream(true);
    } else {
      this.startVideoStream(true);
    }
  }

  updateStatus() {
    this.connectionStatus.textContent = this.isConnected
      ? "Connected"
      : "Disconnected";
    this.connectionStatus.className = this.isConnected
      ? "status connected"
      : "status disconnected";

    this.updateConnectButton();
  }

  async startAudioRecording() {
    try {
      this.audioRecorder.onDataAvailable = (buffer) => {
        if (this.isConnected) {
          const base64Data = this.arrayBufferToBase64(buffer);
          this.sendMessage({
            realtimeInput: {
              mediaChunks: [
                {
                  mimeType: "audio/pcm;rate=16000",
                  data: base64Data,
                },
              ],
            },
          });
        }
      };

      this.audioRecorder.onVolumeChange = (volume) => {
        this.updateAudioVisualizer(volume);
      };

      await this.audioRecorder.start();
      this.micBtn.classList.add("active");
    } catch (error) {
      console.error("Failed to start audio recording:", error);
    }
  }

  stopAudioRecording() {
    this.audioRecorder.stop();
    this.micBtn.classList.remove("active");
  }

  async startVideoStream(isScreenShare = false) {
    try {
      const stream = isScreenShare
        ? await navigator.mediaDevices.getDisplayMedia({ video: true })
        : await navigator.mediaDevices.getUserMedia({ video: true });

      if (isScreenShare) {
        this.screenStream = stream;
        this.screenShareBtn.classList.add("active");
      } else {
        this.videoStream = stream;
        this.cameraBtn.classList.add("active");
      }

      this.videoElement.srcObject = stream;
      this.videoStreamer.start(this.videoElement);
    } catch (error) {
      console.error(
        `Failed to start ${isScreenShare ? "screen" : "video"} stream:`,
        error
      );
    }
  }

  stopVideoStream(isScreenShare = false) {
    const stream = isScreenShare ? this.screenStream : this.videoStream;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      this.videoStreamer.stop();

      if (isScreenShare) {
        this.screenStream = null;
        this.screenShareBtn.classList.remove("active");
      } else {
        this.videoStream = null;
        this.cameraBtn.classList.remove("active");
      }

      if (!this.videoStream && !this.screenStream) {
        this.videoElement.srcObject = null;
      }
    }
  }

  updateAudioVisualizer(volume) {
    const visualizer = document.getElementById("audioVisualizer");
    const height = Math.min(100, volume * 500);
    visualizer.style.setProperty("--volume-height", `${height}%`);
  }

  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async playAudioBuffer(arrayBuffer) {
    // Add to queue
    this.audioQueue.push(arrayBuffer);

    // If not already playing, start playing
    if (!this.isPlayingAudio) {
      await this.playNextInQueue();
    }
  }

  stopCurrentAudio() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch (e) {
        console.log("Audio source already stopped");
      }
      this.currentSource = null;
    }
    // Clear the queue
    this.audioQueue = [];
    this.isPlayingAudio = false;
  }

  async playNextInQueue() {
    if (this.audioQueue.length === 0) {
      this.isPlayingAudio = false;
      return;
    }

    this.isPlayingAudio = true;
    const arrayBuffer = this.audioQueue.shift();

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);
      }

      // Check if we need to convert PCM data
      const isPCM = arrayBuffer.byteLength % 2 === 0;
      let audioBuffer;

      if (isPCM) {
        // Optimize PCM conversion
        const pcmData = new Int16Array(arrayBuffer);
        audioBuffer = this.audioContext.createBuffer(1, pcmData.length, 24000);
        const channelData = audioBuffer.getChannelData(0);

        // Optimized conversion loop
        for (let i = 0; i < pcmData.length; i++) {
          channelData[i] = pcmData[i] / 32768.0;
        }
      } else {
        audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      }

      // Wait for any current playback to finish
      if (this.currentSource) {
        await new Promise((resolve) => {
          const oldSource = this.currentSource;
          oldSource.onended = resolve;
        });
      }

      // Create and configure source
      this.currentSource = this.audioContext.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(this.gainNode);

      // When this chunk ends, play the next one
      this.currentSource.onended = () => {
        this.currentSource = null;
        // Use setTimeout to prevent potential stack overflow
        setTimeout(() => this.playNextInQueue(), 0);
      };

      // Play the audio
      this.currentSource.start(0);
    } catch (error) {
      console.error("Error playing audio:", error);
      this.currentSource = null;
      // If there's an error, try to continue with the next chunk
      setTimeout(() => this.playNextInQueue(), 0);
    }
  }

  base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  updateConnectButton() {
    this.connectBtn.textContent = this.isConnected ? "Disconnect" : "Connect";
    this.connectBtn.classList.toggle("connect", !this.isConnected);
    this.connectBtn.classList.toggle("disconnect", this.isConnected);
  }
}

// Initialize the application when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  window.geminiClient = new GeminiWebClient();
});
