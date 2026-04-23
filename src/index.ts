import { CommentStore } from "./storage.js";
import { buildSelector, resolveSelector } from "./selector.js";
import { toMarkdown } from "./markdown.js";
import type { Comment, Instance, MountOptions } from "./types.js";

import { createOverlay } from "./ui/overlay.js";
import { createToolbar } from "./ui/toolbar.js";
import { createCards, type CardEntry } from "./ui/cards.js";
import { createComposer } from "./ui/composer.js";
import { createMarker, type Marker } from "./ui/marker.js";
import { createPump } from "./ui/positioning.js";
import { startPicker, type PickerSession } from "./ui/picker.js";

export type { Comment, Instance, MountOptions };
export { toMarkdown };

const SNIPPET_MAX = 80;
const HIGHLIGHT_DURATION_MS = 900;

export function mount(options: MountOptions = {}): Instance {
  if (typeof document === "undefined") {
    throw new Error("dom-critique requires a browser environment");
  }

  const root = options.root ?? document.body;
  const side = options.side ?? "right";
  const storageKey = options.storageKey ?? `dom-critique:${location.pathname}`;

  const store = new CommentStore(storageKey);
  const overlay = createOverlay(side);

  // Per-comment marker state.
  const markers = new Map<string, { marker: Marker; target: Element | null }>();

  // Composer state.
  let composerTarget: Element | null = null;
  let pickerSession: PickerSession | null = null;
  // Sticky intent: while true, after the composer closes the picker re-arms
  // automatically so the user can comment on multiple elements in a row.
  let commentMode = false;
  let activeId: string | null = null;
  let highlightRaf = 0;

  const composer = createComposer(overlay.layer);

  const cards = createCards(overlay.layer, {
    side,
    onJump: (id) => focusComment(id, { scroll: true }),
    onEdit: (id) => beginEdit(id),
    onDelete: (id) => store.remove(id),
  });

  const toolbar = createToolbar(overlay.layer, {
    onToggleMode: () => setCommentMode(!commentMode),
    onCopyMarkdown: async () => {
      const md = exportMarkdown();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(md);
      } else {
        legacyCopy(md);
      }
    },
  });

  const targetHighlight = document.createElement("div");
  targetHighlight.className = "target-highlight";
  overlay.layer.appendChild(targetHighlight);

  const pump = createPump(root, () => {
    repositionAll();
  });

  function setCommentMode(on: boolean) {
    commentMode = on;
    toolbar.setActive(on);
    if (!on) {
      stopPicker();
      return;
    }
    if (!composer.isOpen()) startPickerSession();
  }

  function startPickerSession() {
    if (pickerSession) return;
    pickerSession = startPicker({
      root,
      overlayHost: overlay.host,
      onPick: (el) => {
        pickerSession = null;
        beginNew(el);
      },
      onCancel: () => {
        // Esc inside the picker fully exits comment mode.
        pickerSession = null;
        setCommentMode(false);
      },
    });
  }

  function stopPicker() {
    if (!pickerSession) return;
    pickerSession.stop();
    pickerSession = null;
  }

  function afterComposerClosed() {
    composerTarget = null;
    if (commentMode) startPickerSession();
  }

  function beginNew(el: Element) {
    let selector: string;
    try {
      selector = buildSelector(el);
    } catch {
      return;
    }
    const tag = el.tagName.toLowerCase();
    const snippet = makeSnippet(el);
    composerTarget = el;
    composer.open({
      anchor: el,
      selector,
      onSave: (body) => {
        const created = store.add({ selector, tag, snippet, body });
        focusComment(created.id, { scroll: false });
        afterComposerClosed();
      },
      onCancel: afterComposerClosed,
    });
  }

  function beginEdit(id: string) {
    const comment = store.getAll().find((c) => c.id === id);
    if (!comment) return;
    // Pause picking while the user types into the composer.
    stopPicker();
    const target = resolveSelector(comment.selector) ?? markers.get(id)?.target ?? null;
    const anchor: Element = target ?? toolbar.toggleEl;
    composerTarget = anchor;
    composer.open({
      anchor,
      selector: comment.selector,
      initialBody: comment.body,
      onSave: (body) => {
        store.update(id, { body });
        afterComposerClosed();
      },
      onCancel: afterComposerClosed,
    });
  }

  function focusComment(id: string, opts: { scroll: boolean }) {
    activeId = id;
    cards.setActive(id);
    const m = markers.get(id);
    if (!m || !m.target) return;
    if (opts.scroll) {
      m.target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    m.marker.pulse();
    showTargetHighlight(m.target);
  }

  function showTargetHighlight(target: Element) {
    if (highlightRaf) cancelAnimationFrame(highlightRaf);

    const positionTo = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return false;
      targetHighlight.style.top = `${r.top}px`;
      targetHighlight.style.left = `${r.left}px`;
      targetHighlight.style.width = `${r.width}px`;
      targetHighlight.style.height = `${r.height}px`;
      return true;
    };

    if (!positionTo(target)) return;
    targetHighlight.classList.add("visible");

    // Track the target every frame so the highlight follows smooth-scroll
    // animations and any other layout shifts.
    const start = performance.now();
    const tick = (now: number) => {
      if (!document.contains(target)) {
        targetHighlight.classList.remove("visible");
        highlightRaf = 0;
        return;
      }
      positionTo(target);
      if (now - start >= HIGHLIGHT_DURATION_MS) {
        targetHighlight.classList.remove("visible");
        highlightRaf = 0;
        return;
      }
      highlightRaf = requestAnimationFrame(tick);
    };
    highlightRaf = requestAnimationFrame(tick);
  }

  function syncFromStore(comments: Comment[]) {
    const seen = new Set<string>();
    const cardEntries: CardEntry[] = [];

    comments.forEach((c, index) => {
      seen.add(c.id);
      const target = resolveSelector(c.selector);
      const missing = !target;

      let entry = markers.get(c.id);
      if (!entry) {
        const marker = createMarker(overlay.layer, {
          index: index + 1,
          onClick: () => focusComment(c.id, { scroll: true }),
        });
        entry = { marker, target: null };
        markers.set(c.id, entry);
      }
      entry.target = target;
      entry.marker.setIndex(index + 1);
      entry.marker.setMissing(missing);
      entry.marker.positionTo(target);

      cardEntries.push({ comment: c, target });
    });

    for (const [id, entry] of markers) {
      if (!seen.has(id)) {
        entry.marker.destroy();
        markers.delete(id);
      }
    }

    cards.setEntries(cardEntries);
    toolbar.setCommentCount(comments.length);

    if (activeId && !seen.has(activeId)) {
      activeId = null;
      cards.setActive(null);
    }
  }

  function repositionAll() {
    for (const [, entry] of markers) {
      entry.marker.positionTo(entry.target);
    }
    cards.layout();
    if (composer.isOpen() && composerTarget) {
      composer.reposition();
    }
  }

  function exportMarkdown(): string {
    return toMarkdown(store.getAll());
  }

  syncFromStore(store.getAll());
  const unsubscribe = store.subscribe((comments) => {
    syncFromStore(comments);
    repositionAll();
  });

  return {
    unmount() {
      setCommentMode(false);
      composer.close();
      composer.destroy();
      for (const [, entry] of markers) entry.marker.destroy();
      markers.clear();
      cards.destroy();
      toolbar.destroy();
      pump.destroy();
      unsubscribe();
      if (highlightRaf) cancelAnimationFrame(highlightRaf);
      overlay.destroy();
    },
    getComments() {
      return store.getAll();
    },
    exportMarkdown,
  };
}

function makeSnippet(el: Element): string {
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!text) {
    if (el instanceof HTMLImageElement && el.alt) return `[image: ${el.alt}]`;
    if (el instanceof HTMLInputElement && el.placeholder) return `[input: ${el.placeholder}]`;
    return "";
  }
  if (text.length <= SNIPPET_MAX) return text;
  return text.slice(0, SNIPPET_MAX - 1).trimEnd() + "…";
}

function legacyCopy(text: string): void {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } finally {
    ta.remove();
  }
}
