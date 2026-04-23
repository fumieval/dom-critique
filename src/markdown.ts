import type { Comment } from "./types.js";

export interface MarkdownContext {
  title?: string;
  url?: string;
}

export function toMarkdown(comments: Comment[], ctx: MarkdownContext = {}): string {
  const title = ctx.title ?? (typeof document !== "undefined" ? document.title : "");
  const url = ctx.url ?? (typeof location !== "undefined" ? location.href : "");

  const lines: string[] = [];
  const header = title ? `Comments for ${title}` : "Comments";
  lines.push(`# ${header}${url ? ` (${url})` : ""}`);
  lines.push("");

  if (comments.length === 0) {
    lines.push("_No comments yet._");
    lines.push("");
    return lines.join("\n");
  }

  comments.forEach((c, i) => {
    lines.push(`## Comment ${i + 1}`);
    lines.push(`- Selector: \`${escapeInlineCode(c.selector)}\``);
    lines.push(`- Element: \`${formatElementTag(c.tag, c.attrs)}\``);
    if (c.react?.stack && c.react.stack.length > 0) {
      const leaf = c.react.stack[c.react.stack.length - 1];
      lines.push(`- Component: \`<${leaf}>\``);
      if (c.react.stack.length > 1) {
        lines.push(`- React stack: ${c.react.stack.map((n) => `\`<${n}>\``).join(" › ")}`);
      }
    }
    if (c.react?.source) {
      lines.push(`- Source: \`${formatSource(c.react.source)}\``);
    }
    if (c.snippet) lines.push(`- Snippet: ${JSON.stringify(c.snippet)}`);
    lines.push(`- Created: ${c.createdAt}`);
    if (c.updatedAt && c.updatedAt !== c.createdAt) {
      lines.push(`- Updated: ${c.updatedAt}`);
    }
    lines.push("");
    lines.push(blockquote(c.body));
    lines.push("");
  });

  return lines.join("\n");
}

function escapeInlineCode(s: string): string {
  return s.replace(/`/g, "\\`");
}

function formatSource(source: { fileName: string; lineNumber: number; columnNumber?: number }): string {
  let path = source.fileName;
  // Trim noisy absolute prefixes so the agent gets a project-relative path
  // when possible (matches /src/, /app/, /pages/, /components/, /lib/).
  const m = path.match(/\/(src|app|pages|components|lib|packages)\//);
  if (m && typeof m.index === "number") path = path.slice(m.index + 1);
  return source.columnNumber
    ? `${path}:${source.lineNumber}:${source.columnNumber}`
    : `${path}:${source.lineNumber}`;
}

function formatElementTag(tag: string, attrs: Record<string, string> | undefined): string {
  if (!attrs) return `<${tag}>`;
  const parts: string[] = [];
  for (const name of Object.keys(attrs)) {
    parts.push(`${name}=${JSON.stringify(attrs[name])}`);
  }
  if (parts.length === 0) return `<${tag}>`;
  return `<${tag} ${parts.join(" ")}>`;
}

function blockquote(body: string): string {
  const trimmed = body.replace(/\s+$/g, "");
  if (!trimmed) return "> _(empty)_";
  return trimmed
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n");
}
