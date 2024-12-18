// This file contains the audio processing worklet, which processes audio data in real-time.

class AudioProcessingWorklet extends AudioWorkletProcessor {
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];

        for (let channel = 0; channel < output.length; ++channel) {
            const inputChannel = input[channel];
            const outputChannel = output[channel];

            for (let i = 0; i < inputChannel.length; i++) {
                // Simple pass-through processing
                outputChannel[i] = inputChannel[i];
            }
        }

        return true; // Keep the processor alive
    }
}

registerProcessor('audio-processing-worklet', AudioProcessingWorklet);