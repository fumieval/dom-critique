import type { Comment } from "../types.js";
import { makeInteractive } from "./overlay.js";

const CARD_GAP = 8;
const COLUMN_MARGIN = 16;

export interface CardEntry {
  comment: Comment;
  target: Element | null;
}

export interface CardsOptions {
  side: "right" | "left";
  onJump: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  /**
   * Fired when the cursor enters a card (`id`) and again with `null` when it
   * leaves. Useful for showing a hover highlight on the linked element.
   */
  onHover?: (id: string | null) => void;
  /**
   * Fired when keyboard focus enters a card or one of its descendants (`id`)
   * and again with `null` when focus leaves it.
   */
  onFocus?: (id: string | null) => void;
}

export interface ComposerSlot {
  /** The composer DOM element; must be (or become) a child of `column`. */
  el: HTMLElement;
  /**
   * Viewport-relative Y of the target's vertical midpoint. The layout will
   * try to center the composer on this Y (best-effort, subject to stacking).
   */
  targetMidpoint: number;
  /** When set, the corresponding card is hidden (used during editing). */
  hideCommentId?: string;
}

export interface Cards {
  /** The column root. Use it as the parent for the composer element. */
  column: HTMLDivElement;
  /** Replace the full set of cards (creates / removes as needed). */
  setEntries(entries: CardEntry[]): void;
  /** Mark a card as active (for visual emphasis). */
  setActive(id: string | null): void;
  /**
   * Register (or clear) the composer's slot in the layout so regular cards
   * stack around it. Pass `null` when the composer is closed.
   */
  setComposerSlot(slot: ComposerSlot | null): void;
  /** Re-run vertical layout based on current target rects. */
  layout(): void;
  /**
   * Returns the rendered card element for the given comment id, or `null`
   * if no card is mounted (e.g. the comment is currently being edited and
   * its card is hidden).
   */
  getCardElement(id: string): HTMLElement | null;
  destroy(): void;
}

interface CardNode {
  el: HTMLDivElement;
  bodyEl: HTMLDivElement;
  tagEl: HTMLSpanElement;
  cleanup: () => void;
}

