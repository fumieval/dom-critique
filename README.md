# dom-critique

A zero-dependency JavaScript library that lets you attach floating comments to
any DOM element on a page — similar in spirit to Google Docs comments.
Comments are persisted to `localStorage` and can be copied as a single
Markdown document annotated with the CSS selectors of the elements they were
attached to.

## Install

### npm

```bash
npm install dom-critique
```

### Single `<script>` tag (CDN or self-hosted)

A pre-bundled IIFE build is published with every release. Drop it into any
HTML page; the library exposes itself as the `DomCritique` global.

```html
<script src="https://github.com/fumieval/dom-critique/releases/download/v0.0.3/dom-critique.global.min.js"></script>
<script>
  const critique = DomCritique.mount();
</script>
```

Released bundles are also attached to each GitHub Release as
`dom-critique.global.js` (development) and `dom-critique.global.min.js`
(minified), both with sourcemaps.

## Usage

```ts
import { mount } from "dom-critique";

const critique = mount({
  // Optional. Defaults to `dom-critique:${location.pathname}`.
  storageKey: "dom-critique:my-page",
  // Optional. Restrict commentable elements to descendants of this root.
  // Defaults to document.body.
  root: document.body,
  // Optional. "right" (default) or "left".
  side: "right",
});

// Programmatic API
critique.getComments();    // -> Comment[]
critique.exportMarkdown(); // -> string
critique.unmount();        // remove UI and listeners
```

## How it works

- Click the floating speech-bubble button to enter **comment mode**. While in
  comment mode, hovering an element draws an outline around it; clicking the
  element opens a small composer popover anchored to it.
- Each comment is rendered as a numbered badge over its anchored element and as
  a row in the right-side sidebar, where you can edit, delete, or jump to it.
- The sidebar's **Copy as Markdown** button copies every comment on the current
  page to the clipboard as Markdown, including the CSS selector and a snippet
  of the element's text content.
- All state is persisted to `localStorage` under the configured `storageKey`.

## Markdown output format

```md
# Comments for Page Title (https://example.com/path)

## Comment 1
- Selector: `body > main > p:nth-of-type(2)`
- Element: `<p>`
- Snippet: "Lorem ipsum dolor sit amet…"
- Created: 2026-04-23T14:30:00.000Z

> The comment body goes here.
```

## License

MIT
