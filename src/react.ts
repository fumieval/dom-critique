/**
 * Best-effort React fiber introspection. Reads the framework-private fiber
 * attached to a DOM node by React 17+ (or the older `__reactInternalInstance$`
 * key for React <17) and extracts:
 *
 *  - The owner component chain (root → leaf), via `_debugOwner`.
 *  - The source file / line of the JSX call site, via `_debugSource`. Only
 *    populated when the bundle was built with `@babel/plugin-transform-jsx-source`
 *    (default in CRA, Vite dev, Next.js dev).
 *
 * Returns `undefined` if no React fiber is present (i.e. not a React app, or
 * a production build that strips `_debug*`).
 */
export interface ReactSource {
  fileName: string;
  lineNumber: number;
  columnNumber?: number;
}

export interface ReactInfo {
  /** Owner component chain, root → leaf. Empty if none could be detected. */
  stack: string[];
  /** Nearest JSX source location, if available. */
  source?: ReactSource;
}

export function getReactInfo(el: Element): ReactInfo | undefined {
  const fiber = findFiber(el);
  if (!fiber) return undefined;

  const source = findSource(fiber);
  const stack = buildOwnerStack(fiber);

  if (stack.length === 0 && !source) return undefined;
  return { stack, source };
}

function findFiber(el: Element): unknown {
  for (const key of Object.keys(el)) {
    if (key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance$")) {
      return (el as unknown as Record<string, unknown>)[key];
    }
  }
  return undefined;
}

function findSource(start: unknown): ReactSource | undefined {
  // Walk the return chain (parent host/component fibers) first, since the host
  // fiber for the picked DOM element usually carries the most precise source.
  let f = start as FiberLike | undefined;
  while (f) {
    const s = readDebugSource(f);
    if (s) return s;
    f = f.return ?? undefined;
  }
  // Fall back to the owner chain in case `return` didn't carry source info.
  let o = (start as FiberLike)?._debugOwner ?? undefined;
  while (o) {
    const s = readDebugSource(o);
    if (s) return s;
    o = o._debugOwner ?? undefined;
  }
  return undefined;
}

function buildOwnerStack(start: unknown): string[] {
  const names: string[] = [];
  // Start at _debugOwner (the component that created this fiber's JSX), then
  // walk up the owner chain.
  let o: FiberLike | undefined = (start as FiberLike)?._debugOwner ?? undefined;
  while (o) {
    const n = componentName(o);
    if (n) names.push(n);
    o = o._debugOwner ?? undefined;
  }
  // Names were collected leaf-first; flip to root → leaf for readability.
  names.reverse();
  return names;
}

function readDebugSource(f: FiberLike): ReactSource | undefined {
  const ds = f._debugSource;
  if (!ds || typeof ds.fileName !== "string" || typeof ds.lineNumber !== "number") {
    return undefined;
  }
  const out: ReactSource = { fileName: ds.fileName, lineNumber: ds.lineNumber };
  if (typeof ds.columnNumber === "number") out.columnNumber = ds.columnNumber;
  return out;
}

function componentName(f: FiberLike): string | undefined {
  const t = f.type;
  if (!t) return undefined;
  if (typeof t === "string") return undefined; // host element
  if (typeof t === "function") {
    return (t as { displayName?: string; name?: string }).displayName || (t as { name?: string }).name;
  }
  if (typeof t === "object") {
    // forwardRef/memo wrappers store the inner component on .render or .type.
    const obj = t as { displayName?: string; render?: { displayName?: string; name?: string }; type?: { displayName?: string; name?: string } };
    return (
      obj.displayName ||
      obj.render?.displayName ||
      obj.render?.name ||
      obj.type?.displayName ||
      obj.type?.name
    );
  }
  return undefined;
}

// Minimal structural type for the bits of React fiber we touch.
interface FiberLike {
  type?: unknown;
  return?: FiberLike | null;
  _debugOwner?: FiberLike | null;
  _debugSource?: {
    fileName?: string;
    lineNumber?: number;
    columnNumber?: number;
  };
}
