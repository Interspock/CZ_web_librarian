import { PatchStore } from './store.js';
import { createPatch, clamp } from './patch-model.js';
import { EnvelopeEditor } from './envelope-editor.js';
import { MidiManager } from './midi.js';
import { sendPatchToCZ, testCZSysex, encodeTone, nibblize } from './cz101-sysex.js';

const $ = s => document.querySelector(s);
const store = new PatchStore();
const midi = new MidiManager(renderMidiPorts);
let envEditors = [];
let monitoredInput = null;
let monitorHandler = null;
let rawSyx = null;

const bindings = [
  ['#patchName', p=>p.name, (p,v)=>p.name=v],
  ['#lineSelect', p=>p.common.lineSelect, (p,v)=>p.common.lineSelect=v],
  ['#octave', p=>p.common.octave, (p,v)=>p.common.octave=Number(v)],
  ['#detuneDirection', p=>p.common.detune.direction, (p,v)=>p.common.detune.direction=v],
  ['#detuneOctave', p=>p.common.detune.octave, (p,v)=>p.common.detune.octave=clamp(v,0,3)],
  ['#detuneNote', p=>p.common.detune.note, (p,v)=>p.common.detune.note=clamp(v,0,11)],
  ['#detuneFine', p=>p.common.detune.fine, (p,v)=>p.common.detune.fine=clamp(v,0,60)],
  ['#vibWave', p=>p.common.vibrato.wave, (p,v)=>p.common.vibrato.wave=Number(v)],
  ['#vibDelay', p=>p.common.vibrato.delay, (p,v)=>p.common.vibrato.delay=clamp(v,0,99)],
  ['#vibRate', p=>p.common.vibrato.rate, (p,v)=>p.common.vibrato.rate=clamp(v,0,99)],
  ['#vibDepth', p=>p.common.vibrato.depth, (p,v)=>p.common.vibrato.depth=clamp(v,0,99)],
];

bindings.forEach(([sel, , set]) => {
  $(sel).addEventListener('input', e => {
    set(store.selected(), e.target.value);
    changed();
    if (sel === '#patchName') renderPatchList();
    if (sel === '#lineSelect') renderPatch();
  });
});

$('#newPatch').onclick = () => { store.add(createPatch()); renderAll(); };
$('#duplicatePatch').onclick = () => { store.duplicate(); renderAll(); };
$('#deletePatch').onclick = () => { if (confirm('Delete selected patch?')) { store.remove(store.selected().id); renderAll(); } };
$('#search').oninput = renderPatchList;
$('#connectMidi').onclick = async () => {
  try {
    const ports = await midi.connect();
    $('#midiStatus').textContent = 'MIDI ready';
    log(`Web MIDI connected with SysEx permission (${ports.inputs.length} input(s), ${ports.outputs.length} output(s))`);
    attachMidiMonitor();
  } catch (e) { log(`MIDI error: ${e.message}`); $('#midiStatus').textContent = 'MIDI error'; }
};

$('#midiInput').addEventListener('change', attachMidiMonitor);

$('#testNote').onclick = () => {
  try {
    const out = selectedOutput();
    const ch = selectedChannel0();
    const on = [0x90 | ch, 60, 100];
    const off = [0x80 | ch, 60, 0];
    log(`TX NOTE: ${hex(on)}  (C4 on CH ${ch + 1})`);
    out.send(on);
    setTimeout(() => {
      log(`TX NOTE: ${hex(off)}  (C4 off)`);
      out.send(off);
    }, 500);
  } catch (e) {
    log(`NOTE TEST ERROR: ${e.message}`);
  }
};

$('#testSysex').onclick = async () => {
  try {
    $('#midiStatus').textContent = 'Testing SysEx…';
    await testCZSysex({
      midiOutput: selectedOutput(),
      channel: selectedChannel0() + 1,
      log
    });
    $('#midiStatus').textContent = 'SysEx frame sent';
  } catch (e) {
    log(`SYSEX TEST ERROR: ${e.message}`);
    $('#midiStatus').textContent = 'SysEx test failed';
  }
};


$('#loadRawSyx').onclick = () => $('#rawSyxFile').click();

