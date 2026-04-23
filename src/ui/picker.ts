/**
 * Element picker for "comment mode". When activated, hovering inside `root`
 * draws an outline; clicking selects the element and ends the session.
 */

export interface PickerOptions {
  root: HTMLElement;
  /** Host element of the overlay; clicks landing on it are ignored. */
  overlayHost: Element;
  onPick: (el: Element) => void;
  onCancel: () => void;
}

export interface PickerSession {
  stop(): void;
}

export function startPicker(opts: PickerOptions): PickerSession {
  const { root, overlayHost, onPick, onCancel } = opts;

  const outline = document.createElement("div");
  outline.style.cssText = [
    "position: fixed",
    "pointer-events: none",
    "border: 2px dashed #1f6feb",
    "background: rgba(31, 111, 235, 0.08)",
    "border-radius: 3px",
    "z-index: 2147483500",
    "transition: opacity 0.1s ease",
    "opacity: 0",
  ].join(";");
  document.body.appendChild(outline);

  const previousCursor = document.body.style.cursor;
  document.body.style.cursor = "crosshair";

  let lastTarget: Element | null = null;

  function isOverlay(el: EventTarget | null): boolean {
    return el instanceof Node && (el === overlayHost || overlayHost.contains(el));
  }

  function pickFromPoint(x: number, y: number): Element | null {
    const stack = document.elementsFromPoint(x, y);
    for (const candidate of stack) {
      if (isOverlay(candidate)) continue;
      if (!root.contains(candidate)) continue;
      return candidate;
    }
    return null;
  }

  function showOutline(el: Element) {
    const rect = el.getBoundingClientRect();
    outline.style.top = `${rect.top}px`;
    outline.style.left = `${rect.left}px`;
    outline.style.width = `${rect.width}px`;
    outline.style.height = `${rect.height}px`;
    outline.style.opacity = "1";
  }

  function hideOutline() {
    outline.style.opacity = "0";
  }

  function onMove(e: MouseEvent) {
    const target = pickFromPoint(e.clientX, e.clientY);
    if (!target) {
      lastTarget = null;
      hideOutline();
      return;
    }
    lastTarget = target;
    showOutline(target);
  }

  function onClick(e: MouseEvent) {
    if (isOverlay(e.target)) return;
    const target = lastTarget ?? pickFromPoint(e.clientX, e.clientY);
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
    stop();
    onPick(target);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      stop();
      onCancel();
    }
  }

  function onScrollOrResize() {
    if (lastTarget && document.contains(lastTarget)) {
      showOutline(lastTarget);
    }
  }

  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKey, true);
  window.addEventListener("scroll", onScrollOrResize, true);
  window.addEventListener("resize", onScrollOrResize, true);

  let stopped = false;
  function stop() {
    if (stopped) return;
    stopped = true;
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("scroll", onScrollOrResize, true);
    window.removeEventListener("resize", onScrollOrResize, true);
    document.body.style.cursor = previousCursor;
    outline.remove();
  }

  return { stop };
}
