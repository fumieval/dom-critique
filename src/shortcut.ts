/**
 * Tiny keyboard-shortcut parser/matcher used to bind comment-mode toggle.
 *
 * Format: `+`-separated, last token is the key (e.g. `"c"`, `"Mod+Shift+M"`,
 * `"Alt+Option+/"`). Modifiers:
 *   - `Mod`            → Cmd on macOS, Ctrl elsewhere
 *   - `Cmd` / `Meta`   → metaKey
 *   - `Ctrl` / `Control`→ ctrlKey
 *   - `Alt` / `Option` → altKey
 *   - `Shift`          → shiftKey
 *
 * Key matching is case-insensitive against `KeyboardEvent.key`.
 */

export interface ParsedShortcut {
  key: string;
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
  /** Cross-platform modifier (Cmd on Mac, Ctrl elsewhere). */
  mod: boolean;
}

const MODIFIER_TOKENS = new Set([
  "mod",
  "cmd",
  "meta",
  "super",
  "win",
  "ctrl",
  "control",
  "alt",
  "option",
  "shift",
]);

export function parseShortcut(spec: string): ParsedShortcut | null {
  const parts = spec.split("+").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  const result: ParsedShortcut = {
    key: "",
    shift: false,
    alt: false,
    ctrl: false,
    meta: false,
    mod: false,
  };

  for (let i = 0; i < parts.length; i++) {
    const token = parts[i].toLowerCase();
    const isLast = i === parts.length - 1;
    if (isLast && !MODIFIER_TOKENS.has(token)) {
      result.key = token;
      continue;
    }
    switch (token) {
      case "mod":
        result.mod = true;
        break;
      case "cmd":
      case "meta":
      case "super":
      case "win":
        result.meta = true;
        break;
      case "ctrl":
      case "control":
        result.ctrl = true;
        break;
      case "alt":
      case "option":
        result.alt = true;
        break;
      case "shift":
        result.shift = true;
        break;
    }
  }

  if (!result.key) return null;
  return result;
}

export function shortcutHasModifier(s: ParsedShortcut): boolean {
  return s.mod || s.meta || s.ctrl || s.alt;
}

function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform = navigator.platform || "";
  if (/Mac|iPhone|iPad|iPod/.test(platform)) return true;
  // Newer Chromium reports navigator.platform = "MacIntel" but some envs hide
  // it; fall back to userAgent.
  const ua = navigator.userAgent || "";
  return /Mac OS X|iPhone|iPad|iPod/.test(ua);
}

export function matchShortcut(e: KeyboardEvent, s: ParsedShortcut): boolean {
  const isMac = isMacPlatform();
  const expectMeta = s.meta || (s.mod && isMac);
  const expectCtrl = s.ctrl || (s.mod && !isMac);
  if (e.metaKey !== expectMeta) return false;
  if (e.ctrlKey !== expectCtrl) return false;
  if (e.altKey !== s.alt) return false;
  if (e.shiftKey !== s.shift) return false;
  return e.key.toLowerCase() === s.key;
}

/**
 * Returns a human-readable label for the parsed shortcut, suitable for
 * tooltips. Uses platform-appropriate symbols on macOS.
 */
export function formatShortcut(s: ParsedShortcut): string {
  const isMac = isMacPlatform();
  const parts: string[] = [];
  if (s.mod) parts.push(isMac ? "⌘" : "Ctrl");
  if (s.meta && !s.mod) parts.push(isMac ? "⌘" : "Win");
  if (s.ctrl && !(s.mod && !isMac)) parts.push(isMac ? "⌃" : "Ctrl");
  if (s.alt) parts.push(isMac ? "⌥" : "Alt");
  if (s.shift) parts.push(isMac ? "⇧" : "Shift");
  parts.push(s.key.length === 1 ? s.key.toUpperCase() : capitalize(s.key));
  return isMac ? parts.join("") : parts.join("+");
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * Returns true when `target` is a typing surface where single-key shortcuts
 * should NOT fire (input, textarea, select, contenteditable).
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return false;
}
