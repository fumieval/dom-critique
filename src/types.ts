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
  /**
   * React fiber introspection captured at comment-creation time, when the
   * picked element is rendered by a React app and the bundle exposes
   * `_debug*` fiber metadata.
   */
  react?: {
    /** Owner component chain, root → leaf. */
    stack: string[];
    /** Source file/line of the JSX call site, when available. */
    source?: { fileName: string; lineNumber: number; columnNumber?: number };
  };
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
