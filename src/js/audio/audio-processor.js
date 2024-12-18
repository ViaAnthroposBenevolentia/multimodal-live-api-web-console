class AudioRecorderProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 2048;
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
        this.lastVolumeUpdate = 0;
        this.sampleRate = 16000; // Match the sample rate from AudioRecorder
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || !input[0]) return true;

        const samples = input[0];
        
        // Calculate volume
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
            sum += samples[i] * samples[i];
            
            this.buffer[this.bufferIndex++] = samples[i];
            
            if (this.bufferIndex >= this.bufferSize) {
                // Convert to 16-bit PCM
                const pcmBuffer = new Int16Array(this.bufferSize);
                for (let j = 0; j < this.bufferSize; j++) {
                    pcmBuffer[j] = Math.max(-1, Math.min(1, this.buffer[j])) * 0x7FFF;
                }
                
                this.port.postMessage({
                    type: 'audio',
                    buffer: pcmBuffer.buffer
                }, [pcmBuffer.buffer]);
                
                this.bufferIndex = 0;
            }
        }

        // Calculate current time from frame count
        const currentTime = currentFrame / this.sampleRate;
        
        // Send volume updates less frequently (every 100ms)
        if (currentTime - this.lastVolumeUpdate > 0.1) {
            const rms = Math.sqrt(sum / samples.length);
            this.port.postMessage({
                type: 'volume',
                volume: rms
            });
            this.lastVolumeUpdate = currentTime;
        }

        return true;
    }
}

registerProcessor('audio-recorder-processor', AudioRecorderProcessor); 