$('#rawSyxFile').onchange = async e => {
  const file = e.target.files?.[0];
  rawSyx = null;
  $('#sendRawSyx').disabled = true;
  if (!file) return;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const info = validateCZ101ToneSyx(bytes);
    rawSyx = bytes;
    const digest = await sha256(bytes);
    $('#rawSyxInfo').className = 'raw-syx-info ok';
    $('#rawSyxInfo').textContent = `${file.name} · ${bytes.length} bytes · CZ tone data OK · source target 0x${info.program.toString(16).padStart(2,'0').toUpperCase()} · SHA-256 ${digest.slice(0,16)}…`;
    $('#sendRawSyx').disabled = false;
    log(`RAW SYX loaded: ${file.name} (${bytes.length} bytes)`);
    log(`RAW SYX validated: Casio CZ timbre frame, command 20, source target ${hex([info.program])}`);
    log(`RAW head: ${hex(bytes.slice(0,24))} …`);
    log(`RAW tail: … ${hex(bytes.slice(-16))}`);
    log(`RAW SHA-256: ${digest}`);
    log('Safety: Send raw will rewrite channel to the selected CH and target to 0x60 (temporary/edit buffer). It will NOT write INT memory.');
  } catch (err) {
    $('#rawSyxInfo').className = 'raw-syx-info bad';
    $('#rawSyxInfo').textContent = `${file.name}: rejected — ${err.message}`;
    log(`RAW SYX REJECTED: ${err.message}`);
  } finally {
    e.target.value = '';
  }
};

$('#sendRawSyx').onclick = () => {
  try {
    if (!rawSyx) throw new Error('Load and validate a .syx file first');
    validateCZ101ToneSyx(rawSyx);
    const out = selectedOutput();
    const frame = Uint8Array.from(rawSyx);
    frame[4] = 0x70 | selectedChannel0();
    frame[6] = 0x60; // always edit/temporary buffer; never INT memory
    log(`TX SAFE RAW SYX: ${frame.length} bytes; CH ${selectedChannel0()+1}; target 60 (edit buffer)`);
    log(`TX head: ${hex(frame.slice(0,24))} …`);
    out.send(frame);
    $('#midiStatus').textContent = 'Raw CZ patch sent';
  } catch (err) {
    log(`RAW SEND ERROR: ${err.message}`);
    $('#midiStatus').textContent = 'Raw send failed';
  }
};

$('#clearMidiLog').onclick = () => { $('#log').textContent = ''; };

$('#sendPatch').onclick = async () => {
  try {
    const p = store.selected();
    const logical = encodeTone(p);
    log(`Encoded ${logical.length} logical bytes / ${nibblize(logical).length} nibbles`);
    await sendPatchToCZ({
      midiOutput: selectedOutput(),
      channel: Number($('#midiChannel').value),
      patch: p,
      program: 0x60,
      log
    });
    $('#midiStatus').textContent = 'Patch sent';
  } catch (e) {
    log(`SEND ERROR: ${e.message}`);
    $('#midiStatus').textContent = 'Send failed';
  }
};

