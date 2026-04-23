import { makeInteractive } from "./overlay.js";

export interface Marker {
  el: HTMLButtonElement;
  setIndex(index: number): void;
  setMissing(missing: boolean): void;
  positionTo(target: Element | null): void;
  pulse(): void;
  destroy(): void;
}

export interface MarkerOptions {
  index: number;
  onClick: () => void;
}

export function createMarker(parent: HTMLElement, opts: MarkerOptions): Marker {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "marker";
  btn.textContent = String(opts.index);
  makeInteractive(btn);

  const click = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    opts.onClick();
  };
  btn.addEventListener("click", click);
  parent.appendChild(btn);

  function positionTo(target: Element | null) {
    if (!target || !document.contains(target)) {
      btn.style.display = "none";
      return;
    }
    const rect = target.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      btn.style.display = "none";
      return;
    }
    btn.style.display = "grid";
    // Pin to the top-right corner of the element.
    btn.style.top = `${rect.top}px`;
    btn.style.left = `${rect.right}px`;
  }

  return {
    el: btn,
    setIndex(index: number) {
      btn.textContent = String(index);
      btn.title = `Comment ${index}`;
    },
    setMissing(missing: boolean) {
      btn.classList.toggle("missing", missing);
    },
    positionTo,
    pulse() {
      btn.classList.remove("pulse");
      // Force reflow so the animation restarts.
      void btn.offsetWidth;
      btn.classList.add("pulse");
    },
    destroy() {
      btn.removeEventListener("click", click);
      btn.remove();
    },
  };
}
