/**
 * Manages a single SVG layer that draws connector lines between commented
 * elements and their floating cards (or the composer when an entry is being
 * edited). One line per comment id.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

export interface ConnectorPoints {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Visually emphasised line (used while the composer is open for it). */
  emphasized?: boolean;
}

export interface Connectors {
  set(id: string, p: ConnectorPoints): void;
  remove(id: string): void;
  /** Drop any lines whose id is not in the given set. */
  syncIds(ids: Set<string>): void;
  destroy(): void;
}

export function createConnectors(parent: HTMLElement): Connectors {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "connector-layer");
  parent.appendChild(svg);

  const lines = new Map<string, SVGLineElement>();

  return {
    set(id, p) {
      let line = lines.get(id);
      if (!line) {
        line = document.createElementNS(SVG_NS, "line");
        svg.appendChild(line);
        lines.set(id, line);
      }
      line.setAttribute("x1", String(p.x1));
      line.setAttribute("y1", String(p.y1));
      line.setAttribute("x2", String(p.x2));
      line.setAttribute("y2", String(p.y2));
      line.classList.toggle("emphasized", !!p.emphasized);
    },
    remove(id) {
      const line = lines.get(id);
      if (!line) return;
      line.remove();
      lines.delete(id);
    },
    syncIds(ids) {
      for (const [id, line] of Array.from(lines)) {
        if (!ids.has(id)) {
          line.remove();
          lines.delete(id);
        }
      }
    },
    destroy() {
      svg.remove();
      lines.clear();
    },
  };
}
