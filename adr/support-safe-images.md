# Support safe images in HTMDX source

- Status: accepted
- Date: 2026-07-21

## Context

HTMDX describes Markdown as its baseline language, but Markdown image syntax
rendered as a link. Lowercase HTML was available only inside component bodies,
so a top-level `<img>` was escaped as text. Reports could capture and package
screenshots without being able to display them.

Supporting arbitrary raw HTML would weaken the MDX-minus-JavaScript boundary and
create a larger sanitization surface than images require.

## Decision

HTMDX supports images through Markdown `![alt](src "title")` and an allowlisted
HTML `<img>` element at the top level or inside component bodies. Both syntaxes
use one sanitizer and the same responsive class.

Image sources may be relative, `http:`, `https:`, or a supported `data:image/*`
MIME type. HTML images accept only `src`, `alt`, `title`, `width`, `height`,
`loading`, `decoding`, and `class`. Unsafe schemes and event handlers do not
reach rendered markup. Image-like syntax inside code fences remains literal.

## Alternatives

- A registered `<Image>` component would make ordinary Markdown reports more
  verbose and would not repair Markdown compatibility.
- Arbitrary raw HTML would solve more cases but expand the security and language
  contract beyond the reported need.

## Consequences

Existing artifacts gain image rendering when they opt into the new runtime
version. Captions, `<picture>`, responsive source sets, fetching, proxying, and
embedding external assets remain outside the runtime contract.
