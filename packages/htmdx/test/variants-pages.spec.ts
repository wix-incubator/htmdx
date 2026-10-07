import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { compile, extensions } from '../src';
import { setRegisteredExtensions } from '../src/components/builtins/shared/variants-context';
import * as builtinDefinitions from '../src/components/builtins';
import * as shadcnDefinitions from '../src/components/shadcn';
import type { HtmdxComponent } from '../src/components';
import { diffWords } from '../src/components/builtins/shared/text-diff';
import { variantsExample } from '../src/components/builtins/shared/variants-example';
import { pagesExample } from '../src/components/builtins/shared/pages-example';
import { readVariants, type VariantsModel } from '../src/components/builtins/shared/variants-model';
import { compileToReact } from '../src/react';

const definitions = [...Object.values(builtinDefinitions), ...Object.values(shadcnDefinitions)];

const render = (source: string, extra: HtmdxComponent[] = []) =>
  renderToStaticMarkup(compileToReact(source, { definitions: [...definitions, ...extra] }));

// The model is built from compiled children, so compile the source under a
// stand-in for Variants and read the props it receives.
function modelOf(source: string): VariantsModel {
  let model: VariantsModel | undefined;
  const Capture = (props: Record<string, unknown>) => {
    model = readVariants(props);
    return null;
  };
  renderToStaticMarkup(
    compileToReact(source, {
      definitions: [
        ...definitions.filter((definition) => definition.name !== 'Variants'),
        { ...builtinDefinitions.Variants, Component: Capture },
      ],
    }),
  );
  return model!;
}

const variants = (attrs = '', extra = '') => `<Variants name="Banner"${attrs}>

<VariantTemplate>
<div><b><TextSlot name="title" /></b> <a href="/x"><TextSlot name="cta" /></a></div>
</VariantTemplate>

<Variant current="true">
- title: Save Changes
- cta: Learn More
</Variant>

<Variant label="Plain" why="Shorter.">
- title: Save changes
- cta: How it works
</Variant>
${extra}
</Variants>`;

describe('diffWords', () => {
  test('marks a rewrite, a recapitalization, and a pure cut differently', () => {
    expect(diffWords('Try Again', 'Try again')).toEqual([
      { kind: 'same', text: 'Try ' },
      { kind: 'cased', text: 'again' },
    ]);
    expect(diffWords('Select a gender', 'Select')).toEqual([
      { kind: 'same', text: 'Select' },
      { kind: 'cut', text: 'a gender' },
    ]);
    expect(diffWords('', 'New text')).toEqual([{ kind: 'changed', text: 'New text' }]);
  });

  test('merges short unchanged gaps into one changed phrase', () => {
    expect(diffWords('one two three', 'x two y').filter((s) => s.kind === 'changed')).toEqual([
      { kind: 'changed', text: 'x two y' },
    ]);
  });
});

describe('TextDiff', () => {
  test('renders the after text with marks', () => {
    const html = render('<TextDiff before="Select a Gender" after="Select a gender now" />');
    expect(html).toContain('<mark class="htmdx-diff-case">gender</mark>');
    expect(html).toContain('<mark class="htmdx-diff"> now</mark>');
  });
});

describe('Variants model', () => {
  test('inherits the current slots and applies overrides', () => {
    const model = modelOf(
      variants(
        '',
        `<Variant label="Title only" overrides='{"cta":"See how and why"}'>\n- title: Saved\n</Variant>`,
      ),
    );
    expect(model.current?.values).toEqual({ title: 'Save Changes', cta: 'Learn More' });
    expect(model.variants[1].values).toEqual({ title: 'Saved', cta: 'See how and why' });
  });

  test('accepts a bare current attribute two levels deep', () => {
    const model = modelOf(
      `<Pages>\n\n<Page title="P">\n\n${variants().replace('<Variant current="true">', '<Variant current>')}\n\n</Page>\n\n</Pages>`
        .replace('<Pages>', '<Card>\n<CardContent>')
        .replace('</Pages>', '</CardContent>\n</Card>')
        .replace(/<\/?Page[^>]*>/g, ''),
    );
    expect(model.current?.values.title).toBe('Save Changes');
  });

  test.each([
    [
      variants().replace('<VariantTemplate>', '<VariantTemplate name="other">'),
      'needs a <VariantTemplate>',
    ],
    [variants(' chosen="3"'), 'chosen="3" does not name a variant'],
    [
      variants().replace('- cta: How it works', '- cta: How\n- cta: Twice'),
      'not a usable slot name',
    ],
  ])('rejects a mistake with a message that names it', (source, message) => {
    expect(() => modelOf(source)).toThrow(message);
  });
});

