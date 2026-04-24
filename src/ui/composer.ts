import { makeInteractive } from "./overlay.js";

export interface ComposerOpenOptions {
  selector: string;
  initialBody?: string;
  onSave: (body: string) => void;
  onCancel?: () => void;
}

export interface Composer {
  /**
   * Root DOM element. The owner (typically the cards column) is responsible
   * for positioning this element by setting `style.top`.
   */
  el: HTMLDivElement;
  open(opts: ComposerOpenOptions): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}

export function createComposer(parent: HTMLElement): Composer {
  const root = document.createElement("div");
  root.className = "composer";
  makeInteractive(root);

  const meta = document.createElement("div");
  meta.className = "target-meta";

  const textarea = document.createElement("textarea");
  textarea.placeholder = "Write a comment…";

  const actions = document.createElement("div");
  actions.className = "composer-actions";

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

  function close() {
    current = null;
    root.classList.remove("open");
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
    el: root,
    open(opts) {
      current = opts;
      meta.textContent = opts.selector;
      textarea.value = opts.initialBody ?? "";
      updateSaveDisabled();
      root.classList.add("open");
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      });
    },
    close,
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
