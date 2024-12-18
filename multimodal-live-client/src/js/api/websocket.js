// This file handles the websocket connection to the Multimodal Live API, managing the sending and receiving of messages.

const host = "generativelanguage.googleapis.com";
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const WEBSOCKET_URL = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?apiKey=${API_KEY}`;

class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.messageHandlers = [];
  }

  connect() {
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log("WebSocket connection established");
    };

    this.socket.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.socket.onclose = () => {
      console.log("WebSocket connection closed");
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  handleMessage(data) {
    this.messageHandlers.forEach((handler) => handler(data));
  }

  sendMessage(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error("WebSocket is not open. Unable to send message:", message);
    }
  }

  addMessageHandler(handler) {
    this.messageHandlers.push(handler);
  }

  close() {
    if (this.socket) {
      this.socket.close();
    }
  }
}

export function connectWebSocket() {
  const client = new WebSocketClient(WEBSOCKET_URL);
  client.connect();
  return client;
}

export default WebSocketClient;
