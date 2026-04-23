import type { Comment } from "./types.js";

export class CommentStore {
  private cache: Comment[] = [];
  private listeners = new Set<(comments: Comment[]) => void>();

  constructor(private readonly key: string) {
    this.cache = this.read();
  }

  private read(): Comment[] {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isComment);
    } catch {
      return [];
    }
  }

  private write(): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.cache));
    } catch {
      // localStorage may be disabled or full; swallow.
    }
  }

  private emit(): void {
    const snapshot = this.getAll();
    for (const fn of this.listeners) fn(snapshot);
  }

  getAll(): Comment[] {
    return this.cache.map((c) => ({ ...c }));
  }

  add(input: Omit<Comment, "id" | "createdAt" | "updatedAt">): Comment {
    const now = new Date().toISOString();
    const comment: Comment = {
      ...input,
      id: makeId(),
      createdAt: now,
      updatedAt: now,
    };
    this.cache.push(comment);
    this.write();
    this.emit();
    return { ...comment };
  }

  update(id: string, patch: Partial<Pick<Comment, "body" | "selector" | "tag" | "snippet">>): Comment | undefined {
    const idx = this.cache.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    const updated: Comment = {
      ...this.cache[idx]!,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.cache[idx] = updated;
    this.write();
    this.emit();
    return { ...updated };
  }

  remove(id: string): boolean {
    const before = this.cache.length;
    this.cache = this.cache.filter((c) => c.id !== id);
    if (this.cache.length === before) return false;
    this.write();
    this.emit();
    return true;
  }

  subscribe(fn: (comments: Comment[]) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}

function isComment(value: unknown): value is Comment {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (
    typeof v.id !== "string" ||
    typeof v.selector !== "string" ||
    typeof v.tag !== "string" ||
    typeof v.snippet !== "string" ||
    typeof v.body !== "string" ||
    typeof v.createdAt !== "string" ||
    typeof v.updatedAt !== "string"
  ) {
    return false;
  }
  if (v.attrs !== undefined) {
    if (!v.attrs || typeof v.attrs !== "object") return false;
    for (const val of Object.values(v.attrs as Record<string, unknown>)) {
      if (typeof val !== "string") return false;
    }
  }
  if (v.react !== undefined) {
    if (!v.react || typeof v.react !== "object") return false;
    const r = v.react as Record<string, unknown>;
    if (!Array.isArray(r.stack) || r.stack.some((s) => typeof s !== "string")) return false;
    if (r.source !== undefined) {
      if (!r.source || typeof r.source !== "object") return false;
      const s = r.source as Record<string, unknown>;
      if (typeof s.fileName !== "string" || typeof s.lineNumber !== "number") return false;
      if (s.columnNumber !== undefined && typeof s.columnNumber !== "number") return false;
    }
  }
  return true;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
