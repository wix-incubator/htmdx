import { createElement, type ReactNode } from 'react';
import { describe, expect, test } from 'vitest';
import { compile, registerComponent, validate } from '../src';
import { snapshot } from '../src/testing';
import type { HtmdxComponent } from '../src/components';

const query = (source: string, selector: string) => {
  const rendered = compile(source);
  const container = document.createElement('div');
  container.innerHTML = rendered.ok ? rendered.html : '';
  return container.querySelector(selector);
};

const definition = (
  value: Pick<HtmdxComponent, 'name' | 'body' | 'Component'>,
): HtmdxComponent => ({
  purpose: `Purpose for ${value.name}`,
  example: `<${value.name} />`,
  ...value,
});

describe('inline SVG', () => {
  test('renders a block-level graphic with its shape attributes', () => {
    const circle = query(
      '<svg viewBox="0 0 24 24" width="48" height="48">\n<circle cx="12" cy="12" r="10" fill="#0af" stroke="#036" stroke-width="2"></circle>\n</svg>',
      'svg circle',
    );

    expect(circle?.closest('svg')?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(circle?.getAttribute('cx')).toBe('12');
    expect(circle?.getAttribute('fill')).toBe('#0af');
    expect(circle?.getAttribute('stroke-width')).toBe('2');
  });

  test('renders a graphic written mid-sentence inside the paragraph', () => {
    const rendered = compile(
      'Rating <svg viewBox="0 0 10 10" width="12"><path d="M0 0 L10 10"/></svg> of five.',
    );

    expect(rendered.ok && rendered.html).toContain('<p>Rating <svg');
    expect(rendered.ok && rendered.html).toContain('<path d="M0 0 L10 10"></path>');
  });

  test('keeps case-sensitive element names', () => {
    const rendered = compile(
      '<svg viewBox="0 0 100 20">\n<defs><linearGradient id="g"><stop offset="0" stop-color="#f00"></stop></linearGradient></defs>\n<rect width="100" height="20" fill="url(#g)"></rect>\n</svg>',
    );

    expect(rendered.ok && rendered.html).toContain('<linearGradient id="g">');
    expect(rendered.ok && rendered.html).toContain('fill="url(#g)"');
  });

  // The XML parse keeps `linearGradient` as written, but a bare attribute
  // anywhere in the block forces the forgiving HTML parse, which uppercases
  // every tag name. The allowlist is what restores the canonical casing.
  test('restores canonical casing when the parse flattens it', () => {
    const rendered = compile(
      '<svg viewBox="0 0 20 20">\n<defs><lineargradient id="g"><stop offset="0"></stop></lineargradient></defs>\n<circle r="4" fill="url(#g)"></circle>\n</svg>',
    );

    expect(rendered.ok && rendered.html).toContain('<linearGradient id="g">');
  });

  test('renders text content as written, without Markdown', () => {
    const text = query(
      '<svg viewBox="0 0 100 20"><text x="4" y="14" font-size="12" text-anchor="start">**Hello**</text></svg>',
      'svg text',
    );

    expect(text?.textContent).toBe('**Hello**');
    expect(text?.getAttribute('font-size')).toBe('12');
    expect(text?.querySelector('strong')).toBe(null);
  });

  test('keeps a graphic inside a raw HTML block alongside Markdown', () => {
    const wrapper = query(
      '<div class="chart">\n\n## Revenue\n\n<svg viewBox="0 0 10 10"><circle r="4"></circle></svg>\n\n</div>',
      'div.chart',
    );

    expect(wrapper?.querySelector('h2')?.textContent).toBe('Revenue');
    expect(wrapper?.querySelector('svg circle')?.getAttribute('r')).toBe('4');
  });

  test('renders a graphic inside a component body', () => {
    registerComponent(
      definition({
        name: 'SvgBody',
        body: 'htmdx',
        Component: ({ children }: { children?: ReactNode }) =>
          createElement('section', null, children),
      }),
    );
    const rendered = compile(
      '<SvgBody>\n<svg viewBox="0 0 10 10"><circle r="4" fill="#0af"></circle></svg>\n</SvgBody>',
    );

    expect(rendered.ok && rendered.html).toContain(
      '<svg viewBox="0 0 10 10"><circle r="4" fill="#0af"></circle></svg>',
    );
  });

  test('allows a same-document reference on textPath', () => {
    const rendered = compile(
      '<svg viewBox="0 0 100 20"><defs><path id="p" d="M0 10 H100"></path></defs><text><textPath href="#p">Curved</textPath></text></svg>',
    );

    expect(rendered.ok && rendered.html).toContain('<textPath href="#p">Curved</textPath>');
  });

  test('drops a reference that leaves the document', () => {
    const rendered = compile(
      '<svg viewBox="0 0 100 20"><text><textPath href="https://evil.example/x#p">Curved</textPath></text></svg>',
    );

    expect(rendered.ok && rendered.html).toContain('<textPath>Curved</textPath>');
    expect(rendered.ok && rendered.html).not.toContain('evil.example');
  });

  test('drops a paint value pointing outside the document', () => {
    const rect = query(
      '<svg viewBox="0 0 10 10"><rect width="10" height="10" fill="url(https://evil.example/x)"></rect></svg>',
      'svg rect',
    );

    expect(rect?.hasAttribute('fill')).toBe(false);
  });

  test('sanitizes style declarations on a shape', () => {
    const circle = query(
      '<svg viewBox="0 0 10 10"><circle r="4" style="fill: red; background-image: url(javascript:alert(1))"></circle></svg>',
      'svg circle',
    );

    expect(circle?.getAttribute('style')).toBe('fill: red;');
  });

  test('rejects event handler attributes', () => {
    const rendered = compile(
      '<svg viewBox="0 0 10 10"><circle r="4" onclick="alert(1)"></circle></svg>',
    );

    expect(rendered.ok).toBe(false);
    expect(!rendered.ok && rendered.error).toContain('onclick');
  });

  // The elements that can reach out of the graphic — into script, into HTML,
  // or into another document — are not markup here, so they render as the text
  // they were written as rather than failing the document.
  test.each([
    ['script', '<script>alert(1)</script>'],
    ['foreignObject', '<foreignObject width="10" height="10"><div>x</div></foreignObject>'],
    ['use', '<use href="/sprite.svg#icon"></use>'],
    ['image', '<image href="https://evil.example/x.png"></image>'],
    ['animate', '<animate attributeName="href" to="javascript:alert(1)"></animate>'],
  ])('keeps <%s> literal inside a graphic', (name, markup) => {
    const rendered = compile(
      `<svg viewBox="0 0 10 10">\n${markup}\n<circle r="4"></circle>\n</svg>`,
    );

    expect(rendered.ok).toBe(true);
    expect(rendered.ok && rendered.html).toContain(`&lt;${name}`);
    expect(rendered.ok && rendered.html).toContain('<circle r="4">');
  });

  test('keeps an SVG element written outside a graphic as prose', () => {
    const rendered = compile('A bare <path d="M0 0"/> in prose.');

    expect(rendered.ok && rendered.html).toContain('&lt;path d="M0 0"/&gt;');
    expect(rendered.ok && rendered.html).not.toContain('<path');
  });

  test('keeps SVG inside code fences and spans literal', () => {
    const rendered = compile(
      '```html\n<svg><circle/></svg>\n```\n\nInline `<svg viewBox="0 0 1 1">` stays text.',
    );

    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';

    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('pre')?.textContent).toBe('<svg><circle/></svg>');
    expect(container.querySelector('pre > code')?.className).toBe('language-html');
    expect(container.querySelector('p')?.innerHTML).toContain(
      '<code>&lt;svg viewBox="0 0 1 1"&gt;</code>',
    );
  });

  test('reports a registered component used inside a graphic', () => {
    registerComponent(
      definition({
        name: 'NotInSvg',
        body: 'none',
        Component: () => createElement('em', null, 'nope'),
      }),
    );
    const rendered = compile('<svg viewBox="0 0 10 10"><NotInSvg /></svg>');

    expect(rendered.ok).toBe(false);
    expect(!rendered.ok && rendered.error).toContain('<NotInSvg> is not allowed inside <svg>');
  });

  test('still reports an unknown capitalized tag inside a graphic', () => {
    const rendered = compile('<svg viewBox="0 0 10 10"><NotRegisteredAtAll /></svg>');

    expect(rendered.ok).toBe(false);
    expect(!rendered.ok && rendered.error).toContain('unknown component <NotRegisteredAtAll>');
  });

  test('reports event handlers in a graphic without rendering it', () => {
    const diagnostics = validate(
      '<svg viewBox="0 0 10 10"><circle onclick="go()"></circle></svg>\n',
    );

    expect(diagnostics.map(({ code }) => code)).toEqual(['event-handler-attribute']);
  });

  test('does not report a graphic that only degrades', () => {
    expect(validate('<svg viewBox="0 0 10 10">\n<script>alert(1)</script>\n</svg>\n')).toEqual([]);
  });

  test('snapshots a graphic as the elements it was written as', () => {
    expect(snapshot('<svg viewBox="0 0 10 10">\n<circle r="4"></circle>\n</svg>\n')).toBe(
      ['<svg viewBox="0 0 10 10">', '  <circle r="4" />'].join('\n'),
    );
  });

  // Every filter primitive computes from the source graphic and its siblings.
  // None of them fetches, which is what separates the list from `<feImage>`.
  test('renders a texture filter built from local primitives', () => {
    const rendered = compile(
      '<svg viewBox="0 0 10 10"><defs><filter id="f"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="4"></feTurbulence><feDisplacementMap in="SourceGraphic" scale="6" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap><feMorphology operator="dilate" radius="1"></feMorphology></filter></defs><rect width="10" height="10" filter="url(#f)"></rect></svg>',
    );

    expect(rendered.ok && rendered.html).toContain(
      '<feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="4">',
    );
    expect(rendered.ok && rendered.html).toContain(
      '<feDisplacementMap in="SourceGraphic" scale="6" xChannelSelector="R" yChannelSelector="G">',
    );
    expect(rendered.ok && rendered.html).toContain('<feMorphology operator="dilate" radius="1">');
  });

  test('renders a lighting filter with its light source and transfer functions', () => {
    const rendered = compile(
      '<svg viewBox="0 0 10 10"><defs><filter id="f"><feDiffuseLighting surfaceScale="2" diffuseConstant="1" lighting-color="#fff"><feSpotLight x="1" y="1" z="4" pointsAtX="5" pointsAtY="5" limitingConeAngle="30"></feSpotLight></feDiffuseLighting><feComponentTransfer><feFuncR type="table" tableValues="0 1"></feFuncR></feComponentTransfer></filter></defs></svg>',
    );

    expect(rendered.ok && rendered.html).toContain('surfaceScale="2"');
    expect(rendered.ok && rendered.html).toContain(
      '<feSpotLight x="1" y="1" z="4" pointsAtX="5" pointsAtY="5" limitingConeAngle="30">',
    );
    expect(rendered.ok && rendered.html).toContain('<feFuncR type="table" tableValues="0 1">');
  });

  // A hyphenated SVG attribute is only useful if React emits it hyphenated
  // again. SVG attribute names are case sensitive, so a `maskType` that never
  // becomes `mask-type` is a silently dead attribute rather than a loud error.
  test.each([
    ['color-interpolation-filters', 'linearRGB'],
    ['image-rendering', 'pixelated'],
    ['lighting-color', '#fff'],
    ['mask-type', 'alpha'],
    ['mix-blend-mode', 'multiply'],
    ['paint-order', 'stroke'],
    ['pointer-events', 'none'],
    ['vector-effect', 'non-scaling-stroke'],
  ])('round-trips %s as a hyphenated attribute', (attribute, value) => {
    const group = query(
      `<svg viewBox="0 0 10 10"><g ${attribute}="${value}"><circle r="4"></circle></g></svg>`,
      'svg g',
    );

    expect(group?.getAttribute(attribute)).toBe(value);
  });

  test('renders a conditional switch', () => {
    const rendered = compile(
      '<svg viewBox="0 0 100 20"><switch><text systemLanguage="de" x="2" y="14">Umsatz</text><text x="2" y="14">Revenue</text></switch></svg>',
    );

    expect(rendered.ok && rendered.html).toContain('<switch>');
    expect(rendered.ok && rendered.html).toContain('systemLanguage="de"');
  });

  // Every other filter primitive is local compute; `<feImage>` loads a document.
  // DOMPurify allows it, this allowlist does not.
  test('keeps <feImage> literal inside a filter', () => {
    const rendered = compile(
      '<svg viewBox="0 0 10 10">\n<filter id="f"><feImage href="https://evil.example/x.png"></feImage></filter>\n<rect width="10" height="10"></rect>\n</svg>',
    );

    expect(rendered.ok).toBe(true);
    expect(rendered.ok && rendered.html).toContain('&lt;feImage');
    // The URL survives as escaped text, which is inert. What must not survive
    // is an `feImage` element that would fetch it.
    expect(rendered.ok && rendered.html).not.toContain('<feImage');
  });

  test('renders a transform animation', () => {
    const rendered = compile(
      '<svg viewBox="0 0 40 40"><rect x="10" y="10" width="20" height="20"><animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="4s" repeatCount="indefinite"></animateTransform></rect></svg>',
    );

    expect(rendered.ok && rendered.html).toContain(
      '<animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="4s" repeatCount="indefinite">',
    );
  });

  test('renders motion along a path referenced by <mpath>', () => {
    const rendered = compile(
      '<svg viewBox="0 0 100 40"><path id="track" d="M0 20 H100" fill="none"></path><circle r="4"><animateMotion dur="3s" repeatCount="indefinite" rotate="auto"><mpath href="#track"></mpath></animateMotion></circle></svg>',
    );

    expect(rendered.ok && rendered.html).toContain('<animateMotion dur="3s"');
    expect(rendered.ok && rendered.html).toContain('rotate="auto"');
    expect(rendered.ok && rendered.html).toContain('<mpath href="#track">');
  });

  test('renders motion from an inline path', () => {
    const rendered = compile(
      '<svg viewBox="0 0 100 40"><circle r="4"><animateMotion path="M0 20 Q50 0 100 20" dur="3s" keyPoints="0;1" keyTimes="0;1" calcMode="linear"></animateMotion></circle></svg>',
    );

    expect(rendered.ok && rendered.html).toContain(
      '<animateMotion path="M0 20 Q50 0 100 20" dur="3s" keyPoints="0;1" keyTimes="0;1" calcMode="linear">',
    );
  });

  // `attributeName` is the one attribute in SVG that retargets what an element
  // writes to. Left open, an animation could aim at an `href` and turn a static
  // reference into a moving one after the compile has already checked it. It is
  // pinned to the three transform properties, so the retarget has nowhere to go.
  test.each(['href', 'xlink:href', 'fill', 'class', 'style'])(
    'drops attributeName="%s"',
    (target) => {
      const rendered = compile(
        `<svg viewBox="0 0 10 10"><rect width="10" height="10"><animateTransform attributeName="${target}" to="x" dur="1s"></animateTransform></rect></svg>`,
      );

      expect(rendered.ok && rendered.html).toContain('<animateTransform');
      expect(rendered.ok && rendered.html).not.toContain('attributeName');
    },
  );

  test.each(['transform', 'gradientTransform', 'patternTransform'])(
    'keeps attributeName="%s"',
    (target) => {
      const rendered = compile(
        `<svg viewBox="0 0 10 10"><rect width="10" height="10"><animateTransform attributeName="${target}" type="scale" to="2" dur="1s"></animateTransform></rect></svg>`,
      );

      expect(rendered.ok && rendered.html).toContain(`<animateTransform attributeName="${target}"`);
    },
  );

  // A component body passes unknown tags through with their attributes, which
  // is how documents written before the allowlist keep compiling. That leniency
  // stops at `<svg>`: inside a graphic the SVG rules apply wherever the graphic
  // was written.
  test('keeps the attributeName rule inside a component body', () => {
    registerComponent(
      definition({
        name: 'SvgAnimationBody',
        body: 'htmdx',
        Component: ({ children }: { children?: ReactNode }) =>
          createElement('section', null, children),
      }),
    );
    const rendered = compile(
      '<SvgAnimationBody>\n<svg viewBox="0 0 10 10"><rect width="10" height="10"><animateTransform attributeName="href" to="x"></animateTransform></rect></svg>\n</SvgAnimationBody>',
    );

    expect(rendered.ok && rendered.html).toContain('<animateTransform to="x">');
    expect(rendered.ok && rendered.html).not.toContain('attributeName');
  });

  test('drops an <mpath> reference that leaves the document', () => {
    const rendered = compile(
      '<svg viewBox="0 0 10 10"><circle r="4"><animateMotion dur="1s"><mpath href="https://evil.example/x.svg#track"></mpath></animateMotion></circle></svg>',
    );

    expect(rendered.ok && rendered.html).toContain('<mpath>');
    expect(rendered.ok && rendered.html).not.toContain('evil.example');
  });

  // `<animate>` and `<set>` take a free-form `attributeName` by design — that is
  // the whole point of them. Pinning it would leave nothing useful behind, so
  // they stay out rather than becoming a narrower version of themselves.
  test.each(['animate', 'set'])('keeps <%s> literal', (element) => {
    const rendered = compile(
      `<svg viewBox="0 0 10 10">\n<rect width="10" height="10"><${element} attributeName="href" to="x"></${element}></rect>\n</svg>`,
    );

    expect(rendered.ok).toBe(true);
    expect(rendered.ok && rendered.html).toContain(`&lt;${element}`);
    expect(rendered.ok && rendered.html).not.toContain(`<${element} `);
  });
});
