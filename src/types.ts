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
  /**
   * Keyboard shortcut that toggles comment mode. Defaults to `"c"`.
   *
   * Format: `+`-separated, last token is the key. Modifiers: `Mod` (Cmd on
   * macOS, Ctrl elsewhere), `Cmd`, `Ctrl`, `Alt` / `Option`, `Shift`, `Meta`.
   * Examples: `"c"`, `"Mod+Shift+M"`, `"Alt+M"`. Pass `false` to disable.
   *
   * Single-key shortcuts are automatically suppressed while focus is in an
   * input, textarea, select, or contenteditable element. Modifier-bearing
   * shortcuts always fire.
   */
  shortcut?: string | false;
}

export interface Instance {
  unmount(): void;
  getComments(): Comment[];
  exportMarkdown(): string;
}
