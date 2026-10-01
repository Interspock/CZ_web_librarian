const snapshot = patch => structuredClone(patch);

function signature(patch) {
  const copy = snapshot(patch);
  if (copy.meta) delete copy.meta.updatedAt;
  return JSON.stringify(copy);
}

// Session-only editing history. No extra keys enter patch JSON or storage.
export class PatchHistory {
  constructor(patch, limit = 100) {
    this.limit = limit;
    this.last = snapshot(patch);
    this.undoStack = [];
    this.redoStack = [];
    this.reference = null;
    this.view = 'B';
    this.breakGroup();
  }

  breakGroup() { this.group = null; this.groupAt = 0; }

  record(patch, group = null, now = Date.now()) {
    if (signature(patch) === signature(this.last)) return false;
    if (!group || group !== this.group || now - this.groupAt > 1000) {
      this.undoStack.push(this.last);
      if (this.undoStack.length > this.limit) this.undoStack.shift();
    }
    this.last = snapshot(patch);
    this.redoStack = [];
    this.group = group;
    this.groupAt = now;
    return true;
  }

  undo() {
    if (this.view !== 'B' || !this.undoStack.length) return null;
    this.redoStack.push(this.last);
    this.last = this.undoStack.pop();
    this.breakGroup();
    return snapshot(this.last);
  }

  redo() {
    if (this.view !== 'B' || !this.redoStack.length) return null;
    this.undoStack.push(this.last);
    this.last = this.redoStack.pop();
    this.breakGroup();
    return snapshot(this.last);
  }

  capture(patch) {
    this.reference = snapshot(patch);
    this.breakGroup();
  }

  select(view) {
    if (!['A', 'B'].includes(view)) return false;
    if (view === 'A' && !this.reference) return false;
    this.view = view;
    this.breakGroup();
    return true;
  }

  current(working) { return this.view === 'A' ? this.reference : working; }
}
