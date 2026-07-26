import { describe, expect, test } from 'vitest';
import packageJson from '../package.json';
import * as builtinDefinitions from '../src/components/builtins';
import * as shadcnDefinitions from '../src/components/shadcn';
import { createComponentManifest } from '../src/component-manifest';
import { bodyFormatExpectation } from '../src/components/body-contracts';
import { VERSION } from '../src';

const definitions = [
  ...Object.values(builtinDefinitions).map((definition) => ({ definition, source: 'built-in' })),
  ...Object.values(shadcnDefinitions).map((definition) => ({ definition, source: 'shadcn' })),
] as const;

describe('component manifest', () => {
  test('projects exactly the bundled definitions into the htmdx@2 format', () => {
    const manifest = createComponentManifest();

    expect(Object.keys(manifest)).toEqual(['format', 'runtime', 'note', 'components']);
    expect(manifest.format).toBe('htmdx@2');
    expect(manifest.components).toHaveLength(definitions.length);

    for (const { definition: rawDefinition, source } of definitions) {
      const definition = rawDefinition as import('../src/component-definition').HtmdxComponent;
      const entry = manifest.components.find((candidate) => candidate.name === definition.name);
      const bodyFormat =
        definition.body === 'markdown' ? (definition.bodyFormat ?? 'markdown') : null;
      expect(entry).toEqual({
        name: definition.name,
        purpose: definition.purpose,
        example: definition.example,
        body: definition.body,
        ...(bodyFormat ? { bodyFormat, bodyExpectation: bodyFormatExpectation(bodyFormat) } : {}),
        props: definition.props ?? [],
        source,
      });
      expect(Object.keys(entry || {})).toEqual([
        'name',
        'purpose',
        'example',
        'body',
        ...(bodyFormat ? ['bodyFormat', 'bodyExpectation'] : []),
        'props',
        'source',
      ]);
    }
  });

  test('publishes the stricter body grammar the runtime actually enforces', () => {
    const components = createComponentManifest().components;
    const formatOf = (name: string) =>
      components.find((component) => component.name === name)?.bodyFormat;

    expect(formatOf('MetricStrip')).toBe('label-value-list');
    expect(formatOf('ChartBar')).toBe('label-number-list');
    expect(formatOf('DataTable')).toBe('gfm-table');
    expect(formatOf('Sources')).toBe('markdown-list-cards');
    expect(formatOf('Callout')).toBe('markdown');
    expect(formatOf('Card')).toBeUndefined();
  });

  test('states the body grammar an author has to satisfy alongside the format name', () => {
    const metricStrip = createComponentManifest().components.find(
      (component) => component.name === 'MetricStrip',
    );

    expect(metricStrip?.bodyExpectation).toBe(
      "one or more '- label: value' rows with non-empty labels and values",
    );
  });

  test('declares an empty prop list instead of omitting the key', () => {
    const components = createComponentManifest().components;

    expect(components.every((component) => Array.isArray(component.props))).toBe(true);
    expect(components.find((component) => component.name === 'Callout')?.props).toEqual([]);
  });

  test('uses the package version for the manifest and exported runtime version', () => {
    const manifest = createComponentManifest();

    expect(VERSION).toBe(packageJson.version);
    expect(manifest.runtime).toBe(`${packageJson.name}@${packageJson.version}`);
  });

  test('defines body values, global attributes, prop parsing, and language limits', () => {
    const note = createComponentManifest().note;

    for (const phrase of [
      'markdown',
      'htmdx',
      'none',
      'class',
      'id',
      'aria-*',
      'data-*',
      'string',
      'number',
      'boolean',
      'JSON',
      'imports',
      'expressions',
      'function-valued props',
      'bodyFormat',
      'bodyExpectation',
      'empty props',
    ]) {
      expect(note).toContain(phrase);
    }
  });

  test.each(['ChartArea', 'ChartLine', 'ChartPie'])(
    '%s discloses its shared visualization',
    (name) => {
      const component = createComponentManifest().components.find((entry) => entry.name === name);

      expect(component?.purpose).toContain('shared bar-chart visualization');
    },
  );
});
