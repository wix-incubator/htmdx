import { describe, expect, test } from 'vitest';
import {
  type BundleSizes,
  checkBudgetCoverage,
  checkBundleBudget,
  formatBundleSizes,
  measureBundle,
} from '../build/bundle-budget.js';

const LIMITS: BundleSizes = { raw: 500_000, gzip: 150_000 };

describe('bundle budget build validation', () => {
  test('accepts a bundle under both limits', () => {
    expect(() =>
      checkBundleBudget('browser.js', { raw: 499_999, gzip: 149_999 }, LIMITS),
    ).not.toThrow();
  });

  test('accepts a bundle exactly at its limits', () => {
    expect(() => checkBundleBudget('browser.js', { ...LIMITS }, LIMITS)).not.toThrow();
  });

  test('rejects a bundle over the raw limit alone', () => {
    expect(() => checkBundleBudget('browser.js', { raw: 500_001, gzip: 149_999 }, LIMITS)).toThrow(
      'raw',
    );
  });

  test('rejects a bundle over the gzip limit alone', () => {
    expect(() => checkBundleBudget('browser.js', { raw: 499_999, gzip: 150_001 }, LIMITS)).toThrow(
      'gzip',
    );
  });

  test('names the offending file', () => {
    expect(() => checkBundleBudget('browser.js', { raw: 600_000, gzip: 150_000 }, LIMITS)).toThrow(
      'browser.js',
    );
  });

  test('reports the overage in bytes and percent', () => {
    let message = '';
    try {
      checkBundleBudget('browser.js', { raw: 550_000, gzip: 150_000 }, LIMITS);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('50,000 over the 500,000 budget');
    expect(message).toContain('+10.0%');
  });

  test('reports every breach in one failure, and how to resolve it', () => {
    let message = '';
    try {
      checkBundleBudget('browser.js', { raw: 600_000, gzip: 160_000 }, LIMITS);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('raw');
    expect(message).toContain('gzip');
    expect(message).toContain('build/bundle-budget.json');
  });

  test('measures raw bytes and a smaller gzip figure', () => {
    const sizes = measureBundle(Buffer.from('htmdx'.repeat(1000)));

    expect(sizes.raw).toBe(5000);
    expect(sizes.gzip).toBeGreaterThan(0);
    expect(sizes.gzip).toBeLessThan(sizes.raw);
  });

  test('accepts a budget whose files the build emitted', () => {
    expect(() =>
      checkBudgetCoverage(['browser.js'], ['browser.js', 'browser.js.map']),
    ).not.toThrow();
  });

  test('rejects a budget keyed on a file the build no longer emits', () => {
    let message = '';
    try {
      checkBudgetCoverage(['browser.js'], ['runtime.js']);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('browser.js');
    expect(message).toContain('runtime.js');
    expect(message).toContain('silently stops running');
  });

  test('formats each metric against the share of budget it uses', () => {
    expect(formatBundleSizes('browser.js', { raw: 250_000, gzip: 75_000 }, LIMITS)).toBe(
      'browser.js: raw 250,000 (50% of 500,000), gzip 75,000 (50% of 150,000)',
    );
  });
});
