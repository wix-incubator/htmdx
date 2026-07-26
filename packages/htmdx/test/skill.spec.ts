import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { validate, VERSION } from '../src';
import { SKILL_TOPICS } from '../src/cli/skill';
import { extractSource } from '../src/testing';

function readSkillFile(file: string): string {
  return readFileSync(resolve(import.meta.dirname, '../skill', file), 'utf8');
}

// The guidance teaches by example, so every mdx fence in it has to be a
// document this runtime actually accepts.
function mdxSnippets(markdown: string): string[] {
  return [...markdown.matchAll(/```mdx\n([\s\S]*?)```/g)].map((match) => match[1]);
}

describe('shipped skill', () => {
  test('every topic file exists', () => {
    for (const topic of SKILL_TOPICS) {
      expect(readSkillFile(topic.file).trim()).not.toBe('');
    }
  });

  test('the starter artifact validates against this runtime', () => {
    expect(validate(extractSource(readSkillFile('artifact.html')))).toEqual([]);
  });

  test('every mdx example validates', () => {
    const snippets = SKILL_TOPICS.filter((topic) => topic.file.endsWith('.md')).flatMap((topic) =>
      mdxSnippets(readSkillFile(topic.file)),
    );
    expect(snippets.length).toBeGreaterThan(5);
    for (const snippet of snippets) {
      expect({ snippet, diagnostics: validate(snippet) }).toEqual({ snippet, diagnostics: [] });
    }
  });

  // oxfmt reads an mdx fence as JSX and reflows it, which joins the one-row-per-
  // line grammars into a single invalid row. Each fence has to opt out.
  test.each(SKILL_TOPICS.filter((topic) => topic.file.endsWith('.md')).map((topic) => topic.file))(
    '%s keeps every mdx example away from the formatter',
    (file) => {
      const content = readSkillFile(file);
      for (const fence of content.matchAll(/^```mdx$/gm)) {
        expect(content.slice(0, fence.index)).toMatch(/<!-- prettier-ignore -->\n$/);
      }
    },
  );

  test.each(SKILL_TOPICS.map((topic) => topic.file))('%s pins the current runtime', (file) => {
    const pins = [...readSkillFile(file).matchAll(/@wix\/htmdx@(\d+\.\d+\.\d+)/g)].map(
      (match) => match[1],
    );
    expect(pins.length).toBeGreaterThan(0);
    expect([...new Set(pins)]).toEqual([VERSION]);
  });
});
