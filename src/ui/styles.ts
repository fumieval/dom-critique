export const STYLES = /* css */ `
:host {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
    Arial, sans-serif;
  color: #1f2328;
  font-size: 13px;
  line-height: 1.45;
}

* {
  box-sizing: border-box;
}

button {
  font: inherit;
  color: inherit;
  cursor: pointer;
  border: 0;
  background: none;
  padding: 0;
}

textarea {
  font: inherit;
  color: inherit;
}

/* ---------- floating toolbar (FABs) ---------- */
.toolbar {
  position: fixed;
  bottom: 20px;
  z-index: 2147483600;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 10px;
}
.side-right .toolbar { right: 20px; }
.side-left  .toolbar { left: 20px; }

.fab {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #1f6feb;
  color: #fff;
  display: grid;
  place-items: center;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
  transition: transform 0.15s ease, background 0.15s ease;
}
.fab:hover { transform: translateY(-1px); background: #2a78f0; }
.fab.active { background: #d33; }
.fab svg { width: 22px; height: 22px; fill: currentColor; }

.fab.fab-secondary {
  width: 36px;
  height: 36px;
  background: #fff;
  color: #1f6feb;
  border: 1px solid #d0d7de;
}
.fab.fab-secondary:hover { background: #f6f8fa; }
.fab.fab-secondary svg { width: 16px; height: 16px; }
.fab.fab-secondary.copied {
  background: #2da44e;
  color: #fff;
  border-color: #2da44e;
  font-size: 11px;
  font-weight: 600;
}

/* ---------- FAB tooltip (custom; works inside Shadow DOM) ---------- */
.fab[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  top: 50%;
  transform: translateY(-50%) translateX(4px);
  background: rgba(15, 23, 42, 0.94);
  color: #fff;
  padding: 5px 9px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.2;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.12s ease, transform 0.12s ease;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22);
  z-index: 1;
}
.fab[data-tooltip]::before {
  content: "";
  position: absolute;
  top: 50%;
  width: 0;
  height: 0;
  border: 5px solid transparent;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.12s ease, transform 0.12s ease;
  z-index: 1;
}
/* default position: tooltip on the LEFT of the FAB (used for side-right) */
.fab[data-tooltip]::after {
  right: calc(100% + 10px);
}
.fab[data-tooltip]::before {
  right: calc(100% + 1px);
  border-left-color: rgba(15, 23, 42, 0.94);
  transform: translateY(-50%) translateX(4px);
}
/* flip to the RIGHT side when the toolbar lives on the left */
.side-left .fab[data-tooltip]::after {
  right: auto;
  left: calc(100% + 10px);
  transform: translateY(-50%) translateX(-4px);
}
.side-left .fab[data-tooltip]::before {
  right: auto;
  left: calc(100% + 1px);
  border-left-color: transparent;
  border-right-color: rgba(15, 23, 42, 0.94);
  transform: translateY(-50%) translateX(-4px);
}
.fab[data-tooltip]:hover::after,
.fab[data-tooltip]:focus-visible::after,
.fab[data-tooltip]:hover::before,
.fab[data-tooltip]:focus-visible::before {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

/* ---------- hover outline (used during pick + active highlight) ---------- */
.hover-outline {
  position: fixed;
  pointer-events: none;
  border: 2px dashed #1f6feb;
  background: rgba(31, 111, 235, 0.08);
  border-radius: 3px;
  z-index: 2147483500;
  transition: opacity 0.1s ease;
}

/* ---------- markers ---------- */
.marker {
  position: fixed;
  z-index: 2147483550;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ffd23f;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  transform: translate(-50%, -50%);
  padding: 0;
  font-size: 0;
}
.marker:hover { background: #ffcf24; transform: translate(-50%, -50%) scale(1.15); }
.marker.missing { background: #aaa; }
.marker.pulse { animation: pulse 0.9s ease 2; }
@keyframes pulse {
  0%   { box-shadow: 0 0 0 0 rgba(255, 210, 63, 0.7); }
  70%  { box-shadow: 0 0 0 10px rgba(255, 210, 63, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 210, 63, 0); }
}

/* ---------- composer (rendered as a card in the margin column) ---------- */
.composer {
  position: absolute;
  left: 0;
  width: 100%;
  background: #fff;
  border: 1px solid #1f6feb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(31, 111, 235, 0.22);
  padding: 10px;
  display: none;
  flex-direction: column;
  gap: 8px;
  transition: top 0.18s ease;
  pointer-events: auto;
}
.composer.open { display: flex; }
.composer .target-meta {
  font-size: 11px;
  color: #6e7781;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-all;
}
.composer textarea {
  width: 100%;
  min-height: 80px;
  resize: vertical;
  padding: 6px 8px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  background: #fff;
  outline: none;
}
.composer textarea:focus { border-color: #1f6feb; box-shadow: 0 0 0 3px rgba(31,111,235,0.2); }
.composer .composer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}
.composer .btn {
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid #d0d7de;
  background: #f6f8fa;
}
.composer .btn:hover { background: #eef1f4; }
.composer .btn.primary {
  background: #1f6feb;
  color: #fff;
  border-color: #1f6feb;
}
.composer .btn.primary:hover { background: #2a78f0; }
.composer .btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ---------- pinned outline (visible while composer is open) ---------- */
.pin-outline {
  position: fixed;
  pointer-events: none;
  border: 2px solid #1f6feb;
  background: rgba(31, 111, 235, 0.06);
  border-radius: 3px;
  z-index: 2147483450;
  opacity: 0;
  transition: opacity 0.15s ease, top 0.15s ease, left 0.15s ease,
    width 0.15s ease, height 0.15s ease;
}
.pin-outline.visible { opacity: 1; }

/* ---------- connector lines (target ↔ card / composer) ---------- */
.connector-layer {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2147483470;
  overflow: visible;
}
.connector-layer line {
  stroke: #f5b800;
  stroke-width: 2.5;
  fill: none;
  transition: stroke 0.15s ease, stroke-width 0.15s ease;
}
.connector-layer line.emphasized {
  stroke: #f5b800;
  stroke-width: 3;
  stroke-dasharray: 4 3;
}

/* ---------- floating cards (margin column) ---------- */
.card-column {
  position: fixed;
  top: 0;
  bottom: 0;
  width: 300px;
  pointer-events: none; /* let individual cards opt in */
  z-index: 2147483490;
}
.card-column.side-right { right: 16px; }
.card-column.side-left  { left: 16px; }

.card {
  position: absolute;
  left: 0;
  width: 100%;
  background: #fff;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  padding: 8px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: top 0.18s ease, box-shadow 0.15s ease, transform 0.15s ease;
  cursor: pointer;
}
.card:hover {
  border-width: 2px;
  padding: 7px 9px 9px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.14);
  transform: translateY(-1px);
}
.card.active,
.card:focus,
.card:focus-within {
  border-color: #1f6feb;
  box-shadow: 0 8px 20px rgba(31, 111, 235, 0.22);
  outline: none;
}
.card.missing { opacity: 0.7; }
.card.hidden-editing { display: none; }
.card.pulse { animation: cardPulse 0.9s ease 1; }
@keyframes cardPulse {
  0%   { box-shadow: 0 0 0 0 rgba(31, 111, 235, 0.45); }
  70%  { box-shadow: 0 0 0 10px rgba(31, 111, 235, 0); }
  100% { box-shadow: 0 0 0 0 rgba(31, 111, 235, 0); }
}

.card-head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.card-tag {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  color: #6e7781;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-actions {
  display: flex;
  gap: 2px;
  flex: 0 0 auto;
}
.icon-btn {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  display: grid;
  place-items: center;
  color: #6e7781;
}
.icon-btn:hover { background: #eaeef2; color: #1f2328; }
.icon-btn.danger:hover { background: #ffebe9; color: #cf222e; }
.icon-btn svg { width: 12px; height: 12px; fill: currentColor; }

.card-body {
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ---------- target highlight (shown briefly when a card/marker is focused) ---------- */
.target-highlight {
  position: fixed;
  pointer-events: none;
  border: 2px solid #1f6feb;
  background: rgba(31, 111, 235, 0.08);
  border-radius: 3px;
  z-index: 2147483450;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.target-highlight.visible { opacity: 1; }
`;
