import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pdSample, PreviewEnvelope, PreviewVoice } from '../src/preview-dsp.js';

const sampleRate = 48000;
const envelope = (level = 99, sustain = true, rate = 99) => ({
  endStep: 2,
  steps: [{ level, rate, sustain }, { level: 0, rate, sustain: false }]
});
const config = () => ({
  note: 60, octave: 0, wave: 1,
  enabled: { dco: true, dcw: true, dca: true },
  envelopes: { dco: envelope(0), dcw: envelope(99), dca: envelope(99) }
});
const render = (voice, seconds) => Float32Array.from({ length: Math.round(seconds * sampleRate) }, () => voice.next());

test('both PD mappings reduce to a sine at zero depth and add harmonics at high depth', () => {
  for (const wave of [1, 2]) {
    let difference = 0;
    for (let i = 0; i < 512; i++) {
      const phase = i / 512;
      assert.ok(Math.abs(pdSample(phase, 0, wave) - Math.cos(2 * Math.PI * phase)) < 1e-10);
      difference += Math.abs(pdSample(phase, 1, wave) - pdSample(phase, 0, wave));
      assert.ok(Math.abs(pdSample(phase, 1, wave)) <= 1);
    }
    assert.ok(difference > 50);
  }
  assert.ok(pdSample(0.15, 1, 2) > 0.99); // Square plateau.
  assert.ok(pdSample(0.65, 1, 2) < -0.99);
});

test('sustain waits for release; release reaches zero even if END has a nonzero stored level', () => {
  const definition = envelope(75);
  definition.steps[1].level = 99;
  const env = new PreviewEnvelope(definition, sampleRate);
  for (let i = 0; i < sampleRate; i++) env.next();
  assert.ok(Math.abs(env.value - 75 / 99) < 1e-8);
  assert.equal(env.done, false);
  env.release();
  for (let i = 0; i < sampleRate / 10; i++) env.next();
  assert.equal(env.done, true);
  assert.equal(env.value, 0);
});

test('higher Rate reaches a level faster; without sustain the envelope completes while held', () => {
  const slow = new PreviewEnvelope(envelope(99, true, 0), sampleRate);
  const fast = new PreviewEnvelope(envelope(99, true, 99), sampleRate);
  for (let i = 0; i < sampleRate / 10; i++) { slow.next(); fast.next(); }
  assert.ok(fast.value > slow.value + 0.8);
  const free = new PreviewEnvelope(envelope(99, false), sampleRate);
  for (let i = 0; i < sampleRate / 10; i++) free.next();
  assert.equal(free.done, true);
});

test('live sustain edits apply and removing sustain resumes the envelope', () => {
  const env = new PreviewEnvelope(envelope(99), sampleRate);
  for (let i = 0; i < sampleRate / 10; i++) env.next();
  env.setDefinition(envelope(40));
  for (let i = 0; i < sampleRate / 10; i++) env.next();
  assert.ok(Math.abs(env.value - 40 / 99) < 1e-8);
  env.setDefinition(envelope(40, false));
  for (let i = 0; i < sampleRate / 10; i++) env.next();
  assert.equal(env.done, true);
});

test('voice produces finite bounded sound, DCA release and emergency stop produce silence', () => {
  const voice = new PreviewVoice(config(), sampleRate);
  const audio = render(voice, 0.1);
  assert.ok(audio.some(sample => Math.abs(sample) > 0.5));
  assert.ok(audio.every(sample => Number.isFinite(sample) && Math.abs(sample) <= 1));
  voice.release();
  render(voice, 0.1);
  assert.equal(voice.finished, true);
  assert.equal(voice.next(), 0);
  const stopped = new PreviewVoice(config(), sampleRate);
  render(stopped, 0.1);
  stopped.stop();
  render(stopped, 0.1);
  assert.equal(stopped.next(), 0);
});

test('DCA bypass still releases, and octave transposition doubles oscillator frequency', () => {
  const definition = config();
  definition.enabled.dca = false;
  definition.octave = 1;
  const voice = new PreviewVoice(definition, sampleRate);
  assert.ok(Math.abs(voice.frequency - 523.251) < 0.001);
  render(voice, 0.1);
  voice.release();
  render(voice, 0.1);
  assert.equal(voice.finished, true);
});
