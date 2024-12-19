class AudioRecorderProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 1024;
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
        this.lastVolumeUpdate = 0;
        this.sampleRate = 16000;
        
        this.volumeSmoothing = 0.8;
        this.smoothedVolume = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || !input[0]) return true;

        const samples = input[0];
        
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
            const sample = samples[i];
            sum += sample * sample;
            
            this.buffer[this.bufferIndex++] = sample;
            
            if (this.bufferIndex >= this.bufferSize) {
                const pcmBuffer = new Int16Array(this.bufferSize);
                for (let j = 0; j < this.bufferSize; j++) {
                    pcmBuffer[j] = Math.max(-32768, Math.min(32767, 
                        Math.floor(this.buffer[j] * 32768)));
                }
                
                this.port.postMessage({
                    type: 'audio',
                    buffer: pcmBuffer.buffer
                }, [pcmBuffer.buffer]);
                
                this.bufferIndex = 0;
            }
        }

        const currentRms = Math.sqrt(sum / samples.length);
        this.smoothedVolume = this.volumeSmoothing * this.smoothedVolume + 
            (1 - this.volumeSmoothing) * currentRms;

        const currentTime = currentFrame / this.sampleRate;
        if (currentTime - this.lastVolumeUpdate > 0.1) {
            this.port.postMessage({
                type: 'volume',
                volume: this.smoothedVolume
            });
            this.lastVolumeUpdate = currentTime;
        }

        return true;
    }
}

registerProcessor('audio-recorder-processor', AudioRecorderProcessor); 