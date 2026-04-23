import { STYLES } from "./styles.js";

export interface Overlay {
  host: HTMLDivElement;
  shadow: ShadowRoot;
  layer: HTMLDivElement;
  destroy(): void;
}

export function createOverlay(side: "right" | "left"): Overlay {
  const host = document.createElement("div");
  host.setAttribute("data-dom-critique", "");
  // Don't let the host itself capture pointer events when not over a child.
  host.style.cssText = [
    "position: fixed",
    "inset: 0",
    "pointer-events: none",
    "z-index: 2147483500",
  ].join(";");
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = STYLES;
  shadow.appendChild(style);

  const layer = document.createElement("div");
  layer.className = `layer side-${side}`;
  // The layer itself shouldn't intercept pointer events; only its children.
  layer.style.cssText = "position: fixed; inset: 0; pointer-events: none;";
  shadow.appendChild(layer);

  return {
    host,
    shadow,
    layer,
    destroy() {
      host.remove();
    },
  };
}

/**
 * Helper to flip a child element to be interactive (children of `.layer`
 * inherit `pointer-events: none` so individual UI bits must opt back in).
 */
export function makeInteractive(el: HTMLElement): void {
  el.style.pointerEvents = "auto";
}
