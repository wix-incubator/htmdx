import { VERSION } from '../src/version';

// The htmdx artifact contract from examples/decision-brief.html: one HTML
// file whose body is a text/htmdx script block.
export function wrapHtmdx(source: string, title: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <script src="https://cdn.jsdelivr.net/npm/@wix/htmdx@${VERSION}/dist/browser.js" defer></script>
  </head>
  <body>
    <script type="text/htmdx">
${source}
    </script>
  </body>
</html>
`;
}

// The same shell for a pre-compiled artifact: static markup that still needs
// Tailwind for the shadcn/ui utility classes.
export function wrapCompiled(html: string, title: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4" defer></script>
  </head>
  <body>
${html}
  </body>
</html>
`;
}
