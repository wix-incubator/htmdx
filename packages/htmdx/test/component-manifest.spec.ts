import { describe, expect, test } from 'vitest';
import packageJson from '../package.json';
import { createComponentManifest } from '../src/component-manifest';
import { builtInComponents } from '../src/components/catalog';
import { VERSION } from '../src';

describe('component manifest', () => {
  test('projects the ordered built-in catalog without executable fields', () => {
    const manifest = createComponentManifest();

    expect(Object.keys(manifest)).toEqual(['format', 'runtime', 'note', 'components']);
    expect(manifest.format).toBe('htmdx@1');
    expect(manifest.components.map(({ name }) => name)).toEqual(
      builtInComponents.map(({ name }) => name),
    );
    expect(manifest.components).toEqual(
      builtInComponents.map(({ name, body, purpose, example }) => ({
        name,
        body,
        purpose,
        example,
      })),
    );
    for (const component of manifest.components) {
      expect(Object.keys(component)).toEqual(['name', 'body', 'purpose', 'example']);
    }
  });

  test('uses the package version for the manifest and exported runtime version', () => {
    const manifest = createComponentManifest();

    expect(VERSION).toBe(packageJson.version);
    expect(manifest.runtime).toBe(`${packageJson.name}@${packageJson.version}`);
  });

  test('documents the global authoring and failure contract', () => {
    const note = createComponentManifest().note;

    expect(note).toContain('built-ins only');
    expect(note).toContain('one-level JSX');
    expect(note).toContain('imports');
    expect(note).toContain('exports');
    expect(note).toContain('expressions');
    expect(note).toContain('nested JSX');
    expect(note).toContain('fails compilation of the whole HTMDX artifact');
  });

  test.each(['ChartArea', 'ChartLine', 'ChartPie'])(
    '%s discloses its shared visualization',
    (name) => {
      const component = createComponentManifest().components.find((entry) => entry.name === name);

      expect(component?.purpose).toContain('shared bar-chart visualization');
    },
  );
});