$('#exportJson').onclick = () => {
  const blob = new Blob([store.exportLibrary()], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `cz101-library-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};
$('#importJson').onclick = () => $('#jsonFile').click();
$('#jsonFile').onchange = async e => {
  try {
    const data = JSON.parse(await e.target.files[0].text());
    store.importLibrary(data);
    renderAll();
  } catch (err) { alert(`Import failed: ${err.message}`); }
  e.target.value = '';
};

function renderAll() {
  renderPatchList();
  renderPatch();
}

function renderPatchList() {
  const q = $('#search').value.trim().toLowerCase();
  const list = $('#patchList');
  list.innerHTML = '';
  store.state.patches.filter(p => p.name.toLowerCase().includes(q)).forEach(p => {
    const b = document.createElement('button');
    b.className = `patch-item ${p.id === store.state.selectedId ? 'selected' : ''}`;
    b.innerHTML = `<strong>${escapeHtml(p.name)}</strong><small>${new Date(p.meta.updatedAt).toLocaleString()}</small>`;
    b.onclick = () => { store.select(p.id); renderAll(); };
    list.append(b);
  });
}

function renderPatch() {
  const p = store.selected();
  bindings.forEach(([sel,get]) => { $(sel).value = get(p); });
  const lines = $('#lines');
  lines.innerHTML = '';
  envEditors = [];
  for (const lineName of visibleLines(p.common.lineSelect)) {
    const line = p[lineName];
    const section = document.createElement('section');
    section.className = 'line-card card';
    section.innerHTML = `
      <h2>${lineName === 'line1' ? 'LINE 1' : 'LINE 2'}</h2>
      <div class="line-params">
        <label class="wave-control">Wave 1
          <span class="wave-select-row">
            <select data-p="waveform1">${waveOptions(line.waveform1, false)}</select>
            <span class="wave-preview" data-wave-preview="waveform1">${waveformSvg(line.waveform1)}</span>
          </span>
        </label>
        <label class="wave-control">Wave 2
          <span class="wave-select-row">
            <select data-p="waveform2">${waveOptions(line.waveform2, true)}</select>
            <span class="wave-preview" data-wave-preview="waveform2">${waveformSvg(line.waveform2)}</span>
          </span>
        </label>
        <label>DCW key follow <input data-p="dcwKeyFollow" type="number" min="0" max="9" value="${line.dcwKeyFollow}"></label>
        <label>DCA key follow <input data-p="dcaKeyFollow" type="number" min="0" max="9" value="${line.dcaKeyFollow}"></label>
        ${lineName==='line1' ? `<label>Modulation <select data-p="modulation"><option value="none">None</option><option value="ring">Ring</option><option value="noise">Noise</option></select></label>` : ''}
      </div>
      ${waveformReference(line)}
      <div class="envelopes"></div>`;
    if (lineName==='line1') section.querySelector('[data-p="modulation"]').value = line.modulation;
    section.querySelectorAll('[data-p]').forEach(el => el.addEventListener('change', () => {
      const k = el.dataset.p;
      line[k] = ['waveform1','waveform2','dcaKeyFollow','dcwKeyFollow'].includes(k) ? Number(el.value) : el.value;
      if (k === 'waveform1' || k === 'waveform2') {
        const preview = section.querySelector(`[data-wave-preview="${k}"]`);
        if (preview) preview.innerHTML = waveformSvg(Number(el.value));
        updateWaveReferenceSelection(section, line);
      }
      changed();
    }));
    const envs = section.querySelector('.envelopes');
    for (const kind of ['dco','dcw','dca']) {
      const box = document.createElement('div');
      box.className = 'env-card';
      box.innerHTML = `<h3>${kind.toUpperCase()} envelope <small>drag node: vertical = level · horizontal = rate</small></h3><div class="env-host"></div>`;
      envs.append(box);
      envEditors.push(new EnvelopeEditor(box.querySelector('.env-host'), line.envelopes[kind], changed));
    }
    lines.append(section);
  }
  $('#dirtyState').textContent = 'saved locally';
}

function visibleLines(lineSelect) {
  if (lineSelect === 'line2') return ['line2'];
  if (lineSelect === 'line1+line2') return ['line1', 'line2'];
  return ['line1'];
}

function changed() {
  store.touch();
  $('#dirtyState').textContent = 'saved locally';
  renderPatchList();
}

function selectedInput() {
  const input = midi.input($('#midiInput').value);
  if (!input) throw new Error('Choose a MIDI input');
  return input;
}

function selectedOutput() {
  const output = midi.output($('#midiOutput').value);
  if (!output) throw new Error('Choose a MIDI output');
  return output;
}

function selectedChannel0() {
  return clamp(Number($('#midiChannel').value) - 1, 0, 15);
}

function attachMidiMonitor() {
  if (monitoredInput && monitorHandler) {
    monitoredInput.removeEventListener('midimessage', monitorHandler);
  }
  monitoredInput = midi.input($('#midiInput').value);
  monitorHandler = null;
  if (!monitoredInput) {
    log('MIDI monitor: no input selected');
    return;
  }
  monitorHandler = e => {
    const data = Array.from(e.data);
    log(`RX ${classifyMidi(data)}: ${hex(data)}`);
  };
  monitoredInput.addEventListener('midimessage', monitorHandler);
  log(`MIDI monitor attached to: ${monitoredInput.name || monitoredInput.id}`);
}

function classifyMidi(data) {
  if (!data.length) return 'EMPTY';
  if (data[0] === 0xF0) return 'SYSEX';
  const status = data[0] & 0xF0;
  const ch = (data[0] & 0x0F) + 1;
  if (status === 0x90) return `NOTE ON ch${ch}`;
  if (status === 0x80) return `NOTE OFF ch${ch}`;
  if (status === 0xC0) return `PROGRAM ch${ch}`;
  if (status === 0xB0) return `CC ch${ch}`;
  return 'MIDI';
}

function hex(data) {
  return Array.from(data, v => Number(v).toString(16).padStart(2, '0').toUpperCase()).join(' ');
}


function validateCZ101ToneSyx(bytes) {
  if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
  if (bytes.length !== 264) throw new Error(`expected exactly 264 bytes for a CZ-101 timbre frame, got ${bytes.length}`);
  if (bytes[0] !== 0xF0 || bytes[bytes.length-1] !== 0xF7) throw new Error('not a complete SysEx frame (must start F0 and end F7)');
  if (bytes[1] !== 0x44 || bytes[2] !== 0x00 || bytes[3] !== 0x00) throw new Error('not a Casio CZ manufacturer header (44 00 00)');
  if ((bytes[4] & 0xF0) !== 0x70) throw new Error(`unexpected CZ channel byte ${hex([bytes[4]])}`);
  if (bytes[5] !== 0x20) throw new Error(`not a CZ receive/timbre-data frame (command must be 20, got ${hex([bytes[5]])})`);
  for (let i=7; i<263; i++) {
    if (bytes[i] > 0x0F) throw new Error(`invalid nibble at byte ${i}: ${hex([bytes[i]])}; CZ-101 tone payload must be 00..0F`);
  }
  return { channel: (bytes[4] & 0x0F) + 1, program: bytes[6] };
}

async function sha256(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('');
}

function renderMidiPorts(ports) {
  fill($('#midiInput'), ports.inputs, 'MIDI input');
  fill($('#midiOutput'), ports.outputs, 'MIDI output');
}

function fill(select, ports, placeholder) {
  const previous = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>`;
  ports.forEach(p => {
    const o = document.createElement('option'); o.value = p.id; o.textContent = p.name || p.manufacturer || p.id; select.append(o);
  });
  if (ports.some(p=>p.id===previous)) select.value = previous;
}

function waveOptions(selected, allowOff) {
  let s = allowOff ? `<option value="0">Off</option>` : '';
  for (let i=1;i<=8;i++) s += `<option value="${i}" ${i===selected?'selected':''}>Wave ${i}</option>`;
  return s;
}


const WAVEFORM_PATHS = {
  1: 'M7 30 V8 L51 30',
  2: 'M7 30 V9 H34 V30 H52',
  3: 'M5 30 H13 L19 8 L25 30 H55',
  4: 'M4 30 L10 8 L16 30 C21 30 22 8 34 8 C46 8 47 30 56 30',
  5: 'M5 30 C10 30 12 8 25 8 H29 V30 H55',
  6: 'M5 30 L8 8 L12 30 L15 11 L19 30 L22 14 L26 30 L29 17 L33 30 L36 20 L40 30 L43 23 L47 30 L50 26 L54 30',
  7: 'M4 30 L8 27 L11 30 L14 22 L17 30 L20 16 L23 30 L26 9 L29 30 L32 16 L35 30 L38 22 L41 30 L44 27 L48 30',
  8: 'M4 30 V8 H8 V30 H11 V11 H15 V30 H18 V14 H22 V30 H25 V17 H29 V30 H32 V20 H36 V30 H39 V23 H43 V30 H46 V26 H50 V30 H55'
};

function waveformSvg(wave) {
  const n = Number(wave);
  if (!WAVEFORM_PATHS[n]) {
    return `<svg class="wave-icon off" viewBox="0 0 60 38" aria-label="Off"><path class="wave-baseline" d="M5 30 H55"/></svg>`;
  }
  return `<svg class="wave-icon" viewBox="0 0 60 38" role="img" aria-label="CZ waveform ${n}">
    <path class="wave-baseline" d="M4 30 H56"/>
    <path class="wave-shape" d="${WAVEFORM_PATHS[n]}"/>
  </svg>`;
}

function waveformReference(line) {
  const items = Array.from({length: 8}, (_, i) => {
    const n = i + 1;
    const classes = [
      'wave-ref-item',
      Number(line.waveform1) === n ? 'selected-wave1' : '',
      Number(line.waveform2) === n ? 'selected-wave2' : ''
    ].filter(Boolean).join(' ');
    return `<div class="${classes}" data-wave-ref="${n}">
      <span class="wave-ref-number">${n}</span>
      ${waveformSvg(n)}
    </div>`;
  }).join('');
  return `<div class="wave-reference">
    <div class="wave-reference-head">
      <span>CZ-101 wave form reference</span>
      <small>panel shapes · gold = Wave 1 · outline = Wave 2</small>
    </div>
    <div class="wave-reference-grid">${items}</div>
  </div>`;
}

function updateWaveReferenceSelection(section, line) {
  section.querySelectorAll('[data-wave-ref]').forEach(item => {
    const n = Number(item.dataset.waveRef);
    item.classList.toggle('selected-wave1', Number(line.waveform1) === n);
    item.classList.toggle('selected-wave2', Number(line.waveform2) === n);
  });
}

function log(msg) {
  const el = $('#log');
  el.textContent += `[${new Date().toLocaleTimeString()}] ${msg}\n`;
  el.scrollTop = el.scrollHeight;
}
function escapeHtml(v){ return String(v).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

renderAll();
