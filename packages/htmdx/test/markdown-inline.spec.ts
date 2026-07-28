import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { compileToReact } from '../src/react';

function article(source: string) {
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(compileToReact(source));
  return container;
}

function html(source: string) {
  return article(source).querySelector('p')?.innerHTML ?? '';
}

describe('emphasis', () => {
  test.each([
    ['*text*', '<em>text</em>'],
    ['_text_', '<em>text</em>'],
    ['**text**', '<strong>text</strong>'],
    ['__text__', '<strong>text</strong>'],
    ['***text***', '<strong><em>text</em></strong>'],
    ['___text___', '<strong><em>text</em></strong>'],
    ['~~text~~', '<del>text</del>'],
  ])('renders %s', (source, expected) => {
    expect(html(source)).toBe(expected);
  });

  test('renders two spans on one line without swallowing the gap', () => {
    expect(html('**a** and **b**')).toBe('<strong>a</strong> and <strong>b</strong>');
  });

  test('nests markup inside a span', () => {
    expect(html('**bold with `code` and *emphasis***')).toBe(
      '<strong>bold with <code>code</code> and <em>emphasis</em></strong>',
    );
  });

  test('nests markup inside link text', () => {
    expect(html('[**bold** link](https://example.com)')).toBe(
      '<a href="https://example.com"><strong>bold</strong> link</a>',
    );
  });

  test('allows a star span mid-word', () => {
    expect(html('a*b*c')).toBe('a<em>b</em>c');
  });

  test('refuses an underscore span mid-word so identifiers survive', () => {
    expect(html('snake_case_name and file_name_here')).toBe('snake_case_name and file_name_here');
  });

  test.each([
    ['2 * 3 * 4', 'multiplication'],
    ['a _ b _ c', 'a spaced underscore'],
    ['* leading space *', 'a delimiter that does not hug its content'],
    ['unclosed *span here', 'an unclosed delimiter'],
    ['5 ** 2 is exponent', 'a spaced double star'],
  ])('leaves %j alone: %s', (source) => {
    expect(article(source).querySelector('em, strong, del')).toBeNull();
  });

  test('keeps delimiters inside a code span literal', () => {
    expect(html('`a * b ** c ~~ d`')).toBe('<code>a * b ** c ~~ d</code>');
  });

  test('keeps delimiters inside a fenced block literal', () => {
    const container = article('```js\nconst a = b ** 2;\n```');

    expect(container.querySelector('strong')).toBeNull();
    expect(container.querySelector('pre')?.textContent).toBe('const a = b ** 2;');
  });

  test('renders emphasis inside headings and list items', () => {
    expect(article('#### A *deep* heading').querySelector('h4 em')?.textContent).toBe('deep');
    expect(article('- an *item*').querySelector('li em')?.textContent).toBe('item');
  });

  test('stops nesting at the depth ceiling instead of recursing forever', () => {
    const source = `${'*'.repeat(40)}deep${'*'.repeat(40)}`;

    expect(article(source).textContent).toContain('deep');
  });
});

describe('backslash escapes', () => {
  test('renders an escaped delimiter as text', () => {
    expect(html('a \\*not emphasis\\* b')).toBe('a *not emphasis* b');
  });

  test('renders an escaped backtick as text', () => {
    expect(html('a \\`not code\\` b')).toBe('a `not code` b');
  });

  test('collapses an escaped backslash to one', () => {
    expect(html('one \\\\ backslash')).toBe('one \\ backslash');
  });

  test('keeps a backslash that does not escape punctuation', () => {
    expect(html('C:\\path\\to\\file')).toBe('C:\\path\\to\\file');
  });

  test('escapes only outside code spans', () => {
    expect(html('`a \\* b`')).toBe('<code>a \\* b</code>');
  });
});

describe('autolinks', () => {
  test('links a bare URL in angle brackets', () => {
    expect(html('<https://example.com/docs>')).toBe(
      '<a href="https://example.com/docs">https://example.com/docs</a>',
    );
  });

  test('links an explicit mailto', () => {
    expect(html('<mailto:team@example.com>')).toBe(
      '<a href="mailto:team@example.com">mailto:team@example.com</a>',
    );
  });

  test('links a bare email address through mailto', () => {
    expect(html('<team@example.com>')).toBe(
      '<a href="mailto:team@example.com">team@example.com</a>',
    );
  });

  test('refuses a script-bearing scheme and keeps it as text', () => {
    const container = article('<javascript:alert(1)>');

    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toContain('javascript:alert(1)');
  });

  test('refuses a script-bearing scheme in an inline link', () => {
    const container = article('[click](javascript:alert(1))');

    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toContain('click');
  });
});

describe('code spans', () => {
  test('holds a backtick inside a double-backtick span', () => {
    expect(html('use ``a ` b`` here')).toBe('use <code>a ` b</code> here');
  });

  test('strips one padding space from each side', () => {
    expect(html('`` ` ``')).toBe('<code>`</code>');
  });

  test('keeps an unpaired backtick as text', () => {
    expect(html('a ` b')).toBe('a ` b');
  });
});
