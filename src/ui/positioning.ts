/**
 * Throttled reposition pump. Calls `tick` at most once per animation frame in
 * response to scroll, resize, and DOM size changes inside `root`.
 */
export interface Pump {
  request(): void;
  destroy(): void;
}

export function createPump(root: HTMLElement, tick: () => void): Pump {
  let raf = 0;
  let stopped = false;

  function request() {
    if (stopped || raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      tick();
    });
  }

  function onChange() {
    request();
  }

  window.addEventListener("scroll", onChange, true);
  window.addEventListener("resize", onChange);

  let observer: ResizeObserver | null = null;
  if (typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(onChange);
    observer.observe(root);
  }

  let mutation: MutationObserver | null = null;
  if (typeof MutationObserver !== "undefined") {
    mutation = new MutationObserver(onChange);
    mutation.observe(root, { childList: true, subtree: true, characterData: true });
  }

  return {
    request,
    destroy() {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      window.removeEventListener("scroll", onChange, true);
      window.removeEventListener("resize", onChange);
      observer?.disconnect();
      mutation?.disconnect();
    },
  };
}
