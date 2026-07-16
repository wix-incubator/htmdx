import { describe, expect, test } from 'vitest';
import packageJson from '../package.json';
import { createComponentManifest } from '../src/component-manifest';
import { builtInComponents } from '../src/components/builtins/catalog';
import { VERSION } from '../src';

describe('component manifest', () => {
  test('projects the merged runtime catalog without executable fields', () => {
    const manifest = createComponentManifest();

    expect(Object.keys(manifest)).toEqual(['format', 'runtime', 'note', 'components']);
    expect(manifest.format).toBe('htmdx-react@1');

    const builtinEntries = manifest.components.filter((entry) => entry.source === 'builtin');
    // The shadcn Card shadows the built-in Card in the merged runtime.
    expect(builtinEntries.map(({ name }) => name)).toEqual(
      builtInComponents.filter(({ name }) => name !== 'Card').map(({ name }) => name),
    );
    expect(manifest.components.some((entry) => entry.source === 'shadcn')).toBe(true);
    for (const component of manifest.components) {
      expect(component.name).toBeTruthy();
      expect(component.purpose).toBeTruthy();
      expect('component' in component).toBe(false);
      expect('renderer' in component).toBe(false);
    }
  });

  test('uses the package version for the manifest and exported runtime version', () => {
    const manifest = createComponentManifest();

    expect(VERSION).toBe(packageJson.version);
    expect(manifest.runtime).toBe(`${packageJson.name}@${packageJson.version}`);
  });

  test('documents the global authoring and failure contract', () => {
    const note = createComponentManifest().note;

    expect(note).toContain('built-in catalog');
    expect(note).toContain('shadcn');
    expect(note).toContain('Imports');
    expect(note).toContain('expressions');
    expect(note).toContain('function-valued props');
  });

  test.each(['ChartArea', 'ChartLine', 'ChartPie'])(
    '%s discloses its shared visualization',
    (name) => {
      const component = createComponentManifest().components.find((entry) => entry.name === name);

      expect(component?.purpose).toContain('shared bar-chart visualization');
    },
  );
});
