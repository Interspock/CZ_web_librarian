export const MAX_STEPS = 8;

const env = (kind) => ({
  kind,
  endStep: 4,
  steps: [
    { rate: 70, level: kind === 'dco' ? 50 : 99, sustain: false },
    { rate: 55, level: kind === 'dco' ? 50 : 80, sustain: kind !== 'dco' },
    { rate: 45, level: kind === 'dco' ? 50 : 55, sustain: false },
    { rate: 35, level: 0, sustain: false },
    ...Array.from({ length: 4 }, () => ({ rate: 0, level: 0, sustain: false }))
  ]
});

const line = () => ({
  waveform1: 1,
  waveform2: 0,
  modulation: 'none',
  dcaKeyFollow: 0,
  dcwKeyFollow: 0,
  envelopes: {
    dco: env('dco'),
    dcw: env('dcw'),
    dca: env('dca')
  }
});

export function createPatch(name = 'NEW PATCH') {
  return {
    id: crypto.randomUUID(),
    schemaVersion: 1,
    name,
    meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    common: {
      lineSelect: 'line1',
      octave: 0,
      detune: { direction: 'up', octave: 0, note: 0, fine: 0 },
      vibrato: { wave: 1, delay: 0, rate: 0, depth: 0 }
    },
    line1: line(),
    line2: line()
  };
}

export function normalizePatch(raw) {
  const base = createPatch(raw?.name || 'IMPORTED PATCH');
  const p = structuredClone(base);
  deepAssign(p, raw || {});
  p.id ||= crypto.randomUUID();
  p.schemaVersion = 1;
  p.meta ||= {};
  p.meta.updatedAt ||= new Date().toISOString();
  for (const ln of ['line1', 'line2']) {
    for (const kind of ['dco', 'dcw', 'dca']) {
      const e = p[ln].envelopes[kind];
      e.steps = Array.from({ length: MAX_STEPS }, (_, i) => ({
        rate: clamp(e.steps?.[i]?.rate ?? 0, 0, 99),
        level: clamp(e.steps?.[i]?.level ?? 0, 0, 99),
        sustain: !!e.steps?.[i]?.sustain
      }));
      e.endStep = clamp(e.endStep || MAX_STEPS, 1, MAX_STEPS);
      // One sustain point at most, and never after END.
      let seen = false;
      e.steps.forEach((s, i) => {
        if (i >= e.endStep) s.sustain = false;
        if (s.sustain && seen) s.sustain = false;
        if (s.sustain) seen = true;
      });
    }
  }
  return p;
}

function deepAssign(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object') {
      deepAssign(target[k], v);
    } else {
      target[k] = v;
    }
  }
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number(n) || 0));
}
