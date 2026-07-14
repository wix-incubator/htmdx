import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { THEME_CSS, THEME_IDS } from '../src/themes';

function tokenNames(css: string): string[] {
  return [...css.matchAll(/--(md-sys-color-[a-z0-9-]+):/g)].map((m) => m[1]).toSorted();
}

function readIndexSource(): string {
  // Vite (Vitest) rewrites `new URL('…', import.meta.url)` into an asset URL,
  // so read via a path derived from import.meta.url instead.
  return readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/index.ts'), 'utf8');
}

function purpleTokenNames(): string[] {
  const src = readIndexSource();
  const root = src.slice(src.indexOf(':root {'), src.indexOf('}', src.indexOf(':root {')));
  return [...root.matchAll(/--(md-sys-color-[a-z0-9-]+):\s*#[0-9A-Fa-f]{6}\s*;/g)]
    .map((m) => m[1])
    .toSorted();
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const hi = Math.max(luminance(a), luminance(b));
  const lo = Math.min(luminance(a), luminance(b));
  return (hi + 0.05) / (lo + 0.05);
}

function themeBlock(id: string): string {
  const start = THEME_CSS.indexOf(`[data-htmdx-theme="${id}"]`);
  return THEME_CSS.slice(start, THEME_CSS.indexOf('}', start));
}

function themeTokens(id: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const m of themeBlock(id).matchAll(/--(md-sys-color-[a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)) {
    map[m[1]] = m[2];
  }
  return map;
}

describe('themes', () => {
  const generated = THEME_IDS.filter((id) => id !== 'purple');

  test('each generated theme defines the full purple token set', () => {
    const expected = purpleTokenNames();
    for (const id of generated) {
      expect(tokenNames(themeBlock(id))).toEqual(expected);
    }
  });

  test('error family stays red (unchanged from purple)', () => {
    const purpleError = readIndexSource().match(/--md-sys-color-error:\s*(#[0-9A-Fa-f]{6})/)?.[1];
    for (const id of generated) {
      expect(themeBlock(id)).toContain(`--md-sys-color-error: ${purpleError};`);
    }
  });

  test('generated themes meet WCAG AA on key pairs', () => {
    const textPairs: [string, string][] = [
      ['md-sys-color-on-surface', 'md-sys-color-surface'],
      ['md-sys-color-on-primary', 'md-sys-color-primary'],
      ['md-sys-color-on-primary-container', 'md-sys-color-primary-container'],
      ['md-sys-color-on-secondary-container', 'md-sys-color-secondary-container'],
      ['md-sys-color-on-nav-active-container', 'md-sys-color-nav-active-container'],
    ];
    for (const id of generated) {
      const t = themeTokens(id);
      for (const [fg, bg] of textPairs) {
        expect(contrast(t[fg], t[bg]), `${id}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
      // Non-text UI: outline against the page surface.
      expect(
        contrast(t['md-sys-color-outline'], t['md-sys-color-surface']),
        `${id}: outline on surface`,
      ).toBeGreaterThanOrEqual(3);
    }
  });
});
