import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { compileToReact } from '../src/react';

function article(source: string) {
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(compileToReact(source));
  return container;
}

describe('atx headings', () => {
  test.each([
    ['#', 'h1'],
    ['##', 'h2'],
    ['###', 'h3'],
    ['####', 'h4'],
    ['#####', 'h5'],
    ['######', 'h6'],
  ])('renders %s as %s', (hashes, tag) => {
    const container = article(`${hashes} Interaction`);
    const heading = container.querySelector(tag);

    expect(heading?.textContent).toBe('Interaction');
    expect(container.textContent).not.toContain('#');
  });

  test('renders inline markup inside a deep heading', () => {
    const container = article('#### 1. `capture` **native** selection');

    expect(container.querySelector('h4 code')?.textContent).toBe('capture');
    expect(container.querySelector('h4 strong')?.textContent).toBe('native');
  });

  test('anchors h2 for the table of contents and leaves deeper levels unanchored', () => {
    const container = article('## Case\n\n#### Deep\n\n##### Deeper');

    expect(container.querySelector('h2')?.getAttribute('id')).toBe('case');
    expect(container.querySelector('h4')?.hasAttribute('id')).toBe(false);
    expect(container.querySelector('h5')?.hasAttribute('id')).toBe(false);
  });

  test('leaves a seventh level as prose, the way CommonMark does', () => {
    const container = article('####### Too deep');

    expect(container.querySelector('p')?.textContent).toBe('####### Too deep');
  });

  test('leaves a hash without a space as prose', () => {
    const container = article('####Tight');

    expect(container.querySelector('p')?.textContent).toBe('####Tight');
  });

  test('keeps a hash line inside a fence literal', () => {
    const container = article('```text\n#### Not a heading\n```');

    expect(container.querySelector('h4')).toBeNull();
    expect(container.querySelector('pre')?.textContent).toBe('#### Not a heading');
  });
});
