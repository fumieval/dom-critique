import { CommentStore } from "./storage.js";
import { buildSelector, collectAriaAttrs, resolveSelector } from "./selector.js";
import { getReactInfo } from "./react.js";
import { toMarkdown } from "./markdown.js";
import type { Comment, Instance, MountOptions } from "./types.js";

import { createOverlay } from "./ui/overlay.js";
import { createToolbar } from "./ui/toolbar.js";
import { createCards, type CardEntry } from "./ui/cards.js";
import { createComposer } from "./ui/composer.js";
import { createMarker, type Marker } from "./ui/marker.js";
import { createPump } from "./ui/positioning.js";
import { startPicker, type PickerSession } from "./ui/picker.js";
import { createPinOverlay } from "./ui/pin.js";
import { createConnectors } from "./ui/connectors.js";
import {
  formatShortcut,
  isEditableTarget,
  matchShortcut,
  parseShortcut,
  shortcutHasModifier,
} from "./shortcut.js";

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
  const shortcutSpec = options.shortcut === undefined ? "c" : options.shortcut;
  const parsedShortcut =
    shortcutSpec === false ? null : parseShortcut(shortcutSpec);
  const shortcutNeedsTypingGuard =
    parsedShortcut != null && !shortcutHasModifier(parsedShortcut);

  const store = new CommentStore(storageKey);
  const overlay = createOverlay(side);

  const markers = new Map<string, { marker: Marker; target: Element | null }>();

  let composerTarget: Element | null = null;
  let editingId: string | null = null;
  let pickerSession: PickerSession | null = null;
  // Sticky intent: while true, after the composer closes the picker re-arms
  // automatically so the user can comment on multiple elements in a row.
  let commentMode = false;
  let activeId: string | null = null;
  // Highlight state — supports a "hold" target (while hovering a card/marker)
  // and a "pulse" target (auto-expiring, used after click). Hold takes
  // precedence when both are active.
  let hoverTarget: Element | null = null;
  let hoveredId: string | null = null;
  let focusedId: string | null = null;
  let pulseTarget: Element | null = null;
  let pulseExpiresAt = 0;
  let highlightRaf = 0;

  const cards = createCards(overlay.layer, {
    side,
    onJump: (id) => focusComment(id, { scroll: true }),
    onEdit: (id) => beginEdit(id),
    onDelete: (id) => store.remove(id),
    onHover: (id) => {
      if (id == null) {
        setHover(null, null);
        return;
      }
      const m = markers.get(id);
      setHover(id, m?.target ?? null);
    },
    onFocus: (id) => setFocused(id),
  });

  // Composer is mounted inside the cards column so the cards layout can
  // position it as if it were a regular card.
  const composer = createComposer(cards.column);

  const pin = createPinOverlay(overlay.layer);
  const connectors = createConnectors(overlay.layer);

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
    ...(parsedShortcut ? { shortcutLabel: formatShortcut(parsedShortcut) } : {}),
  });

  const targetHighlight = document.createElement("div");
  targetHighlight.className = "target-highlight";
  overlay.layer.appendChild(targetHighlight);

  const pump = createPump(root, () => {
    repositionAll();
  });

  function onKeyDown(e: KeyboardEvent) {
    if (!parsedShortcut) return;
    if (e.defaultPrevented || e.repeat) return;
    if (!matchShortcut(e, parsedShortcut)) return;
    if (shortcutNeedsTypingGuard && isEditableTarget(e.target)) return;
    e.preventDefault();
    setCommentMode(!commentMode);
  }
  if (parsedShortcut) {
    document.addEventListener("keydown", onKeyDown);
  }

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

  function openComposerFor(target: Element, opts: {
    selector: string;
    initialBody?: string;
    onSave: (body: string) => void;
    hideCommentId?: string;
  }) {
    composerTarget = target;
    editingId = opts.hideCommentId ?? null;

    composer.open({
      selector: opts.selector,
      initialBody: opts.initialBody,
      onSave: (body) => {
        opts.onSave(body);
        afterComposerClosed();
      },
      onCancel: afterComposerClosed,
    });

    // Register the composer in the cards layout (reserves a slot, hides the
    // corresponding card during edit).
    const r = target.getBoundingClientRect();
    cards.setComposerSlot({
      el: composer.el,
      targetMidpoint: r.top + r.height / 2,
      ...(opts.hideCommentId ? { hideCommentId: opts.hideCommentId } : {}),
    });

    pin.show(target);
    pin.update(target);
  }

  function afterComposerClosed() {
    composerTarget = null;
    editingId = null;
    cards.setComposerSlot(null);
    pin.hide();
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
    const attrs = collectAriaAttrs(el);
    const react = getReactInfo(el);
    openComposerFor(el, {
      selector,
      onSave: (body) => {
        const created = store.add({
          selector,
          tag,
          snippet,
          body,
          attrs,
          ...(react ? { react } : {}),
        });
        focusComment(created.id, { scroll: false });
      },
    });
  }

  function beginEdit(id: string) {
    const comment = store.getAll().find((c) => c.id === id);
    if (!comment) return;
    stopPicker();
    const target = resolveSelector(comment.selector) ?? markers.get(id)?.target ?? null;
    // Anchor in the page when available; fall back to the toolbar's button so
    // the composer still has somewhere to anchor visually.
    const anchor: Element = target ?? toolbar.toggleEl;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    openComposerFor(anchor, {
      selector: comment.selector,
      initialBody: comment.body,
      hideCommentId: id,
      onSave: (body) => {
        store.update(id, { body });
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
    pulseTargetHighlight(m.target);
  }

  function positionHighlightTo(el: Element): boolean {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    targetHighlight.style.top = `${r.top}px`;
    targetHighlight.style.left = `${r.left}px`;
    targetHighlight.style.width = `${r.width}px`;
    targetHighlight.style.height = `${r.height}px`;
    return true;
  }

  function ensureHighlightLoop() {
    if (highlightRaf) return;
    highlightRaf = requestAnimationFrame(refreshHighlight);
  }

  function refreshHighlight(now: number) {
    let target: Element | null = null;
    if (hoverTarget && document.contains(hoverTarget)) {
      target = hoverTarget;
    } else if (
      pulseTarget &&
      now < pulseExpiresAt &&
      document.contains(pulseTarget)
    ) {
      target = pulseTarget;
    } else if (pulseTarget && now >= pulseExpiresAt) {
      pulseTarget = null;
    }

    if (!target || !positionHighlightTo(target)) {
      targetHighlight.classList.remove("visible");
      // Keep ticking only while there's still a reason to.
      if (hoverTarget || (pulseTarget && now < pulseExpiresAt)) {
        highlightRaf = requestAnimationFrame(refreshHighlight);
      } else {
        highlightRaf = 0;
      }
      return;
    }

    targetHighlight.classList.add("visible");
    highlightRaf = requestAnimationFrame(refreshHighlight);
  }

  function setHover(id: string | null, target: Element | null) {
    hoveredId = id;
    hoverTarget = target;
    ensureHighlightLoop();
    updateConnectors();
  }

  function setFocused(id: string | null) {
    if (focusedId === id) return;
    focusedId = id;
    updateConnectors();
  }

  function pulseTargetHighlight(target: Element) {
    pulseTarget = target;
    pulseExpiresAt = performance.now() + HIGHLIGHT_DURATION_MS;
    ensureHighlightLoop();
  }

  function syncFromStore(comments: Comment[]) {
    const seen = new Set<string>();
    const cardEntries: CardEntry[] = [];

    comments.forEach((c) => {
      seen.add(c.id);
      const target = resolveSelector(c.selector);
      const missing = !target;

      let entry = markers.get(c.id);
      if (!entry) {
        const marker = createMarker(overlay.layer, {
          side,
          onClick: () => focusComment(c.id, { scroll: true }),
          onHover: (hovering) => {
            if (!hovering) {
              setHover(null, null);
              return;
            }
            const e = markers.get(c.id);
            setHover(c.id, e?.target ?? null);
          },
          onFocus: (focused) => setFocused(focused ? c.id : null),
        });
        entry = { marker, target: null };
        markers.set(c.id, entry);
      }
      entry.target = target;
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
    connectors.syncIds(seen);

    if (activeId && !seen.has(activeId)) {
      activeId = null;
      cards.setActive(null);
    }
  }

  function repositionAll() {
    for (const [, entry] of markers) {
      entry.marker.positionTo(entry.target);
    }
    if (composer.isOpen() && composerTarget) {
      // Refresh the composer's slot so it follows the target as the page
      // scrolls; setComposerSlot triggers a relayout.
      const r = composerTarget.getBoundingClientRect();
      cards.setComposerSlot({
        el: composer.el,
        targetMidpoint: r.top + r.height / 2,
        ...(editingId ? { hideCommentId: editingId } : {}),
      });
      pin.update(composerTarget);
    } else {
      cards.layout();
    }
    updateConnectors();
  }

  function updateConnectors() {
    const composerOpen = composer.isOpen();

    // Show a connector line only for the comments the user is currently
    // hovering or has keyboard-focused, plus the comment whose composer is
    // open. Everything else gets removed.
    const visibleIds = new Set<string>();
    if (composerOpen && editingId) visibleIds.add(editingId);
    if (hoveredId) visibleIds.add(hoveredId);
    if (focusedId) visibleIds.add(focusedId);

    if (visibleIds.size === 0) {
      connectors.syncIds(visibleIds);
      return;
    }

    // Anchor card endpoints to the card column's *current* viewport rect
    // (the column itself is `position: fixed`, so this is stable / not
    // transitioning) and use the cards' intended layout `top` rather than
    // their animated `getBoundingClientRect()`. Otherwise the lines visibly
    // lag behind the cards during scroll because the cards have a CSS
    // transition on `top`.
    const columnRect = cards.column.getBoundingClientRect();
    const columnEdgeX = side === "right" ? columnRect.left : columnRect.right;

    function endpointFor(el: HTMLElement): { x: number; y: number } {
      const top = parseFloat(el.style.top);
      const intendedTop = Number.isFinite(top) ? top : el.offsetTop;
      const h = el.offsetHeight || 0;
      return { x: columnEdgeX, y: columnRect.top + intendedTop + h / 2 };
    }

    for (const id of visibleIds) {
      const entry = markers.get(id);
      if (!entry || !entry.target) {
        connectors.remove(id);
        continue;
      }
      const t = entry.target.getBoundingClientRect();
      if (t.width === 0 && t.height === 0) {
        connectors.remove(id);
        continue;
      }
      const fromX = side === "right" ? t.right : t.left;
      const fromY = t.top + t.height / 2;

      let toEl: HTMLElement | null = null;
      let emphasized = false;
      if (composerOpen && editingId === id) {
        toEl = composer.el;
        emphasized = true;
      } else {
        toEl = cards.getCardElement(id);
      }

      if (!toEl || toEl.offsetHeight === 0) {
        connectors.remove(id);
        continue;
      }

      const to = endpointFor(toEl);
      connectors.set(id, { x1: fromX, y1: fromY, x2: to.x, y2: to.y, emphasized });
    }

    connectors.syncIds(visibleIds);
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
      pin.destroy();
      connectors.destroy();
      for (const [, entry] of markers) entry.marker.destroy();
      markers.clear();
      cards.destroy();
      toolbar.destroy();
      pump.destroy();
      unsubscribe();
      if (parsedShortcut) document.removeEventListener("keydown", onKeyDown);
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
