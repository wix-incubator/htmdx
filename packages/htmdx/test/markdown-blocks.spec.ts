import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { compileToReact } from '../src/react';

function article(source: string) {
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(compileToReact(source));
  return container;
}

describe('blockquotes', () => {
  test('renders a quoted line', () => {
    expect(article('> quoted').querySelector('blockquote p')?.textContent).toBe('quoted');
  });

  test('joins the lines of one quoted paragraph', () => {
    expect(article('> one\n> two').querySelector('blockquote p')?.textContent).toBe('one two');
  });

  test('accepts a marker without a trailing space', () => {
    expect(article('>quoted').querySelector('blockquote p')?.textContent).toBe('quoted');
  });

  test('renders inline markup inside the quote', () => {
    expect(article('> a *quoted* word').querySelector('blockquote em')?.textContent).toBe('quoted');
  });

  test('keeps a list inside the quote a list', () => {
    const items = article('> - alpha\n> - beta').querySelectorAll('blockquote li');

    expect([...items].map((item) => item.textContent)).toEqual(['alpha', 'beta']);
  });

  test('keeps a heading inside the quote a heading', () => {
    expect(article('> ### inside').querySelector('blockquote h3')?.textContent).toBe('inside');
  });

  test('anchors a quoted h2 the way an unquoted one is anchored', () => {
    expect(article('> ## Quoted heading').querySelector('blockquote h2')?.getAttribute('id')).toBe(
      'quoted-heading',
    );
  });

  test('nests a quote inside a quote', () => {
    expect(article('> > deeper').querySelector('blockquote blockquote p')?.textContent).toBe(
      'deeper',
    );
  });

  test('keeps a fenced block inside the quote', () => {
    expect(
      article('> ```js\n> const a = 1;\n> ```').querySelector('blockquote pre')?.textContent,
    ).toBe('const a = 1;');
  });

  test('leaves a greater-than sign in prose alone', () => {
    const container = article('a > b in an inequality');

    expect(container.querySelector('blockquote')).toBeNull();
    expect(container.querySelector('p')?.textContent).toBe('a > b in an inequality');
  });
});

describe('thematic breaks', () => {
  test.each(['---', '***', '___', '- - -', '* * *', '----------', '   ---'])(
    'renders %j as an hr',
    (source) => {
      const container = article(`before\n\n${source}\n\nafter`);

      expect(container.querySelector('hr')).not.toBeNull();
      expect(container.querySelectorAll('p')).toHaveLength(2);
    },
  );

  test('wins over the list reading of the same line', () => {
    const container = article('- - -');

    expect(container.querySelector('hr')).not.toBeNull();
    expect(container.querySelector('ul')).toBeNull();
  });

  test.each(['--', '__', 'a---', '--- text'])('leaves %j as prose', (source) => {
    const container = article(source);

    expect(container.querySelector('hr')).toBeNull();
    expect(container.textContent).toContain(source.trim());
  });

  test('keeps a dashed line inside a fence literal', () => {
    const container = article('```text\n---\n```');

    expect(container.querySelector('hr')).toBeNull();
    expect(container.querySelector('pre')?.textContent).toBe('---');
  });

  test('leaves emphasis that only looks like a break alone', () => {
    expect(article('***bold***').querySelector('hr')).toBeNull();
  });
});

describe('block-level HTML', () => {
  // A void block element used to stay inside the markdown block, which wrapped
  // it in the surrounding paragraph: browsers close the `p` at the `hr` and the
  // React tree stopped matching the DOM.
  test('does not nest an hr inside a paragraph', () => {
    const container = article('before\n\n<hr>\n\nafter');

    expect(container.querySelector('hr')).not.toBeNull();
    expect(container.querySelector('p hr')).toBeNull();
  });

  test('keeps an inline void element in its paragraph', () => {
    expect(article('one<br>two').querySelector('p br')).not.toBeNull();
  });
});
