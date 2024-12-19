export class AudioRecorder {
    constructor(sampleRate = 16000) {
        this.sampleRate = sampleRate;
        this.stream = null;
        this.mediaRecorder = null;
        this.audioContext = null;
        this.source = null;
        this.processor = null;
        this.onAudioData = null;
    }

    async start(onAudioData) {
        this.onAudioData = onAudioData;
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
            this.source = this.audioContext.createMediaStreamSource(this.stream);

            await this.audioContext.audioWorklet.addModule('js/worklets/audio-processing.js');
            this.processor = new AudioWorkletNode(this.audioContext, 'audio-recorder-worklet');
            
            this.processor.port.onmessage = (event) => {
                if (event.data.event === 'chunk' && this.onAudioData) {
                    const base64Data = this.arrayBufferToBase64(event.data.data.int16arrayBuffer);
                    this.onAudioData(base64Data);
                }
            };

            this.source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);
        } catch (error) {
            console.error('Error starting audio recording:', error);
            throw error;
        }
    }

    stop() {
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
} 