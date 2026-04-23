export interface Comment {
  id: string;
  selector: string;
  tag: string;
  snippet: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface MountOptions {
  storageKey?: string;
  root?: HTMLElement;
  side?: "right" | "left";
}

export interface Instance {
  unmount(): void;
  getComments(): Comment[];
  exportMarkdown(): string;
}
