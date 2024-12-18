// This file implements a volume meter worklet, providing visual feedback on audio levels.

class VolumeMeter extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'volume',
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
      },
    ];
  }

  constructor() {
    super();
    this.volume = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input) {
      const channelData = input[0];
      const sum = channelData.reduce((acc, val) => acc + Math.abs(val), 0);
      this.volume = sum / channelData.length;
      this.port.postMessage(this.volume);
    }
    return true;
  }
}

registerProcessor('volume-meter', VolumeMeter);