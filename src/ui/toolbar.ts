import { makeInteractive } from "./overlay.js";

const COMMENT_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2z"/></svg>`;
const COPY_ICON = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg>`;

export interface ToolbarOptions {
  onToggleMode: () => void;
  onCopyMarkdown: () => Promise<void> | void;
}

export interface Toolbar {
  el: HTMLDivElement;
  toggleEl: HTMLButtonElement;
  setActive(active: boolean): void;
  setCommentCount(n: number): void;
  destroy(): void;
}

export function createToolbar(parent: HTMLElement, opts: ToolbarOptions): Toolbar {
  const root = document.createElement("div");
  root.className = "toolbar";
  makeInteractive(root);

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "fab";
  toggleBtn.title = "Add comment (toggle comment mode)";
  toggleBtn.setAttribute("aria-label", "Toggle comment mode");
  toggleBtn.innerHTML = COMMENT_ICON;

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "fab fab-secondary";
  copyBtn.title = "Copy all comments as Markdown";
  copyBtn.setAttribute("aria-label", "Copy all comments as Markdown");
  copyBtn.innerHTML = COPY_ICON;
  copyBtn.style.display = "none";

  root.appendChild(copyBtn);
  root.appendChild(toggleBtn);
  parent.appendChild(root);

  const onToggle = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    opts.onToggleMode();
  };

  let copying = false;
  const onCopy = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (copying) return;
    copying = true;
    try {
      await opts.onCopyMarkdown();
      copyBtn.classList.add("copied");
      const original = copyBtn.innerHTML;
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.classList.remove("copied");
        copyBtn.innerHTML = original;
      }, 1500);
    } catch {
      const original = copyBtn.innerHTML;
      copyBtn.textContent = "Failed";
      setTimeout(() => {
        copyBtn.innerHTML = original;
      }, 1500);
    } finally {
      copying = false;
    }
  };

  toggleBtn.addEventListener("click", onToggle);
  copyBtn.addEventListener("click", onCopy);

  return {
    el: root,
    toggleEl: toggleBtn,
    setActive(active: boolean) {
      toggleBtn.classList.toggle("active", active);
      toggleBtn.title = active ? "Exit comment mode" : "Add comment (toggle comment mode)";
    },
    setCommentCount(n: number) {
      copyBtn.style.display = n > 0 ? "grid" : "none";
    },
    destroy() {
      toggleBtn.removeEventListener("click", onToggle);
      copyBtn.removeEventListener("click", onCopy);
      root.remove();
    },
  };
}
