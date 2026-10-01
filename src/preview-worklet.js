import { PreviewVoice } from './preview-dsp.js';

class PDPreviewProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.voice = null;
    this.tails = [];
    this.id = 0;
    this.port.onmessage = ({ data }) => {
      if (data.type === 'noteOn') {
        if (this.voice) {
          this.voice.stop();
          this.tails.push(this.voice);
          if (this.tails.length > 3) this.tails.shift();
        }
        this.id = data.id;
        this.voice = new PreviewVoice(data.config, sampleRate);
      } else if (data.type === 'update') this.voice?.update(data.config);
      else if (data.type === 'noteOff') this.voice?.release();
      else if (data.type === 'stop') {
        this.voice?.stop();
        this.tails.forEach(voice => voice.stop());
      }
    };
  }

  process(inputs, outputs) {
    const output = outputs[0][0];
    for (let i = 0; i < output.length; i++) {
      let sample = this.voice?.next() || 0;
      for (const tail of this.tails) sample += tail.next();
      output[i] = sample * 0.5; // Headroom for short retrigger crossfades.
    }
    this.tails = this.tails.filter(voice => !voice.finished);
    if (this.voice?.finished) {
      this.voice = null;
      this.port.postMessage({ type: 'finished', id: this.id });
    }
    return true;
  }
}

registerProcessor('cz-pd-preview', PDPreviewProcessor);
