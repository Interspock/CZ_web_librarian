import { clamp, MAX_STEPS } from './patch-model.js';

const NS = 'http://www.w3.org/2000/svg';

export class EnvelopeEditor {
  constructor(container, envelope, onChange) {
    this.container = container;
    this.envelope = envelope;
    this.onChange = onChange;
    this.width = 620;
    this.height = 220;
    this.pad = { l: 34, r: 16, t: 18, b: 28 };
    this.drag = null;
    this.render();
  }

  setEnvelope(envelope) {
    this.envelope = envelope;
    this.render();
  }

  render() {
    this.container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'env-wrap';

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
    svg.classList.add('env-svg');
    this.svg = svg;

    this.drawGrid(svg);

    const active = this.envelope.steps.slice(0, this.envelope.endStep);
    const pts = active.map((s, i) => this.xy(i, s));
    const path = document.createElementNS(NS, 'polyline');
    path.setAttribute('points', `${this.pad.l},${this.height - this.pad.b} ` + pts.map(p => `${p.x},${p.y}`).join(' '));
    path.setAttribute('class', 'env-line');
    svg.append(path);

    active.forEach((s, i) => this.drawPoint(svg, s, i));

    svg.addEventListener('pointermove', e => this.pointerMove(e));
    svg.addEventListener('pointerup', e => this.pointerUp(e));
    svg.addEventListener('pointercancel', e => this.pointerUp(e));
    wrap.append(svg);
    wrap.append(this.table());
    this.container.append(wrap);
  }

  drawGrid(svg) {
    [0, 25, 50, 75, 99].forEach(level => {
      const y = this.levelToY(level);
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', this.pad.l); l.setAttribute('x2', this.width - this.pad.r);
      l.setAttribute('y1', y); l.setAttribute('y2', y); l.setAttribute('class', 'grid-line');
      svg.append(l);
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', 2); t.setAttribute('y', y + 4); t.setAttribute('class', 'axis-text'); t.textContent = level;
      svg.append(t);
    });
  }

  drawPoint(svg, step, i) {
    const p = this.xy(i, step);
    const g = document.createElementNS(NS, 'g');
    g.classList.add('env-node');
    g.dataset.index = i;
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', 7);
    c.addEventListener('pointerdown', e => this.pointerDown(e, i));
    g.append(c);

    const label = document.createElementNS(NS, 'text');
    label.setAttribute('x', p.x + 10); label.setAttribute('y', p.y - 9); label.setAttribute('class', 'node-label');
    label.textContent = `${i + 1}${step.sustain ? ' S' : ''}${i + 1 === this.envelope.endStep ? ' E' : ''}`;
    g.append(label);
    svg.append(g);
  }

  table() {
    const div = document.createElement('div');
    div.className = 'env-table';
    for (let i = 0; i < MAX_STEPS; i++) {
      const s = this.envelope.steps[i];
      const row = document.createElement('div');
      row.className = `env-row ${i >= this.envelope.endStep ? 'inactive' : ''}`;
      row.innerHTML = `
        <strong>${i + 1}</strong>
        <label>R <input data-k="rate" type="number" min="0" max="99" value="${s.rate}"></label>
        <label>L <input data-k="level" type="number" min="0" max="99" value="${s.level}"></label>
        <label class="check"><input data-k="sustain" type="checkbox" ${s.sustain ? 'checked' : ''}> S</label>
        <label class="check"><input data-k="end" type="radio" name="end-${this.envelope.kind}-${this.uid ||= crypto.randomUUID()}" ${i + 1 === this.envelope.endStep ? 'checked' : ''}> E</label>`;
      row.querySelectorAll('input').forEach(input => input.addEventListener('change', () => {
        const key = input.dataset.k;
        if (key === 'rate' || key === 'level') s[key] = clamp(input.value, 0, 99);
        if (key === 'sustain') {
          this.envelope.steps.forEach(x => x.sustain = false);
          if (i < this.envelope.endStep) s.sustain = input.checked;
        }
        if (key === 'end') {
          this.envelope.endStep = i + 1;
          this.envelope.steps.forEach((x, j) => { if (j >= this.envelope.endStep) x.sustain = false; });
        }
        this.changed();
      }));
      div.append(row);
    }
    return div;
  }

  xy(i, step) {
    // X visually represents cumulative time. Rate 99 => short segment; Rate 0 => long.
    const usable = this.width - this.pad.l - this.pad.r;
    const weights = this.envelope.steps.slice(0, this.envelope.endStep).map(s => 1 + (99 - s.rate) / 28);
    const total = weights.reduce((a,b) => a+b, 0);
    const cumulative = weights.slice(0, i + 1).reduce((a,b) => a+b, 0);
    return { x: this.pad.l + usable * cumulative / total, y: this.levelToY(step.level) };
  }

  levelToY(level) {
    const h = this.height - this.pad.t - this.pad.b;
    return this.pad.t + h * (1 - level / 99);
  }

  pointerDown(e, i) {
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    this.drag = { i, pointerId: e.pointerId, startX: e.clientX, startRate: this.envelope.steps[i].rate };
  }

  pointerMove(e) {
    if (!this.drag || e.pointerId !== this.drag.pointerId) return;
    const rect = this.svg.getBoundingClientRect();
    const localY = (e.clientY - rect.top) / rect.height * this.height;
    const h = this.height - this.pad.t - this.pad.b;
    const level = Math.round((1 - (localY - this.pad.t) / h) * 99);
    const dx = e.clientX - this.drag.startX;
    // Right = slower (smaller rate), left = faster (larger rate), mirroring longer/shorter segment.
    const rate = Math.round(this.drag.startRate - dx / 2);
    const step = this.envelope.steps[this.drag.i];
    step.level = clamp(level, 0, 99);
    step.rate = clamp(rate, 0, 99);
    this.render();
  }

  pointerUp(e) {
    if (!this.drag || e.pointerId !== this.drag.pointerId) return;
    this.drag = null;
    this.changed();
  }

  changed() {
    this.onChange?.(this.envelope);
    this.render();
  }
}
