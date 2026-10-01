// Browser-only audition controller. It never requests or sends MIDI and does
// not write preview settings into patches or storage.
export class PDPreview {
  constructor(getPatch, visibleLines) {
    this.getPatch = getPatch;
    this.visibleLines = visibleLines;
    this.context = null;
    this.node = null;
    this.ready = null;
    this.generation = 0;
    this.playing = false;
    this.starting = false;
    this.failed = false;
    this.patchId = null;
    this.elements = Object.fromEntries(['Line', 'Source', 'Note', 'Volume', 'VolumeValue', 'Play', 'Release', 'Stop', 'Status', 'Scope']
      .map(key => [key, document.querySelector(`#preview${key}`)]));
    this.envelopeControls = [...document.querySelectorAll('[data-preview-envelope]')];
    this.elements.Play.onclick = () => this.play();
    this.elements.Release.onclick = () => this.release();
    this.elements.Stop.onclick = () => this.stop();
    this.elements.Line.onchange = () => { this.stop(); this.refresh(); };
    this.elements.Source.onchange = () => this.refresh();
    this.elements.Note.onchange = () => { this.stop(); this.refresh(); };
    this.envelopeControls.forEach(control => { control.onchange = () => this.refresh(); });
    this.elements.Volume.oninput = () => this.setVolume();
    window.addEventListener('blur', () => this.stop());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.stop(); });
    this.setVolume();
  }

  config() {
    const patch = this.getPatch();
    const line = patch[this.elements.Line.value];
    return {
      wave: this.elements.Source.value === 'patch' ? line.waveform1 : Number(this.elements.Source.value),
      note: Number(this.elements.Note.value),
      octave: patch.common.octave,
      envelopes: structuredClone(line.envelopes),
      enabled: Object.fromEntries(this.envelopeControls.map(control => [control.dataset.previewEnvelope, control.checked]))
    };
  }

  refresh() {
    const patch = this.getPatch();
    const lines = this.visibleLines(patch.common.lineSelect);
    const previous = this.elements.Line.value;
    if (patch.id !== this.patchId || !lines.includes(previous)) this.stop();
    this.elements.Line.replaceChildren(...lines.map(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name === 'line1' ? 'Line 1' : 'Line 2';
      return option;
    }));
    this.elements.Line.value = patch.id === this.patchId && lines.includes(previous) ? previous : lines[0];
    this.patchId = patch.id;
    const config = this.config();
    const supported = [1, 2].includes(config.wave);
    this.elements.Play.disabled = this.failed || !supported || !(window.AudioContext && window.AudioWorkletNode);
    this.elements.Scope.textContent = !supported
      ? `Wave ${config.wave} todavía no está emulada. Elegí una base Saw o Square para escuchar las envolventes sin cambiar el patch.`
      : `Base: ${this.elements.Line.value === 'line1' ? 'Line 1' : 'Line 2'} sobre ${config.wave === 1 ? 'Saw PD' : 'Square PD'}${this.elements.Source.value === 'patch' ? ' (Wave 1 del patch)' : ' (base de referencia)'}. Sólo una línea: Wave 2, Key Follow, Detune, Vibrato y Ring/Noise no se incluyen aún.`;
    if (!(window.AudioContext && window.AudioWorkletNode)) {
      this.elements.Scope.textContent = 'Este navegador no dispone del motor de audio necesario. Probá Chrome/Chromium en HTTPS o localhost.';
    }
    if (this.playing) {
      if (!supported) this.stop();
      else this.node?.port.postMessage({ type: 'update', config });
    }
  }

  setVolume() {
    const volume = Number(this.elements.Volume.value) / 100;
    this.elements.VolumeValue.textContent = `${Math.round(volume * 100)}%`;
    if (this.gain) this.gain.gain.setTargetAtTime(volume, this.context.currentTime, 0.015);
  }

  async initialize() {
    if (!this.ready) {
      this.ready = (async () => {
        const context = new AudioContext({ latencyHint: 'interactive' });
        this.context = context;
        // Request resume directly in the user gesture, before loading code.
        const resumed = context.resume();
        try {
          await context.audioWorklet.addModule(new URL('./preview-worklet.js', import.meta.url));
          await resumed;
          const node = new AudioWorkletNode(context, 'cz-pd-preview', {
            numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1]
          });
          const highpass = context.createBiquadFilter();
          highpass.type = 'highpass';
          highpass.frequency.value = 18;
          this.gain = context.createGain();
          this.gain.gain.value = Number(this.elements.Volume.value) / 100;
          node.connect(highpass).connect(this.gain).connect(context.destination);
          this.node = node;
          node.port.onmessage = ({ data }) => {
            if (data.type === 'finished' && data.id === this.generation) {
              this.playing = false;
              this.elements.Release.disabled = true;
              this.elements.Stop.disabled = true;
              this.elements.Status.textContent = 'Nota terminada · Play para repetir';
            }
          };
          node.onprocessorerror = () => {
            this.stop();
            this.failed = true;
            this.elements.Status.textContent = 'Error en el motor de preescucha. Recargá la página para reiniciarlo.';
            this.elements.Play.disabled = true;
          };
        } catch (error) {
          await context.close();
          this.context = null;
          this.ready = null;
          throw error;
        }
      })();
    }
    await this.ready;
    if (this.context.state !== 'running') await this.context.resume();
  }

  async play() {
    const id = ++this.generation;
    this.playing = true;
    this.starting = true;
    this.elements.Release.disabled = false;
    this.elements.Stop.disabled = false;
    this.elements.Status.textContent = 'Iniciando audio…';
    try {
      await this.initialize();
      if (id !== this.generation || !this.playing) return;
      this.starting = false;
      const config = this.config();
      if (![1, 2].includes(config.wave)) return this.stop();
      this.node.port.postMessage({ type: 'noteOn', id, config });
      this.elements.Status.textContent = 'Sonando · editá y usá Release para soltar la nota';
    } catch (error) {
      if (id !== this.generation) return;
      this.playing = false;
      this.starting = false;
      this.elements.Release.disabled = true;
      this.elements.Stop.disabled = true;
      this.elements.Status.textContent = `Error de audio: ${error.message}`;
    }
  }

  release() {
    if (this.starting || !this.node) {
      this.stop(); // Cancel a release during asynchronous first-time setup.
      return;
    }
    this.node.port.postMessage({ type: 'noteOff' });
    this.elements.Release.disabled = true;
    this.elements.Status.textContent = 'Liberando · escuchá la cola de las envolventes';
  }

  stop() {
    this.generation++;
    this.playing = false;
    this.starting = false;
    this.node?.port.postMessage({ type: 'stop' });
    this.elements.Release.disabled = true;
    this.elements.Stop.disabled = true;
    this.elements.Status.textContent = 'Lista · Play para escuchar';
  }
}