describe('Variants', () => {
  test('compiles the canonical example', () => {
    const html = render(variantsExample);
    expect(html).toContain('data-htmdx-component="Variants"');
    expect(html).toContain('Version 2');
    expect(html).toContain('<mark class="htmdx-diff"> yet</mark>');
  });

  test('moves the chosen variant under the current one, with its tag', () => {
    const html = render(variants(' chosen="1" chosenLabel="Final"'));
    expect(html).toContain('htmdx-variants-tag is-chosen">Final</span>');
    expect(html.indexOf('Version 1')).toBeLessThan(html.lastIndexOf('Before') + 2000);
  });

  test('renders slot text as text, never as markup', () => {
    const html = render(
      variants().replace('- cta: Learn More', '- cta: Use &lt;img src=x onerror=alert(1)&gt;'),
    );
    expect(html).toContain('Use &lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img src="x"');
  });

  test('links a slot to a URL each variant can change, keeping only safe ones', () => {
    const html = render(
      variants()
        .replace(
          '<a href="/x"><TextSlot name="cta" /></a>',
          '<TextSlot name="cta" href="ctaUrl" />',
        )
        .replace('- cta: Learn More', '- cta: Learn More\n- ctaUrl: https://example.com/a')
        .replace('- cta: How it works', '- cta: How it works\n- ctaUrl: javascript:alert(1)'),
    );
    expect(html).toContain('href="https://example.com/a"');
    expect(html).not.toContain('javascript:');
  });

  test('lets a wrapping component add controls through the extension context', () => {
    const Wrapper: HtmdxComponent = {
      name: 'PickWrapper',
      purpose: 'Test wrapper.',
      example: '<PickWrapper />',
      body: 'htmdx',
      Component: ({ children }: { children?: ReactNode }) =>
        createElement(
          extensions.VariantsExtensionContext.Provider,
          {
            value: {
              actions: ({ ref }) => createElement('button', { className: 'pick' }, `Pick ${ref}`),
              selected: ({ ref }) => ref === 0,
            },
          },
          children,
        ),
    };
    const html = render(`<PickWrapper>\n\n${variants()}\n\n</PickWrapper>`, [Wrapper]);
    expect(html).toContain('<button class="pick">Pick 0</button>');
    expect(html).toContain('htmdx-variants-panel is-variant is-selected');
  });

  test('explains where its parts belong when used alone', () => {
    expect(compile('<Variant current="true">\n- title: Hi\n</Variant>')).toEqual({
      ok: false,
      error: '<Variant> only works inside <Variants>',
    });
  });
});

describe('Pages', () => {
  test('starts on the overview with a tile per page and lists pages kept out of the nav', () => {
    const html = render(pagesExample);
    expect(html).toContain('data-htmdx-component="Pages"');
    expect(html).toContain('Screens reviewed (2)');
    expect(html).toContain('Two screens of the brand filter');
    expect(html).toContain('Also covered');
    expect(html).toContain('Saved toast');
    // A tile previews only the current variant.
    expect(html).toContain('No Brands');
    expect(html).not.toContain('Version 1');
  });

  test('marks a page in the nav and on its tile with the status an extension sets', () => {
    const Wrapper: HtmdxComponent = {
      name: 'StatusWrapper',
      purpose: 'Test wrapper.',
      example: '<StatusWrapper />',
      body: 'htmdx',
      Component: ({ children }: { children?: ReactNode }) =>
        createElement(
          extensions.PagesExtensionContext.Provider,
          { value: { status: (page) => (page.title === 'Empty state' ? 'final' : null) } },
          children,
        ),
    };
    const html = render(`<StatusWrapper>\n\n${pagesExample}\n\n</StatusWrapper>`, [Wrapper]);
    expect(html).toContain('htmdx-pages-tile is-final');
    expect(html).toContain('✓ Final');
    expect(html).toContain('htmdx-pages-check is-final');
  });

  test('shares a named screenshot across pages and draws the reuse, not the declaration', () => {
    const html = render(
      `<Pages>\n\n<Screenshot name="home" src="https://example.com/home.png" alt="Home" />\n\n<Page title="A">\n\n<Screenshot use="home" highlight='{"x":1,"y":2,"w":3,"h":4}' />\n\n</Page>\n\n</Pages>`,
    );
    // The overview shows no screenshot: the declaration is not drawn, and
    // tiles preview without screenshots.
    expect(html).not.toContain('home.png');
  });

  test('rejects a screenshot reuse with no matching name', () => {
    expect(compile('<Screenshot use="nope" />')).toMatchObject({
      ok: false,
      error: expect.stringContaining('no screenshot named "nope"'),
    });
  });
});

describe('extensions registered without a wrapping tag', () => {
  test('reach Pages and Variants, and Pages passes its name and data attributes', () => {
    const seen: string[] = [];
    setRegisteredExtensions({
      pages: {
        status: (page, info) => {
          seen.push(`${info.name}:${info.data.revision}:${page.title}`);
          return 'selected';
        },
        after: (info) => createElement('div', { className: 'after' }, `${info.pages.length} pages`),
      },
      variants: {
        actions: ({ ref }) => createElement('button', { className: 'pick' }, `Pick ${ref}`),
      },
    });
    try {
      const html = render(
        pagesExample.replace(
          '<Pages tilesLabel="Screens reviewed">',
          '<Pages name="Brand filter" data-revision="2" tilesLabel="Screens reviewed">',
        ),
      );
      expect(html).toContain('<div class="after">3 pages</div>');
      expect(seen).toContain('Brand filter:2:Empty state');
      expect(html).toContain('htmdx-pages-tile is-selected');
      expect(render(variantsExample)).toContain('<button class="pick">Pick 0</button>');
    } finally {
      setRegisteredExtensions({ pages: {}, variants: {} });
    }
  });

  test('read their store, so the components redraw when it changes', () => {
    let reads = 0;
    const store = {
      subscribe: () => () => {},
      getSnapshot: () => {
        reads += 1;
        return 1;
      },
    };
    setRegisteredExtensions({ variants: store });
    try {
      render(variantsExample);
      expect(reads).toBeGreaterThan(0);
    } finally {
      setRegisteredExtensions({ variants: {} });
    }
  });
});

describe('Premises', () => {
  test('splits bold-label facts from assumptions and nests points', () => {
    const html = render(
      '<Premises note="From the code.">\n- **What it is:** Shoppers filter by brand.\n- Brands come from Products:\n  - in the panel\n</Premises>',
    );
    expect(html).toContain('About this feature');
    expect(html).toContain('<div class="htmdx-premises-label">What it is</div>');
    expect(html).toContain('From the code.');
    expect(html).toMatch(/Brands come from Products:.*<ul><li>.*in the panel/);
  });
});
