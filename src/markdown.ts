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
