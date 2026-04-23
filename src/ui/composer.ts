import { makeInteractive } from "./overlay.js";

export interface ComposerOpenOptions {
  anchor: Element;
  selector: string;
  initialBody?: string;
  onSave: (body: string) => void;
  onCancel?: () => void;
}

export interface Composer {
  open(opts: ComposerOpenOptions): void;
  close(): void;
  reposition(): void;
  isOpen(): boolean;
  destroy(): void;
}

export function createComposer(parent: HTMLElement): Composer {
  const root = document.createElement("div");
  root.className = "composer";
  root.style.display = "none";
  makeInteractive(root);

  const meta = document.createElement("div");
  meta.className = "target-meta";

  const textarea = document.createElement("textarea");
  textarea.placeholder = "Write a comment…";

  const actions = document.createElement("div");
  actions.className = "actions";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "btn";
  cancelBtn.textContent = "Cancel";

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "btn primary";
  saveBtn.textContent = "Save";

  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);

  root.appendChild(meta);
  root.appendChild(textarea);
  root.appendChild(actions);
  parent.appendChild(root);

  let current: ComposerOpenOptions | null = null;

  function updateSaveDisabled() {
    saveBtn.disabled = textarea.value.trim().length === 0;
  }

  function position() {
    if (!current) return;
    const rect = current.anchor.getBoundingClientRect();
    const composerW = root.offsetWidth || 280;
    const composerH = root.offsetHeight || 140;
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = rect.bottom + margin;
    if (top + composerH > vh - 8) top = Math.max(8, rect.top - composerH - margin);

    let left = rect.left;
    if (left + composerW > vw - 8) left = Math.max(8, vw - composerW - 8);
    if (left < 8) left = 8;

    root.style.top = `${top}px`;
    root.style.left = `${left}px`;
  }

  function close() {
    current = null;
    root.style.display = "none";
    textarea.value = "";
  }

  function onSave() {
    if (!current) return;
    const body = textarea.value.trim();
    if (!body) return;
    const cb = current.onSave;
    close();
    cb(body);
  }

  function onCancel() {
    if (!current) return;
    const cb = current.onCancel;
    close();
    cb?.();
  }

  function onKey(e: KeyboardEvent) {
    if (!current) return;
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSave();
    }
  }

  textarea.addEventListener("input", updateSaveDisabled);
  textarea.addEventListener("keydown", onKey);
  saveBtn.addEventListener("click", onSave);
  cancelBtn.addEventListener("click", onCancel);

  return {
    open(opts) {
      current = opts;
      meta.textContent = opts.selector;
      textarea.value = opts.initialBody ?? "";
      updateSaveDisabled();
      root.style.display = "flex";
      position();
      // Defer focus so layout settles before measuring caret position.
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      });
    },
    close,
    reposition: position,
    isOpen() {
      return current !== null;
    },
    destroy() {
      textarea.removeEventListener("input", updateSaveDisabled);
      textarea.removeEventListener("keydown", onKey);
      saveBtn.removeEventListener("click", onSave);
      cancelBtn.removeEventListener("click", onCancel);
      root.remove();
    },
  };
}
