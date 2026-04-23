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
  let activeId: string | null = null;
  let highlightTimer: number | undefined;

  const composer = createComposer(overlay.layer);

  const cards = createCards(overlay.layer, {
    side,
    onJump: (id) => focusComment(id, { scroll: true }),
    onEdit: (id) => beginEdit(id),
    onDelete: (id) => store.remove(id),
  });

  const toolbar = createToolbar(overlay.layer, {
    onToggleMode: () => {
      if (pickerSession) stopPicker();
      else startPickerMode();
    },
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

  function startPickerMode() {
    composer.close();
    composerTarget = null;
    toolbar.setActive(true);
    pickerSession = startPicker({
      root,
      overlayHost: overlay.host,
      onPick: (el) => {
        pickerSession = null;
        toolbar.setActive(false);
        beginNew(el);
      },
      onCancel: () => {
        pickerSession = null;
        toolbar.setActive(false);
      },
    });
  }

  function stopPicker() {
    if (!pickerSession) return;
    pickerSession.stop();
    pickerSession = null;
    toolbar.setActive(false);
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
        composerTarget = null;
        const created = store.add({ selector, tag, snippet, body });
        focusComment(created.id, { scroll: false });
      },
      onCancel: () => {
        composerTarget = null;
      },
    });
  }

  function beginEdit(id: string) {
    const comment = store.getAll().find((c) => c.id === id);
    if (!comment) return;
    const target = resolveSelector(comment.selector) ?? markers.get(id)?.target ?? null;
    const anchor: Element = target ?? toolbar.toggleEl;
    composerTarget = anchor;
    composer.open({
      anchor,
      selector: comment.selector,
      initialBody: comment.body,
      onSave: (body) => {
        composerTarget = null;
        store.update(id, { body });
      },
      onCancel: () => {
        composerTarget = null;
      },
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
    const rect = target.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    targetHighlight.style.top = `${rect.top}px`;
    targetHighlight.style.left = `${rect.left}px`;
    targetHighlight.style.width = `${rect.width}px`;
    targetHighlight.style.height = `${rect.height}px`;
    targetHighlight.classList.add("visible");
    if (highlightTimer) window.clearTimeout(highlightTimer);
    highlightTimer = window.setTimeout(() => {
      targetHighlight.classList.remove("visible");
    }, HIGHLIGHT_DURATION_MS);
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
      stopPicker();
      composer.close();
      composer.destroy();
      for (const [, entry] of markers) entry.marker.destroy();
      markers.clear();
      cards.destroy();
      toolbar.destroy();
      pump.destroy();
      unsubscribe();
      if (highlightTimer) window.clearTimeout(highlightTimer);
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
