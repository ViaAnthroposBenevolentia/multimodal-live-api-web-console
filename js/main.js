import { MultimodalLiveClient } from './websocket-client.js';
import { AudioStreamer } from './audio-streamer.js';
import { AudioRecorder } from './audio-recorder.js';
import { API_KEY, MODEL_NAME } from './config.js';

const logsContainer = document.getElementById('logs-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const micButton = document.getElementById('mic-button');
const micIcon = document.getElementById('mic-icon');
const audioVisualizer = document.getElementById('audio-visualizer');
const connectButton = document.getElementById('connect-button');

let isRecording = false;
let audioStreamer = null;
let audioCtx = null;
let isConnected = false;
let audioRecorder = null;

const client = new MultimodalLiveClient({ apiKey: API_KEY });

function logMessage(message, type = 'system') {
    const logEntry = document.createElement('div');
    logEntry.classList.add('log-entry', type);

    const timestamp = document.createElement('span');
    timestamp.classList.add('timestamp');
    timestamp.textContent = new Date().toLocaleTimeString();
    logEntry.appendChild(timestamp);

    const emoji = document.createElement('span');
    emoji.classList.add('emoji');
    switch (type) {
        case 'system':
            emoji.textContent = '⚙️';
            break;
        case 'user':
            emoji.textContent = '🧑';
            break;
        case 'ai':
            emoji.textContent = '🤖';
            break;
    }
    logEntry.appendChild(emoji);

    const messageText = document.createElement('span');
    messageText.textContent = message;
    logEntry.appendChild(messageText);

    logsContainer.appendChild(logEntry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

function updateMicIcon() {
    micIcon.textContent = isRecording ? 'mic_off' : 'mic';
    micButton.style.backgroundColor = isRecording ? '#ea4335' : '#4285f4';
}

function updateAudioVisualizer(volume) {
    const audioBar = audioVisualizer.querySelector('.audio-bar') || document.createElement('div');
    if (!audioVisualizer.contains(audioBar)) {
        audioBar.classList.add('audio-bar');
        audioVisualizer.appendChild(audioBar);
    }
    audioBar.style.width = `${volume * 100}%`;
    if (volume > 0) {
        audioBar.classList.add('active');
    } else {
        audioBar.classList.remove('active');
    }
}

async function ensureAudioInitialized() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (!audioStreamer) {
        audioStreamer = new AudioStreamer(audioCtx);
        await audioStreamer.addWorklet('vumeter-out', 'js/worklets/vol-meter.js', (ev) => {
            updateAudioVisualizer(ev.data.volume);
        });
    }
    return audioStreamer;
}

async function handleMicToggle() {
    if (!isRecording) {
        try {
            await ensureAudioInitialized();
            audioRecorder = new AudioRecorder();
            await audioRecorder.start((base64Data) => {
                if (isRecording) {
                    client.sendRealtimeInput([{
                        mimeType: "audio/pcm;rate=16000",
                        data: base64Data
                    }]);
                }
            });
            await audioStreamer.resume();
            isRecording = true;
            logMessage('Microphone started', 'system');
            updateMicIcon();
        } catch (error) {
            console.error('Mic error:', error);
            logMessage(`Error starting microphone: ${error.message}`, 'system');
        }
    } else {
        audioStreamer?.stop();
        if (audioRecorder) {
            audioRecorder.stop();
            audioRecorder = null;
        }
        isRecording = false;
        logMessage('Microphone stopped', 'system');
        updateMicIcon();
    }
}

async function resumeAudioContext() {
    if (audioCtx && audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }
}

async function connectToWebsocket() {
    const config = {
        model: MODEL_NAME,
        generationConfig: {
            responseModalities: "audio",
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
            },
        },
        systemInstruction: {
            parts: [
                {
                    text: 'You are my helpful assistant.',
                },
            ],
        },
        tools: [
            { googleSearch: {} },
        ],
    };

    try {
        await client.connect(config);
        isConnected = true;
        await resumeAudioContext();
        connectButton.textContent = 'Disconnect';
        connectButton.classList.add('connected');
        messageInput.disabled = false;
        sendButton.disabled = false;
        micButton.disabled = false;
        logMessage('Connected to Gemini 2.0 Flash Multimodal Live API', 'system');
    } catch (error) {
        logMessage(`Connection error: ${error.message}`, 'system');
        isConnected = false;
        connectButton.textContent = 'Connect';
        connectButton.classList.remove('connected');
        messageInput.disabled = true;
        sendButton.disabled = true;
        micButton.disabled = true;
    }
}

function disconnectFromWebsocket() {
    client.disconnect();
    isConnected = false;
    if (audioStreamer) {
        audioStreamer.stop();
        if (audioRecorder) {
            audioRecorder.stop();
            audioRecorder = null;
        }
        isRecording = false;
        updateMicIcon();
    }
    connectButton.textContent = 'Connect';
    connectButton.classList.remove('connected');
    messageInput.disabled = true;
    sendButton.disabled = true;
    micButton.disabled = true;
    logMessage('Disconnected from server', 'system');
}

function handleSendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        logMessage(message, 'user');
        client.send({ text: message });
        messageInput.value = '';
    }
}

client.on('open', () => {
    logMessage('WebSocket connection opened', 'system');
});

client.on('log', (log) => {
    logMessage(`${log.type}: ${JSON.stringify(log.message)}`, 'system');
});

client.on('close', (event) => {
    logMessage(`WebSocket connection closed (code ${event.code})`, 'system');
});

client.on('audio', async (data) => {
    try {
        await resumeAudioContext();
        const streamer = await ensureAudioInitialized();
        streamer.addPCM16(new Uint8Array(data));
    } catch (error) {
        logMessage(`Error processing audio: ${error.message}`, 'system');
    }
});

client.on('content', (data) => {
    if (data.modelTurn) {
        const text = data.modelTurn.parts.map(part => part.text).join('');
        logMessage(text, 'ai');
    }
});

client.on('interrupted', () => {
    logMessage('Interrupted', 'system');
});

client.on('setupcomplete', () => {
    logMessage('Setup complete', 'system');
});

client.on('turncomplete', () => {
    logMessage('Turn complete', 'system');
});

sendButton.addEventListener('click', handleSendMessage);
messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        handleSendMessage();
    }
});

micButton.addEventListener('click', handleMicToggle);

connectButton.addEventListener('click', () => {
    if (isConnected) {
        disconnectFromWebsocket();
    } else {
        connectToWebsocket();
    }
});

messageInput.disabled = true;
sendButton.disabled = true;
micButton.disabled = true;
connectButton.textContent = 'Connect';
  