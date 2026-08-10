import { createPatch, normalizePatch } from './patch-model.js';

const KEY = 'cz101-librarian-v1';

export class PatchStore {
  constructor() {
    this.state = this.load();
  }

  load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw?.patches?.length) {
        return {
          patches: raw.patches.map(normalizePatch),
          selectedId: raw.selectedId || raw.patches[0].id
        };
      }
    } catch (e) {
      console.warn('Could not read CZ library', e);
    }
    const p = createPatch('INIT PATCH');
    return { patches: [p], selectedId: p.id };
  }

  persist() {
    localStorage.setItem(KEY, JSON.stringify(this.state));
  }

  selected() {
    return this.state.patches.find(p => p.id === this.state.selectedId) || this.state.patches[0];
  }

  select(id) { this.state.selectedId = id; this.persist(); }

  add(patch = createPatch()) {
    const p = normalizePatch(patch);
    this.state.patches.push(p);
    this.state.selectedId = p.id;
    this.persist();
    return p;
  }

  duplicate() {
    const copy = structuredClone(this.selected());
    copy.id = crypto.randomUUID();
    copy.name = `${copy.name} COPY`;
    copy.meta.createdAt = copy.meta.updatedAt = new Date().toISOString();
    return this.add(copy);
  }

  remove(id) {
    if (this.state.patches.length === 1) return false;
    const idx = this.state.patches.findIndex(p => p.id === id);
    if (idx < 0) return false;
    this.state.patches.splice(idx, 1);
    this.state.selectedId = this.state.patches[Math.max(0, idx - 1)].id;
    this.persist();
    return true;
  }

  touch() {
    const p = this.selected();
    p.meta.updatedAt = new Date().toISOString();
    this.persist();
  }

  exportLibrary() {
    return JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), patches: this.state.patches }, null, 2);
  }

  importLibrary(data) {
    const src = Array.isArray(data) ? data : data?.patches;
    if (!Array.isArray(src) || !src.length) throw new Error('JSON does not contain a patches array');
    this.state.patches = src.map(normalizePatch);
    this.state.selectedId = this.state.patches[0].id;
    this.persist();
  }
}
