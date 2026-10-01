import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PatchHistory } from '../src/patch-history.js';

const patch = () => ({ id: 'test', name: 'INIT', meta: { updatedAt: 'before' }, common: { octave: 0 }, line1: { levels: [99, 50, 0] } });

test('metadata-only autosaves do not create history steps', () => {
  const p = patch();
  const history = new PatchHistory(p);
  p.meta.updatedAt = 'after';
  assert.equal(history.record(p), false);
  assert.equal(history.undo(), null);
});

test('continuous field edits group, undo restores the original, redo restores final typed value', () => {
  const p = patch();
  const history = new PatchHistory(p);
  p.name = 'I'; history.record(p, 'name:1', 10);
  p.name = 'IN'; history.record(p, 'name:1', 100);
  p.name = 'NEW'; history.record(p, 'name:1', 200);
  assert.equal(history.undoStack.length, 1);
  const restored = history.undo();
  assert.equal(restored.name, 'INIT');
  restored.line1.levels[0] = 0; // Returned patches never alias history snapshots.
  assert.equal(history.redo().line1.levels[0], 99);
  assert.equal(history.last.name, 'NEW');
});

test('parameter gestures are discrete and editing after undo discards redo', () => {
  const p = patch();
  const history = new PatchHistory(p);
  p.common.octave = 1; history.record(p);
  p.line1.levels[1] = 80; history.record(p);
  const restored = history.undo();
  assert.equal(restored.line1.levels[1], 50);
  assert.equal(restored.common.octave, 1);
  restored.line1.levels[1] = 20; history.record(restored);
  assert.equal(history.redo(), null);
  assert.equal(history.undo().line1.levels[1], 50);
});

test('reference A is independent of working edits and never replaces B', () => {
  const p = patch();
  const history = new PatchHistory(p);
  assert.equal(history.select('A'), false);
  history.capture(p);
  p.line1.levels[1] = 70;
  history.record(p);
  assert.equal(history.select('A'), true);
  assert.equal(history.current(p).line1.levels[1], 50);
  assert.equal(history.undo(), null);
  history.select('B');
  assert.equal(history.current(p).line1.levels[1], 70);
  history.capture(p);
  assert.equal(history.reference.line1.levels[1], 70);
  assert.equal('reference' in p, false);
});

test('history cap bounds memory, and destination edits are fully reversible', () => {
  const p = patch();
  const history = new PatchHistory(p, 3);
  for (let n = 1; n <= 5; n++) { p.meta.internalDestination = n; history.record(p); }
  assert.equal(history.undoStack.length, 3);
  assert.equal(history.undo().meta.internalDestination, 4);
  history.undo();
  assert.equal(history.undo().meta.internalDestination, 2);
  assert.equal(history.undo(), null);
  assert.equal(history.redo().meta.internalDestination, 3);
});
