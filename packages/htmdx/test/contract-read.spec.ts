import { describe, expect, test } from 'vitest';
import { evaluateRead, evaluateTask, needsOf, type ContractTask } from '../bench/contract';
import type { Manifest, ManifestComponent } from '../src/cli/components';

function component(name: string, extra: Partial<ManifestComponent> = {}): ManifestComponent {
  return {
    name,
    purpose: `${name} does a thing.`,
    example: `<${name}>body</${name}>`,
    body: 'markdown',
    source: 'report',
    ...extra,
  };
}

const manifest: Manifest = {
  format: 'htmdx@2',
  runtime: '9.9.9',
  components: [component('Callout'), component('Stat'), component('RiskTable')],
};

const source = '# Report\n\n<Callout>Ship it.</Callout>\n';

function task(needs: string[]): ContractTask {
  return { id: 't', description: 'd', needs };
}

describe('contract read modes', () => {
  test('manifest supplies every contract and never pays a follow-up', () => {
    const read = evaluateRead(manifest, 'manifest', source, task(['RiskTable']));

    expect(read.missing).toEqual([]);
    expect(read.followUp.tokens).toBe(0);
    expect(read.total).toBe(read.read.tokens);
    expect(read.discovers).toBe(true);
  });

  test('list always pays a follow-up because it carries no props or examples', () => {
    const read = evaluateRead(manifest, 'list', source, task(['Callout']));

    expect(read.missing).toEqual(['Callout']);
    expect(read.followUp.tokens).toBeGreaterThan(0);
    expect(read.discovers).toBe(true);
  });

  test('used covers a component the source already contains', () => {
    const read = evaluateRead(manifest, 'used', source, task(['Callout']));

    expect(read.missing).toEqual([]);
    expect(read.followUp.tokens).toBe(0);
  });

  // The finding this eval exists to measure: an edit that introduces a
  // component is exactly what --used cannot have seen.
  test('used misses a component the edit introduces, and cannot discover it', () => {
    const read = evaluateRead(manifest, 'used', source, task(['RiskTable']));

    expect(read.missing).toEqual(['RiskTable']);
    expect(read.followUp.tokens).toBeGreaterThan(0);
    expect(read.discovers).toBe(false);
  });

  test('an edit that writes no component tag needs no contract from any mode', () => {
    for (const read of evaluateTask(manifest, source, task([]))) {
      expect(read.missing).toEqual([]);
      expect(read.followUp.tokens).toBe(0);
    }
  });

  test('every mode ends up holding the contracts the task needs', () => {
    for (const read of evaluateTask(manifest, source, task(['Callout', 'RiskTable']))) {
      expect(read.total).toBeGreaterThanOrEqual(read.read.tokens);
    }
  });
});

describe('needsOf', () => {
  test('reads the components an edit writes out of the edit itself', () => {
    expect(needsOf(manifest, '<Stat>- Merchants: **412**</Stat>')).toEqual(['Stat']);
  });

  test('is empty for an edit that only changes text', () => {
    expect(needsOf(manifest, '290/month')).toEqual([]);
  });
});
