import { describe, expect, test } from 'vitest';
import { validateProductionBundle } from '../build/production-bundle-validation.js';

describe('production bundle build validation', () => {
  test('rejects a chunk compiled with the development JSX transform', () => {
    expect(() =>
      validateProductionBundle('browser.js', '(0, R.jsxDEV)(`section`, { children: n })'),
    ).toThrow('development JSX transform');
  });

  test('rejects a chunk that still reads process.env at runtime', () => {
    expect(() =>
      validateProductionBundle('browser.js', 'if (process.env.NODE_ENV !== `production`) {}'),
    ).toThrow('process.env');
  });

  test('names the offending file', () => {
    expect(() => validateProductionBundle('browser.js', '(0, R.jsxDEV)(`p`, {})')).toThrow(
      'browser.js',
    );
  });

  test('reports every violation in one failure', () => {
    let message = '';
    try {
      validateProductionBundle('browser.js', 'jsxDEV; process.env.NODE_ENV;');
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('development JSX transform');
    expect(message).toContain('process.env');
  });

  test('accepts a chunk built with the production automatic runtime', () => {
    expect(() =>
      validateProductionBundle('browser.js', '(0, z.jsxs)(`section`, { children: n })'),
    ).not.toThrow();
  });

  test('accepts the typeof process guard React ships in its production runtime', () => {
    expect(() =>
      validateProductionBundle(
        'browser.js',
        'if (typeof process === `object` && typeof process.emit === `function`) {}',
      ),
    ).not.toThrow();
  });
});
