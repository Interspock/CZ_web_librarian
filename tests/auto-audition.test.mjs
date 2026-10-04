import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AutoAudition } from '../src/auto-audition.js';
import { createPatch } from '../src/patch-model.js';

function setup() {
  let now = 0, next = 0;
  const timers = new Map(), sent = [];
  const patch = createPatch();
  let context = { output: { send: bytes => sent.push({ bytes: [...bytes], time: now }) }, channel: 2, patch };
  const auto = new AutoAudition({
    context: () => context,
    setTimer: (fn, delay) => { const id = ++next; timers.set(id, { fn, time: now + delay }); return id; },
    clearTimer: id => timers.delete(id)
  });
  const advance = duration => {
    const end = now + duration;
    while (true) {
      const entry = [...timers].sort((a, b) => a[1].time - b[1].time)[0];
      if (!entry || entry[1].time > end) break;
      now = entry[1].time; timers.delete(entry[0]); entry[1].fn();
    }
    now = end;
  };
  return { auto, sent, patch, advance, disconnect: () => { context = null; } };
}

test('Auto is off by default; sends temporary tone before C4 and releases after one second', () => {
  const { auto, sent, advance } = setup();
  auto.changed(); advance(2000); assert.equal(sent.length, 0);
  auto.setEnabled(true); auto.changed(); advance(150);
  assert.equal(sent[0].bytes.length, 264);
  assert.equal(sent[0].bytes[4], 0x72);
  assert.equal(sent[0].bytes[6], 0x60);
  advance(150); assert.deepEqual(sent[1].bytes, [0x92, 60, 100]);
  advance(999); assert.equal(sent.length, 2);
  advance(1); assert.deepEqual(sent[2].bytes, [0x82, 60, 0]);
  assert.equal(sent[2].time - sent[1].time, 1000);
});

test('rapid edits coalesce; retrigger releases the old note; switching off cancels work', () => {
  const { auto, sent, patch, advance } = setup();
  auto.setEnabled(true); auto.changed(); advance(100);
  patch.common.octave = 1; auto.changed(); advance(300);
  assert.equal(sent.length, 2);
  auto.changed(); assert.deepEqual(sent[2].bytes, [0x82, 60, 0]);
  advance(150); assert.equal(sent.length, 4);
  auto.setEnabled(false); advance(2000); assert.equal(sent.length, 4);
});

test('missing MIDI output skips audition and stopping releases on the original port/channel', () => {
  const { auto, sent, advance, disconnect } = setup();
  auto.setEnabled(true); auto.changed(); advance(300);
  disconnect(); auto.stop(); assert.deepEqual(sent[2].bytes, [0x82, 60, 0]);
  auto.changed(); advance(2000); assert.equal(sent.length, 3);
});


test('default timers keep the browser global receiver during startup and playback', () => {
  const originalSet = globalThis.setTimeout;
  const originalClear = globalThis.clearTimeout;
  const callbacks = [];
  const sent = [];
  try {
    globalThis.setTimeout = function(fn) {
      assert.equal(this, globalThis);
      callbacks.push(fn);
      return callbacks.length;
    };
    globalThis.clearTimeout = function() { assert.equal(this, globalThis); };
    const auto = new AutoAudition({
      context: () => ({ output: { send: bytes => sent.push([...bytes]) }, channel: 0, patch: createPatch() })
    });
    auto.stop(); // renderPatch calls this on initial page load.
    auto.setEnabled(true);
    auto.changed();
    callbacks.shift()(); // Send patch.
    callbacks.shift()(); // Note on.
    callbacks.shift()(); // Note off.
    assert.deepEqual(sent.slice(1), [[0x90, 60, 100], [0x80, 60, 0]]);
  } finally {
    globalThis.setTimeout = originalSet;
    globalThis.clearTimeout = originalClear;
  }
});
