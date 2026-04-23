/**
 * Build a unique CSS selector for `el` within `el.ownerDocument`.
 *
 * Strategy:
 *   1. If the element has a stable id, prefer `#id` (escaped).
 *   2. Otherwise, walk up the ancestor chain building selector segments of the
 *      form `tag.cls:nth-of-type(n)`. Stop early as soon as the partial
 *      selector resolves uniquely against the document.
 *   3. As a last resort, return the full path from `<html>`.
 */
export function buildSelector(el: Element): string {
  if (!(el instanceof Element)) throw new TypeError("buildSelector: argument is not an Element");

  const doc = el.ownerDocument;
  if (!doc) return el.tagName.toLowerCase();

  if (el.id && isStableId(el.id) && isUniqueId(doc, el.id)) {
    return `#${cssEscape(el.id)}`;
  }

  const segments: string[] = [];
  let current: Element | null = el;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    if (current.id && isStableId(current.id) && isUniqueId(doc, current.id)) {
      segments.unshift(`#${cssEscape(current.id)}`);
      const candidate = segments.join(" > ");
      if (isUnique(doc, candidate, el)) return candidate;
      // If not unique even with id (shouldn't happen with isUniqueId), stop.
      return candidate;
    }

    segments.unshift(segmentFor(current));

    const candidate = segments.join(" > ");
    if (isUnique(doc, candidate, el)) return candidate;

    if (current === doc.documentElement) break;
    current = current.parentElement;
  }

  return segments.join(" > ");
}

function segmentFor(el: Element): string {
  const tag = el.tagName.toLowerCase();

  const classes = stableClassList(el);
  let segment = tag;
  if (classes.length) {
    segment += "." + classes.map(cssEscape).join(".");
  }

  const parent = el.parentElement;
  if (parent) {
    const sameTagSiblings = Array.from(parent.children).filter(
      (c) => c.tagName === el.tagName,
    );
    if (sameTagSiblings.length > 1) {
      const index = sameTagSiblings.indexOf(el) + 1;
      segment += `:nth-of-type(${index})`;
    }
  }
  return segment;
}

function stableClassList(el: Element): string[] {
  const classes: string[] = [];
  for (const cls of Array.from(el.classList)) {
    if (!cls) continue;
    // Skip framework-y or volatile-looking classes to keep selectors stable.
    if (/^(?:ng-|css-|jsx-|sc-|svelte-|_)/.test(cls)) continue;
    if (/--?[a-f0-9]{4,}$/i.test(cls)) continue;
    classes.push(cls);
    if (classes.length >= 2) break;
  }
  return classes;
}

function isStableId(id: string): boolean {
  // Reject ids that look auto-generated (long hex/uuid suffixes, etc.).
  if (!id) return false;
  if (/^[0-9]/.test(id)) return false;
  if (/[a-f0-9-]{16,}/i.test(id)) return false;
  return true;
}

function isUniqueId(doc: Document, id: string): boolean {
  try {
    return doc.querySelectorAll(`#${cssEscape(id)}`).length === 1;
  } catch {
    return false;
  }
}

function isUnique(doc: Document, selector: string, target: Element): boolean {
  try {
    const matches = doc.querySelectorAll(selector);
    return matches.length === 1 && matches[0] === target;
  } catch {
    return false;
  }
}

/**
 * Collect ARIA-related attributes from `el`: `role` and any `aria-*`
 * attribute. Returns them in a stable, deterministic order.
 */
export function collectAriaAttrs(el: Element): Record<string, string> {
  const out: Record<string, string> = {};
  const role = el.getAttribute("role");
  if (role) out.role = role;
  const names: string[] = [];
  for (const attr of Array.from(el.attributes)) {
    if (attr.name.startsWith("aria-")) names.push(attr.name);
  }
  names.sort();
  for (const name of names) {
    const value = el.getAttribute(name);
    if (value !== null) out[name] = value;
  }
  return out;
}

/**
 * Resolve a selector built by `buildSelector` back to its element. Returns
 * `null` if it does not resolve uniquely.
 */
export function resolveSelector(selector: string, doc: Document = document): Element | null {
  try {
    const matches = doc.querySelectorAll(selector);
    if (matches.length !== 1) return null;
    return matches[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * CSS.escape polyfill-ish wrapper.
 */
function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
}
