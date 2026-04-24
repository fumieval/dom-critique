import { makeInteractive } from "./overlay.js";

export interface Marker {
  el: HTMLButtonElement;
  setMissing(missing: boolean): void;
  positionTo(target: Element | null): void;
  pulse(): void;
  destroy(): void;
}

export interface MarkerOptions {
  side: "right" | "left";
  onClick: () => void;
  /** Fired when the cursor enters the marker; called with `false` on leave. */
  onHover?: (hovering: boolean) => void;
  /** Fired when keyboard focus enters/leaves the marker. */
  onFocus?: (focused: boolean) => void;
}

export function createMarker(parent: HTMLElement, opts: MarkerOptions): Marker {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "marker";
  btn.title = "Open comment";
  btn.setAttribute("aria-label", "Open comment");
  makeInteractive(btn);

  const click = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    opts.onClick();
  };
  const enter = () => opts.onHover?.(true);
  const leave = () => opts.onHover?.(false);
  const focus = () => opts.onFocus?.(true);
  const blur = () => opts.onFocus?.(false);
  btn.addEventListener("click", click);
  btn.addEventListener("mouseenter", enter);
  btn.addEventListener("mouseleave", leave);
  btn.addEventListener("focus", focus);
  btn.addEventListener("blur", blur);
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
    btn.style.display = "block";
    // Pin to the midpoint of the element's right (or left) edge so it lines
    // up with the connector line drawn from the same point.
    btn.style.top = `${rect.top + rect.height / 2}px`;
    btn.style.left = `${opts.side === "left" ? rect.left : rect.right}px`;
  }

  return {
    el: btn,
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
      btn.removeEventListener("mouseenter", enter);
      btn.removeEventListener("mouseleave", leave);
      btn.removeEventListener("focus", focus);
      btn.removeEventListener("blur", blur);
      btn.remove();
    },
  };
}
