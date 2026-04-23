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
}

export interface Cards {
  /** Replace the full set of cards (creates / removes as needed). */
  setEntries(entries: CardEntry[]): void;
  /** Mark a card as active (for visual emphasis). */
  setActive(id: string | null): void;
  /** Re-run vertical layout based on current target rects. */
  layout(): void;
  destroy(): void;
}

interface CardNode {
  el: HTMLDivElement;
  bodyEl: HTMLDivElement;
  tagEl: HTMLSpanElement;
  indexEl: HTMLSpanElement;
  cleanup: () => void;
}

export function createCards(parent: HTMLElement, opts: CardsOptions): Cards {
  const root = document.createElement("div");
  root.className = `card-column side-${opts.side}`;
  parent.appendChild(root);

  const nodes = new Map<string, CardNode>();
  let entries: CardEntry[] = [];
  let activeId: string | null = null;

  function buildCard(entry: CardEntry, index: number): CardNode {
    const el = document.createElement("div");
    el.className = "card";
    el.dataset.id = entry.comment.id;
    if (!entry.target) el.classList.add("missing");
    makeInteractive(el);

    const head = document.createElement("div");
    head.className = "card-head";

    const indexEl = document.createElement("span");
    indexEl.className = "card-index";
    indexEl.textContent = String(index + 1);

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

    head.appendChild(indexEl);
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
    el.addEventListener("click", onCardClick);
    editBtn.addEventListener("click", onEdit);
    deleteBtn.addEventListener("click", onDelete);

    return {
      el,
      bodyEl,
      tagEl,
      indexEl,
      cleanup() {
        el.removeEventListener("click", onCardClick);
        editBtn.removeEventListener("click", onEdit);
        deleteBtn.removeEventListener("click", onDelete);
      },
    };
  }

  function updateCardContent(node: CardNode, entry: CardEntry, index: number) {
    node.el.dataset.id = entry.comment.id;
    node.el.classList.toggle("missing", !entry.target);
    node.el.classList.toggle("active", entry.comment.id === activeId);
    node.indexEl.textContent = String(index + 1);
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

    next.forEach((entry, index) => {
      seen.add(entry.comment.id);
      let node = nodes.get(entry.comment.id);
      if (!node) {
        node = buildCard(entry, index);
        nodes.set(entry.comment.id, node);
        root.appendChild(node.el);
      } else {
        updateCardContent(node, entry, index);
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
    if (entries.length === 0) return;

    type Item = { id: string; el: HTMLDivElement; desiredTop: number; height: number };
    const items: Item[] = [];

    for (const entry of entries) {
      const node = nodes.get(entry.comment.id);
      if (!node) continue;
      const rect = entry.target?.getBoundingClientRect();
      const desiredTop = rect && (rect.width > 0 || rect.height > 0)
        ? rect.top
        : Number.POSITIVE_INFINITY;
      items.push({
        id: entry.comment.id,
        el: node.el,
        desiredTop,
        height: 0,
      });
    }

    // Order by desired top so cards naturally follow document flow; missing
    // ones (Infinity) land at the bottom.
    items.sort((a, b) => a.desiredTop - b.desiredTop);

    // Greedy top-down stack with a minimum gap.
    let cursor = COLUMN_MARGIN;
    for (const item of items) {
      const desired = Number.isFinite(item.desiredTop) ? item.desiredTop : cursor;
      const top = Math.max(cursor, desired);
      item.el.style.top = `${top}px`;
      // Measure after positioning so layout reflects current width.
      const h = item.el.offsetHeight || 80;
      item.height = h;
      cursor = top + h + CARD_GAP;
    }
  }

  return {
    setEntries,
    setActive,
    layout,
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
