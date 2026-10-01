// Educational PD approximation, not a model of the CZ's measured rate tables.
// Pure DSP shared by the AudioWorklet and offline regression tests.
const limit = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

export function pdSample(phase, depth, wave) {
  const amount = limit(depth, 0, 1);
  const p = phase - Math.floor(phase);
  let distorted;
  if (wave === 2) {
    // Dwell near opposite cosine extrema; shorten the transitions as DCW
    // increases. With depth zero the reading phase is exactly linear.
    const plateau = amount * 0.24;
    const slope = 0.5 / (0.5 - 2 * plateau);
    if (p < plateau) distorted = 0;
    else if (p < 0.5 - plateau) distorted = (p - plateau) * slope;
    else if (p < 0.5 + plateau) distorted = 0.5;
    else if (p < 1 - plateau) distorted = 0.5 + (p - 0.5 - plateau) * slope;
    else distorted = 1;
  } else {
    // A cosine read with a progressively earlier midpoint gives a saw-like
    // cycle: a rapid falling flank and a longer rising flank.
    const breakpoint = 0.5 - amount * 0.48;
    distorted = p < breakpoint ? p * 0.5 / breakpoint
      : 0.5 + (p - breakpoint) * 0.5 / (1 - breakpoint);
  }
  return Math.cos(2 * Math.PI * distorted);
}

export class PreviewEnvelope {
  constructor(definition, sampleRate) {
    this.sampleRate = sampleRate;
    this.value = 0;
    this.index = 0;
    this.released = false;
    this.done = false;
    this.setDefinition(definition);
  }

  setDefinition(definition) {
    this.steps = definition.steps;
    this.end = Math.round(limit(definition.endStep, 1, 8)) - 1;
    this.sustain = this.steps.findIndex((step, index) => index <= this.end && step.sustain);
    this.index = Math.min(this.index, this.end);
    if (!this.done) this.setTarget();
  }

  setTarget() {
    const step = this.steps[this.index];
    this.target = this.index === this.end ? 0 : limit(step.level, 0, 99) / 99;
    // Full-range travel: ~8 seconds at R=0, ~8 ms at R=99. The time to
    // reach a point also depends on distance. These are intentionally
    // illustrative values, not the CZ hardware's envelope conversion.
    const seconds = 0.008 * Math.pow(1000, (99 - limit(step.rate, 0, 99)) / 99);
    this.increment = 1 / (seconds * this.sampleRate);
  }

  release() {
    this.released = true;
    if (this.sustain >= 0 && !this.done) {
      this.index = Math.min(this.sustain + 1, this.end);
      this.setTarget();
    }
  }

  next() {
    if (this.done) return 0;
    const delta = this.target - this.value;
    if (Math.abs(delta) > this.increment) {
      this.value += Math.sign(delta) * this.increment;
    } else {
      this.value = this.target;
      if (this.index === this.sustain && !this.released) return this.value;
      if (this.index === this.end) this.done = true;
      else { this.index++; this.setTarget(); }
    }
    return this.value;
  }
}

export class PreviewVoice {
  constructor(config, sampleRate) {
    this.sampleRate = sampleRate;
    this.phase = 0;
    this.age = 0;
    this.gate = 1;
    this.released = false;
    this.stopping = false;
    this.finished = false;
    this.envelopes = Object.fromEntries(['dco', 'dcw', 'dca'].map(kind =>
      [kind, new PreviewEnvelope(config.envelopes[kind], sampleRate)]));
    this.update(config);
    this.pitch = 0;
    this.depth = 0;
    this.amplitude = 0;
    this.smoothing = 1 - Math.exp(-1 / (0.004 * sampleRate));
  }

  update(config) {
    this.config = config;
    for (const kind of ['dco', 'dcw', 'dca']) this.envelopes[kind].setDefinition(config.envelopes[kind]);
    this.frequency = 440 * Math.pow(2, (config.note + config.octave * 12 - 69) / 12);
  }

  release() {
    if (this.released) return;
    this.released = true;
    Object.values(this.envelopes).forEach(envelope => envelope.release());
  }

  stop() { this.stopping = true; }

  next() {
    if (this.finished) return 0;
    this.age++;
    const pitch = this.envelopes.dco.next();
    const depth = this.envelopes.dcw.next();
    const amplitude = this.envelopes.dca.next();
    const enabled = this.config.enabled;
    const smooth = this.smoothing;
    this.pitch += ((enabled.dco ? pitch : 0) - this.pitch) * smooth;
    this.depth += ((enabled.dcw ? depth : 1) - this.depth) * smooth;
    this.amplitude += ((enabled.dca ? amplitude : 1) - this.amplitude) * smooth;
    if (this.stopping || (this.released && !enabled.dca) ||
        (enabled.dca && this.envelopes.dca.done) || this.age > this.sampleRate * 60) {
      this.gate = Math.max(0, this.gate - 1 / (0.025 * this.sampleRate));
      if (this.gate === 0) this.finished = true;
    }
    const fadeIn = Math.min(1, this.age / (0.005 * this.sampleRate));
    // Approximate unipolar pitch scale, two octaves at L=99. Capped well
    // below Nyquist to keep the educational preview usable at high pitches.
    const frequency = Math.min(this.sampleRate * 0.12, this.frequency * Math.pow(2, this.pitch * 2));
    let sample = 0;
    // Four sub-samples soften high-frequency PD artifacts. This is not a
    // reconstruction of the CZ converter or a fully band-limited oscillator.
    for (let i = 0; i < 4; i++) {
      sample += pdSample(this.phase, this.depth, this.config.wave);
      this.phase = (this.phase + frequency / (this.sampleRate * 4)) % 1;
    }
    return sample * 0.25 * this.amplitude * this.gate * fadeIn;
  }
}
