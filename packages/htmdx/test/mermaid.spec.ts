import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';
import { compile } from '../src/index';
import { safeCss, svgToDiagram } from '../src/react/mermaid';

const mermaidLike = (body: string, style = '#htmdx-mermaid-1 .node rect{fill:#eee;}') =>
  `<svg id="htmdx-mermaid-1" xmlns="http://www.w3.org/2000/svg" class="flowchart" viewBox="0 0 100 50" role="graphics-document document" aria-roledescription="flowchart-v2"><style>${style}</style>${body}</svg>`;

describe('mermaid fences', () => {
  // Until mermaid loads the fence is a code block like any other, chrome
  // included, so a diagram that never upgrades does not read as a broken one.
  test('compiles synchronously to the diagram source', () => {
    const rendered = compile('```mermaid\nflowchart LR\n  A --> B\n```');
    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';

    expect(container.querySelector('.htmdx-code-block code')?.className).toBe('language-mermaid');
    expect(container.querySelector('.htmdx-code-block')?.textContent).toBe(
      'flowchart LR\n  A --> B',
    );
  });
});

describe('mermaid output sanitizer', () => {
  test('keeps the shapes and text mermaid actually draws', () => {
    const { svg, css } = svgToDiagram(
      mermaidLike(
        '<g class="node" transform="translate(8,8)"><rect x="0" y="0" width="40" height="20" rx="4" style="stroke-width: 2;"/><text dy="0.3em" text-anchor="middle"><tspan x="20">Start</tspan></text></g><path d="M48,18L80,18" marker-end="url(#htmdx-mermaid-1_pointEnd)"/>',
      ),
    );
    const html = renderToStaticMarkup(svg);

    expect(html).toContain('<rect x="0" y="0" width="40" height="20" rx="4"');
    expect(html).toContain('<tspan x="20">Start</tspan>');
    expect(html).toContain('marker-end="url(#htmdx-mermaid-1_pointEnd)"');
    expect(html).toContain('viewBox="0 0 100 50"');
    expect(css).toContain('.node rect');
  });

  test('drops elements the SVG allowlist excludes', () => {
    const { svg } = svgToDiagram(
      mermaidLike(
        '<foreignObject width="40" height="20"><div xmlns="http://www.w3.org/1999/xhtml">label</div></foreignObject><use href="#other"/><image href="https://example.test/x.png"/><rect width="4" height="4"/>',
      ),
    );
    const html = renderToStaticMarkup(svg);

    expect(html).not.toContain('foreignObject');
    expect(html).not.toContain('<use');
    expect(html).not.toContain('<image');
    expect(html).toContain('<rect width="4" height="4"');
  });

  test('refuses a diagram carrying an event handler', () => {
    expect(() =>
      svgToDiagram(mermaidLike('<rect width="4" height="4" onclick="alert(1)"/>')),
    ).toThrow(/event handler attribute/);
  });

  test('does not let a diagram reach another document through href', () => {
    const { svg } = svgToDiagram(
      mermaidLike('<text><textPath href="https://example.test/evil#p">x</textPath></text>'),
    );

    expect(renderToStaticMarkup(svg)).not.toContain('example.test');
  });

  test('drops a stylesheet that fetches a remote resource', () => {
    expect(safeCss('@import url("https://example.test/x.css");.a{fill:red;}')).toBe('');
    expect(safeCss('.a{background:image-set("https://example.test/x.png" 1x);}')).toBe('');
    expect(safeCss('.a{background:url(https://example.test/x.png);}')).toBe('');
    expect(safeCss('.a{width:expression(alert(1));}')).toBe('');
  });

  test('keeps a stylesheet that only references the diagram itself', () => {
    const css = '#htmdx-mermaid-1 .edge{marker-end:url(#htmdx-mermaid-1_pointEnd);}';

    expect(safeCss(css)).toBe(css);
  });

  test('warns once with the names it dropped', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    svgToDiagram(mermaidLike('<foreignObject/><foreignObject/><use href="#a"/>'));

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('<foreignobject>, <use>');
    warn.mockRestore();
  });

  test('rejects output that is not an SVG document', () => {
    expect(() => svgToDiagram('<div>not a diagram</div>')).toThrow(/<svg>/);
  });
});
