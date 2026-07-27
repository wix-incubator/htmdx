import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { compileToReact } from '../src/react';

function render(source: string) {
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(compileToReact(source));
  return container;
}

function article(source: string) {
  const container = render(source);
  // The table of contents is its own `ol`, so list assertions read the article.
  container.querySelector('nav.htmdx-toc')?.remove();
  return container;
}

describe('ordered lists', () => {
  test('renders a numbered block as an ol', () => {
    const list = article('## Case\n\n1. First\n2. Second').querySelector('ol');

    expect(list).not.toBeNull();
    expect(list?.hasAttribute('start')).toBe(false);
    expect([...(list?.children ?? [])].map((item) => item.textContent)).toEqual([
      'First',
      'Second',
    ]);
  });

  test('accepts the paren delimiter', () => {
    const list = article('## Case\n\n1) First\n2) Second').querySelector('ol');

    expect([...(list?.children ?? [])].map((item) => item.textContent)).toEqual([
      'First',
      'Second',
    ]);
  });

  test('carries a start attribute when the first number is not one', () => {
    const list = article('## Case\n\n5. Five\n6. Six').querySelector('ol');

    expect(list?.getAttribute('start')).toBe('5');
    expect(list?.children).toHaveLength(2);
  });

  test('keeps every item when the source repeats the same number', () => {
    const list = article('## Case\n\n1. First\n1. Second\n1. Third').querySelector('ol');

    expect(list?.children).toHaveLength(3);
  });

  test('leaves bulleted lists as they were', () => {
    const container = article('## Case\n\n- Alpha\n- Beta');

    expect(container.querySelector('ol')).toBeNull();
    expect(
      [...(container.querySelector('ul')?.children ?? [])].map((li) => li.textContent),
    ).toEqual(['Alpha', 'Beta']);
  });

  test('keeps a numbered line inside a fence literal', () => {
    const container = article('## Case\n\n```text\n1. First\n2. Second\n```');

    expect(container.querySelector('ol')).toBeNull();
    expect(container.querySelector('pre')?.textContent).toBe('1. First\n2. Second');
  });

  test('renders a numbered list after the title into the article, not the hero', () => {
    const container = render('# Doc\n\n1. First\n2. Second');

    expect(container.querySelector('.htmdx-hero-desc')?.textContent ?? '').not.toContain('First');
    container.querySelector('nav.htmdx-toc')?.remove();
    expect(
      [...(container.querySelector('ol')?.children ?? [])].map((li) => li.textContent),
    ).toEqual(['First', 'Second']);
  });
});

describe('list lines are never dropped', () => {
  test('nests an ordered list under a bullet', () => {
    const outer = article('## Case\n\n- Outer\n  1. Inner').querySelector('ul');
    const item = outer?.children[0];

    expect(item?.textContent).toContain('Outer');
    expect(item?.querySelector('ol')?.children[0]?.textContent).toBe('Inner');
  });

  test('nests a bulleted list under an ordered item', () => {
    const outer = article('## Case\n\n1. Outer\n   - Inner').querySelector('ol');
    const item = outer?.children[0];

    expect(item?.querySelector('ul')?.children[0]?.textContent).toBe('Inner');
  });

  test('nests two levels deep', () => {
    const container = article('## Case\n\n- One\n  - Two\n    1. Three');

    expect(container.querySelector('ul ul ol')?.textContent).toBe('Three');
  });

  test('returns to the outer level after a nested list', () => {
    const outer = article('## Case\n\n1. First\n   - Nested\n2. Second').querySelector('ol');

    expect(outer?.children).toHaveLength(2);
    expect(outer?.children[1]?.textContent).toBe('Second');
  });

  test('appends a continuation line to the item it follows', () => {
    const item = article('## Case\n\n- Item\n  continued here\n- Next').querySelector('li');

    expect(item?.textContent).toBe('Item continued here');
  });

  test('starts a sibling list when the marker kind changes', () => {
    const container = article('## Case\n\n- Alpha\n1. First');

    expect(container.querySelector('ul')?.children[0]?.textContent).toBe('Alpha');
    expect(container.querySelector('ol')?.children[0]?.textContent).toBe('First');
  });

  test('renders every line of a deeply indented block', () => {
    const container = article('## Case\n\n1. One\n2. Two\n   1. Two point one\n3. Three');

    expect(container.textContent).toContain('Two point one');
    expect(container.querySelector('ol')?.children).toHaveLength(3);
  });
});
