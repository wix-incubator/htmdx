import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { compileToReact } from '../src/react';

function article(source: string) {
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(compileToReact(source));
  return container;
}

describe('GFM tables', () => {
  test('renders a pipe table as rows and columns', () => {
    const container = article(`| Feature | Expected result |
| --- | --- |
| Heading | Rendered as a heading |
| Code | Shown in a code block |
| Table | Shown as rows and columns |`);

    expect([...container.querySelectorAll('thead th')].map((cell) => cell.textContent)).toEqual([
      'Feature',
      'Expected result',
    ]);
    expect(
      [...container.querySelectorAll('tbody tr')].map((row) =>
        [...row.querySelectorAll('td')].map((cell) => cell.textContent),
      ),
    ).toEqual([
      ['Heading', 'Rendered as a heading'],
      ['Code', 'Shown in a code block'],
      ['Table', 'Shown as rows and columns'],
    ]);
    expect(container.querySelector('p')).toBeNull();
  });

  test('renders inline Markdown and column alignment inside cells', () => {
    const container = article(`Name | Status | Count
:--- | :---: | ---:
**API** | [Ready](https://example.com) | \`12\``);
    const [left, center, right] = [...container.querySelectorAll<HTMLTableCellElement>('thead th')];

    expect(container.querySelector('tbody strong')?.textContent).toBe('API');
    expect(container.querySelector('tbody a')?.getAttribute('href')).toBe('https://example.com');
    expect(container.querySelector('tbody code')?.textContent).toBe('12');
    expect(left.style.textAlign).toBe('left');
    expect(center.style.textAlign).toBe('center');
    expect(right.style.textAlign).toBe('right');
  });

  test('does not split escaped pipes or pipes inside code spans', () => {
    const container = article(`Input | Output
--- | ---
A \\| B | \`x | y\``);

    expect([...container.querySelectorAll('tbody td')].map((cell) => cell.textContent)).toEqual([
      'A | B',
      'x | y',
    ]);
  });

  test('leaves a malformed separator row as prose', () => {
    const container = article(`Feature | Result
not a separator | ---
Table | Still prose`);

    expect(container.querySelector('table')).toBeNull();
    expect(container.querySelector('p')?.textContent).toBe(
      'Feature | Result not a separator | --- Table | Still prose',
    );
  });
});
