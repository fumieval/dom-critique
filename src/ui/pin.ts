/**
 * Pinned target outline shown while a composer is open. Visually marks the
 * element being commented on; the connecting line is drawn separately by the
 * connectors layer so it can share the same rendering pipeline as the
 * always-on per-card connectors.
 */

export interface PinOverlay {
  show(target: Element): void;
  hide(): void;
  update(target: Element): void;
  destroy(): void;
}

export function createPinOverlay(parent: HTMLElement): PinOverlay {
  const outline = document.createElement("div");
  outline.className = "pin-outline";
  parent.appendChild(outline);

  function positionOutline(target: Element): boolean {
    const r = target.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    outline.style.top = `${r.top}px`;
    outline.style.left = `${r.left}px`;
    outline.style.width = `${r.width}px`;
    outline.style.height = `${r.height}px`;
    return true;
  }

  return {
    show(target: Element) {
      if (positionOutline(target)) outline.classList.add("visible");
    },
    hide() {
      outline.classList.remove("visible");
    },
    update(target: Element) {
      if (positionOutline(target)) outline.classList.add("visible");
    },
    destroy() {
      outline.remove();
    },
  };
}
