import { buildCompletePatchMessage } from './cz101-sysex.js';

// Coalesce edits and leave time for the CZ to receive the complete tone frame.
export class AutoAudition {
  constructor({ context, log = () => {}, setTimer = (fn, delay) => globalThis.setTimeout(fn, delay), clearTimer = id => globalThis.clearTimeout(id) }) {
    Object.assign(this, { context, log, setTimer, clearTimer });
    this.enabled = false;
    this.pending = null;
    this.active = null;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.stop();
  }

  stop() {
    this.clearTimer(this.pending);
    this.pending = null;
    if (this.active) {
      const { output, channel, timer } = this.active;
      this.clearTimer(timer);
      this.active = null;
      try { output.send([0x80 | channel, 60, 0]); }
      catch (error) { this.log(`AUTO NOTE OFF ERROR: ${error.message}`); }
    }
  }

  changed() {
    if (!this.enabled) return;
    this.stop();
    this.pending = this.setTimer(() => {
      this.pending = null;
      const context = this.context();
      if (!this.enabled || !context) return;
      const { output, channel, patch } = context;
      try {
        output.send(buildCompletePatchMessage(channel, patch, 0x60));
        this.log(`AUTO: patch sent to edit buffer · CH ${channel + 1}`);
        this.pending = this.setTimer(() => {
          this.pending = null;
          try {
            output.send([0x90 | channel, 60, 100]);
            this.active = { output, channel, timer: this.setTimer(() => this.stop(), 1000) };
            this.log('AUTO: C4 · 1 s');
          } catch (error) { this.log(`AUTO ERROR: ${error.message}`); }
        }, 150);
      } catch (error) { this.log(`AUTO ERROR: ${error.message}`); }
    }, 150);
  }
}
