# Multimodal Live Client

This project is a minimal web client that interfaces with the Gemini 2.0 Flash Multimodal Live API. It is built using vanilla JavaScript, HTML, and CSS, and is designed to handle audio and video streaming in real-time.

## Project Structure

```
multimodal-live-client
├── src
│   ├── css
│   │   └── styles.css          # Styles for the web client
│   ├── js
│   │   ├── api
│   │   │   ├── websocket.js     # Websocket connection management
│   │   │   └── types.js         # API communication types
│   │   ├── audio
│   │   │   ├── recorder.js      # Audio recording functionality
│   │   │   ├── streamer.js      # Audio streaming management
│   │   │   └── worklets
│   │   │       ├── processor.js  # Audio processing worklet
│   │   │       └── volume-meter.js # Volume meter worklet
│   │   ├── video
│   │   │   ├── camera.js        # Webcam video management
│   │   │   └── screen.js        # Screen capture functionality
│   │   ├── ui
│   │   │   ├── controls.js      # UI controls for streaming
│   │   │   └── logger.js        # Logging mechanism for UI
│   │   └── app.js               # Main entry point for the application
│   └── index.html               # Main HTML document
├── package.json                  # Project dependencies and scripts
└── README.md                     # Project documentation
```

## Getting Started

To get started with the Multimodal Live Client, follow these steps:

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd multimodal-live-client
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the application**:
   Open `src/index.html` in your web browser to view the client.

## Features

- Real-time audio and video streaming using the Multimodal Live API.
- User-friendly UI for controlling streams and viewing logs.
- Audio recording and processing capabilities.
- Screen sharing functionality.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.