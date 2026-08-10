export class MidiManager {
  constructor(onPortsChanged = ()=>{}) {
    this.access = null;
    this.onPortsChanged = onPortsChanged;
  }

  async connect() {
    if (!navigator.requestMIDIAccess) throw new Error('Web MIDI is not supported by this browser');
    this.access = await navigator.requestMIDIAccess({ sysex: true });
    this.access.onstatechange = () => this.onPortsChanged(this.ports());
    this.onPortsChanged(this.ports());
    return this.ports();
  }

  ports() {
    return {
      inputs: this.access ? Array.from(this.access.inputs.values()) : [],
      outputs: this.access ? Array.from(this.access.outputs.values()) : []
    };
  }

  input(id) { return this.access?.inputs.get(id) || null; }
  output(id) { return this.access?.outputs.get(id) || null; }
}
