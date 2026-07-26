import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, test } from 'vitest';
import { compileDocument, type HtmdxBlockFailure } from '../src/react';
import { runtimeOptionsFor } from '../src/runtime-definitions';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function renderDocument(source: string, onBlockError?: (failure: HtmdxBlockFailure) => void) {
  const doc = compileDocument(source, {
    ...runtimeOptionsFor({}),
    ...(onBlockError ? { onBlockError } : {}),
  });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container, { onCaughtError: () => {} });
  act(() => root.render(doc.element));
  return {
    container,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

const BROKEN = `# Importer Rollout

Everything below this line should still reach the reader.

<ChartBar unit="stores">
- Wave 1: 120
</ChartBar>

<Callout>
The last word survives.
</Callout>`;

describe('degraded rendering', () => {
  test('replaces a failing block with a card and keeps the rest of the page', () => {
    const failures: HtmdxBlockFailure[] = [];
    const { container, cleanup } = renderDocument(BROKEN, (failure) => failures.push(failure));

    expect(container.textContent).toContain('Everything below this line');
    expect(container.textContent).toContain('The last word survives.');

    const card = container.querySelector('.htmdx-block-error');
    expect(card?.textContent).toContain('<ChartBar> did not render');
    expect(card?.textContent).toContain('unknown prop "unit" for <ChartBar>');
    expect(card?.querySelector('[data-htmdx-fix]')?.textContent).toBe('Copy fix request');
    // The card and the reported failure share the block offset, which is how
    // the copy handler finds the error behind the button that was clicked.
    expect(card?.getAttribute('data-htmdx-block')).toBe(String(failures[0].offset));
    expect(failures).toHaveLength(1);
    expect(failures[0].name).toBe('ChartBar');

    cleanup();
  });

  test('recovers from a body contract that only fails once the component renders', () => {
    const failures: HtmdxBlockFailure[] = [];
    const { container, cleanup } = renderDocument(
      `<RiskTable>
- **Must-have:** Ship the importer.
- Missing tier
</RiskTable>

<Callout>
Still here.
</Callout>`,
      (failure) => failures.push(failure),
    );

    expect(container.textContent).toContain('Still here.');
    const card = container.querySelector('.htmdx-block-error');
    expect(card?.textContent).toContain('<RiskTable> did not render');
    expect(card?.querySelector('.htmdx-block-error-input')?.textContent).toBe('- Missing tier');
    expect(failures[0].name).toBe('RiskTable');

    cleanup();
  });

  test('counts an unregistered tag the tokenizer rejects', () => {
    const failures: HtmdxBlockFailure[] = [];
    const { container, cleanup } = renderDocument(
      `<Nonexistent>whatever</Nonexistent>\n\n<Callout>\nStill here.\n</Callout>`,
      (failure) => failures.push(failure),
    );

    // The tokenizer rejects the tag before there is a block to wrap, so the
    // page keeps going and the failure is only reported.
    expect(container.textContent).toContain('Still here.');
    expect(failures).toHaveLength(1);
    expect(failures[0].name).toBe('Nonexistent');

    cleanup();
  });

  test('still fails the whole document when no handler opts in', () => {
    expect(() => compileDocument(BROKEN, runtimeOptionsFor({}))).toThrow(
      'unknown prop "unit" for <ChartBar>',
    );
  });
});
