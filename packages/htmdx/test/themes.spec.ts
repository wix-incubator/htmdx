import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { contrastRatio } from '../scripts/oklch.mjs';
import { compile } from '../src';
import { THEME_CSS, THEME_IDS } from '../src/themes';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function themeBlock(id: string): string {
  const start = THEME_CSS.indexOf(`[data-htmdx-theme="${id}"]`);
  return THEME_CSS.slice(start, THEME_CSS.indexOf('}', start));
}

function tokenNames(css: string): string[] {
  return [...css.matchAll(/--([a-z-]+):/g)].map((m) => m[1]).toSorted();
}

function themeTokens(id: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const m of themeBlock(id).matchAll(/--([a-z-]+):\s*(#[0-9A-Fa-f]{6})/g)) {
    map[m[1]] = m[2];
  }
  return map;
}

describe('themes', () => {
  const generated = THEME_IDS.filter((id) => id !== 'purple');

  test('default purple has no CSS block', () => {
    expect(THEME_CSS).not.toContain('data-htmdx-theme="purple"');
  });

  test('each generated theme defines the same M3 token set', () => {
    const expected = tokenNames(themeBlock(generated[0]));
    expect(expected).toContain('md-sys-color-primary');
    expect(expected).toContain('md-sys-color-primary-container');
    for (const id of generated) {
      expect(tokenNames(themeBlock(id)), id).toEqual(expected);
    }
  });

  test('primary pairs meet WCAG AA', () => {
    for (const id of generated) {
      const tokens = themeTokens(id);
      expect(
        contrastRatio(tokens['md-sys-color-primary'], tokens['md-sys-color-on-primary']),
        `${id}: primary pair`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(
          tokens['md-sys-color-primary-container'],
          tokens['md-sys-color-on-primary-container'],
        ),
        `${id}: primary container pair`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('theme frontmatter stamps data-htmdx-theme on the app root', () => {
    const rendered = compile('---\ntitle: "Brief"\ntheme: Teal\n---\n\n# Brief\n\nBody.');

    expect(rendered.ok && rendered.html).toContain('data-htmdx-theme="teal"');
  });

  test.each(['purple', 'neon', ''])('theme "%s" falls back to the base palette', (theme) => {
    const frontmatter = theme ? `---\ntheme: ${theme}\n---\n\n` : '';
    const rendered = compile(`${frontmatter}# Brief\n\nBody.`);

    expect(rendered.ok && rendered.html).not.toContain('data-htmdx-theme');
  });

  test('generator output matches the committed src/themes.ts', () => {
    const dir = mkdtempSync(join(tmpdir(), 'htmdx-themes-'));
    try {
      const generatedPath = join(dir, 'themes.ts');
      execSync(`node scripts/generate-themes.mjs ${JSON.stringify(generatedPath)}`, {
        cwd: packageRoot,
      });
      expect(readFileSync(generatedPath, 'utf8')).toBe(
        readFileSync(join(packageRoot, 'src/themes.ts'), 'utf8'),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
