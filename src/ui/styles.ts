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
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #ffd23f;
  color: #1f2328;
  font-weight: 600;
  font-size: 11px;
  display: grid;
  place-items: center;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  transform: translate(-50%, -50%);
}
.marker:hover { background: #ffcf24; }
.marker.missing { background: #aaa; color: #fff; }
.marker.pulse { animation: pulse 0.9s ease 2; }
@keyframes pulse {
  0%   { box-shadow: 0 0 0 0 rgba(255, 210, 63, 0.7); }
  70%  { box-shadow: 0 0 0 10px rgba(255, 210, 63, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 210, 63, 0); }
}

/* ---------- composer popover ---------- */
.composer {
  position: fixed;
  z-index: 2147483600;
  width: 280px;
  background: #fff;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
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
.composer .actions {
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

/* ---------- floating cards (margin column) ---------- */
.card-column {
  position: fixed;
  top: 0;
  bottom: 0;
  width: 300px;
  pointer-events: none; /* let individual cards opt in */
  z-index: 2147483400;
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
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.14);
  transform: translateY(-1px);
}
.card.active {
  border-color: #1f6feb;
  box-shadow: 0 8px 20px rgba(31, 111, 235, 0.22);
}
.card.missing { opacity: 0.7; }
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
.card-index {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffd23f;
  font-size: 10px;
  font-weight: 600;
  flex: 0 0 auto;
}
.card.missing .card-index { background: #aaa; color: #fff; }
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