export function createCards(parent: HTMLElement, opts: CardsOptions): Cards {
  const root = document.createElement("div");
  root.className = `card-column side-${opts.side}`;
  parent.appendChild(root);

  const nodes = new Map<string, CardNode>();
  let entries: CardEntry[] = [];
  let activeId: string | null = null;
  let composerSlot: ComposerSlot | null = null;

  function buildCard(entry: CardEntry): CardNode {
    const el = document.createElement("div");
    el.className = "card";
    el.dataset.id = entry.comment.id;
    el.tabIndex = 0;
    if (!entry.target) el.classList.add("missing");
    makeInteractive(el);

    const head = document.createElement("div");
    head.className = "card-head";

    const tagEl = document.createElement("span");
    tagEl.className = "card-tag";
    tagEl.textContent = entry.target ? `<${entry.comment.tag}>` : `<${entry.comment.tag}> · missing`;

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "icon-btn";
    editBtn.title = "Edit";
    editBtn.setAttribute("aria-label", "Edit comment");
    editBtn.innerHTML = pencilIcon();

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "icon-btn danger";
    deleteBtn.title = "Delete";
    deleteBtn.setAttribute("aria-label", "Delete comment");
    deleteBtn.innerHTML = trashIcon();

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    head.appendChild(tagEl);
    head.appendChild(actions);

    const bodyEl = document.createElement("div");
    bodyEl.className = "card-body";
    bodyEl.textContent = entry.comment.body;

    el.appendChild(head);
    el.appendChild(bodyEl);

    el.title = entry.comment.selector;

    const onCardClick = (e: MouseEvent) => {
      if (e.target instanceof HTMLButtonElement || (e.target as HTMLElement).closest("button")) return;
      opts.onJump(entry.comment.id);
    };
    const onEdit = (e: MouseEvent) => {
      e.stopPropagation();
      opts.onEdit(entry.comment.id);
    };
    const onDelete = (e: MouseEvent) => {
      e.stopPropagation();
      if (confirm("Delete this comment?")) opts.onDelete(entry.comment.id);
    };
    const onEnter = () => opts.onHover?.(entry.comment.id);
    const onLeave = () => opts.onHover?.(null);
    const onFocusIn = () => opts.onFocus?.(entry.comment.id);
    const onFocusOut = (e: FocusEvent) => {
      // `focusout` bubbles; only treat it as "focus left the card" when the
      // new focus target is outside the card subtree.
      const next = e.relatedTarget as Node | null;
      if (next && el.contains(next)) return;
      opts.onFocus?.(null);
    };
    el.addEventListener("click", onCardClick);
    editBtn.addEventListener("click", onEdit);
    deleteBtn.addEventListener("click", onDelete);
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("focusin", onFocusIn);
    el.addEventListener("focusout", onFocusOut);

    return {
      el,
      bodyEl,
      tagEl,
      cleanup() {
        el.removeEventListener("click", onCardClick);
        editBtn.removeEventListener("click", onEdit);
        deleteBtn.removeEventListener("click", onDelete);
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
        el.removeEventListener("focusin", onFocusIn);
        el.removeEventListener("focusout", onFocusOut);
      },
    };
  }

  function updateCardContent(node: CardNode, entry: CardEntry) {
    node.el.dataset.id = entry.comment.id;
    node.el.classList.toggle("missing", !entry.target);
    node.el.classList.toggle("active", entry.comment.id === activeId);
    node.tagEl.textContent = entry.target
      ? `<${entry.comment.tag}>`
      : `<${entry.comment.tag}> · missing`;
    node.el.title = entry.comment.selector;
    if (node.bodyEl.textContent !== entry.comment.body) {
      node.bodyEl.textContent = entry.comment.body;
    }
  }

  function setEntries(next: CardEntry[]) {
    entries = next.slice();
    const seen = new Set<string>();

    next.forEach((entry) => {
      seen.add(entry.comment.id);
      let node = nodes.get(entry.comment.id);
      if (!node) {
        node = buildCard(entry);
        nodes.set(entry.comment.id, node);
        root.appendChild(node.el);
      } else {
        updateCardContent(node, entry);
      }
    });

    for (const [id, node] of nodes) {
      if (!seen.has(id)) {
        node.cleanup();
        node.el.remove();
        nodes.delete(id);
      }
    }

    layout();
  }

  function setActive(id: string | null) {
    activeId = id;
    for (const [cid, node] of nodes) {
      node.el.classList.toggle("active", cid === id);
    }
    if (id) {
      const node = nodes.get(id);
      if (node) {
        node.el.classList.remove("pulse");
        void node.el.offsetWidth;
        node.el.classList.add("pulse");
      }
    }
  }

  function layout() {
    // Hide the card whose comment is currently being edited (if any).
    const hiddenId = composerSlot?.hideCommentId;
    for (const [id, node] of nodes) {
      node.el.classList.toggle("hidden-editing", hiddenId === id);
    }

    type Item = { el: HTMLElement; targetMidpoint: number };
    const items: Item[] = [];

    for (const entry of entries) {
      if (hiddenId && entry.comment.id === hiddenId) continue;
      const node = nodes.get(entry.comment.id);
      if (!node) continue;
      const rect = entry.target?.getBoundingClientRect();
      const targetMidpoint = rect && (rect.width > 0 || rect.height > 0)
        ? rect.top + rect.height / 2
        : Number.POSITIVE_INFINITY;
      items.push({ el: node.el, targetMidpoint });
    }

    if (composerSlot) {
      items.push({ el: composerSlot.el, targetMidpoint: composerSlot.targetMidpoint });
    }

    if (items.length === 0) return;

    // Order by target midpoint so cards naturally follow document flow;
    // missing ones (Infinity) land at the bottom.
    items.sort((a, b) => a.targetMidpoint - b.targetMidpoint);

    // Greedy top-down stack: best-effort center each card on its target
    // midpoint, but never let two overlap (push down as needed).
    let cursor = COLUMN_MARGIN;
    for (const item of items) {
      const h = item.el.offsetHeight || 80;
      const desired = Number.isFinite(item.targetMidpoint)
        ? item.targetMidpoint - h / 2
        : cursor;
      const top = Math.max(cursor, desired);
      item.el.style.top = `${top}px`;
      cursor = top + h + CARD_GAP;
    }
  }

  return {
    column: root,
    setEntries,
    setActive,
    setComposerSlot(slot: ComposerSlot | null) {
      composerSlot = slot;
      layout();
    },
    layout,
    getCardElement(id: string) {
      const node = nodes.get(id);
      if (!node) return null;
      if (node.el.classList.contains("hidden-editing")) return null;
      return node.el;
    },
    destroy() {
      for (const node of nodes.values()) {
        node.cleanup();
        node.el.remove();
      }
      nodes.clear();
      root.remove();
    },
  };
}

function pencilIcon(): string {
  return `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.25.25 0 0 0-.064.108l-.558 1.953 1.953-.558a.25.25 0 0 0 .108-.064Z"/></svg>`;
}

function trashIcon(): string {
  return `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.75 1.75 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"/></svg>`;
}
