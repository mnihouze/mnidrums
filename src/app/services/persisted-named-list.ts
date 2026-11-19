/**
 * An ordered list of named items persisted to localStorage. Storage failures
 * (private mode, blocked storage, corrupt data) are ignored: the list then
 * lives only in memory for the session.
 */
export abstract class PersistedNamedList<T extends { id: string; name: string }> {
  protected items: T[];

  constructor(
    private readonly storageKey: string,
    /** Validates (and, if needed, migrates) one stored item; null drops it. */
    private readonly parse: (value: unknown) => T | null,
    /** Prefix for default names, e.g. "Block" -> "Block 3". */
    private readonly defaultNamePrefix: string,
  ) {
    this.items = this.load();
  }

  rename(id: string, name: string): void {
    const clean = this.cleanName(name);
    if (!clean) return;
    this.replace(id, (item) => ({ ...item, name: clean }));
  }

  remove(id: string): void {
    this.items = this.items.filter((item) => item.id !== id);
    this.save();
  }

  /** Moves the item at `from` to index `to` (both clamped to the list). */
  move(from: number, to: number): void {
    const last = this.items.length - 1;
    if (from < 0 || from > last) return;
    const target = Math.min(last, Math.max(0, to));
    if (target === from) return;

    const next = [...this.items];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    this.items = next;
    this.save();
  }

  /** Appends `item`, giving it a fresh id and a default name if `name` is blank. */
  protected append(name: string, item: Omit<T, 'id' | 'name'>): T {
    const created = {
      ...item,
      id: newId(),
      name: this.cleanName(name) || this.nextDefaultName(),
    } as T;
    this.items = [...this.items, created];
    this.save();
    return created;
  }

  protected replace(id: string, fn: (item: T) => T): void {
    this.items = this.items.map((item) => (item.id === id ? fn(item) : item));
    this.save();
  }

  private cleanName(name: string): string {
    return (name ?? '').trim().slice(0, 60);
  }

  private nextDefaultName(): string {
    let n = this.items.length + 1;
    while (this.items.some((item) => item.name === `${this.defaultNamePrefix} ${n}`)) n++;
    return `${this.defaultNamePrefix} ${n}`;
  }

  private load(): T[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(this.parse).filter((item): item is T => item !== null);
    } catch {
      return [];
    }
  }

  private save(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    } catch {
      // Storage unavailable: keep the list in memory only.
    }
  }
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
