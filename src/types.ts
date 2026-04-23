export interface Comment {
  id: string;
  selector: string;
  tag: string;
  snippet: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  /**
   * ARIA-related attributes captured from the element at comment-creation
   * time (e.g. `role`, `aria-label`). Optional for backward-compat.
   */
  attrs?: Record<string, string>;
}

export interface MountOptions {
  storageKey?: string;
  root?: HTMLElement;
  side?: "right" | "left";
}

export interface Instance {
  unmount(): void;
  getComments(): Comment[];
  exportMarkdown(): string;
}
