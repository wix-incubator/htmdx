import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { compile } from '../src';
import type { HtmdxComponent } from '../src/component-definition';
import * as builtinDefinitions from '../src/components/builtins';
import * as shadcnDefinitions from '../src/components/shadcn';
import { createReactComponentManifest } from '../src/react/component-manifest';

const componentsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../src/components');

const catalogs = [
  { directory: 'builtins', source: 'built-in', definitions: builtinDefinitions },
  { directory: 'shadcn', source: 'shadcn', definitions: shadcnDefinitions },
] as const;

const allDefinitions = catalogs.flatMap(({ directory, source, definitions }) =>
  Object.entries(definitions).map(([exportName, definition]) => ({
    directory,
    source,
    exportName,
    definition: definition as HtmdxComponent,
  })),
);

describe('component definition catalogs', () => {
  test('category barrels export each definition once under its PascalCase name', () => {
    expect(Object.keys(builtinDefinitions)).toContain('ExecutiveSummary');
    expect(Object.keys(shadcnDefinitions)).toContain('Badge');

    const names = new Set<string>();
    for (const { exportName, definition } of allDefinitions) {
      expect(exportName).toBe(definition.name);
      expect(names.has(definition.name.toLowerCase())).toBe(false);
      names.add(definition.name.toLowerCase());
    }
  });

  test.each(allDefinitions)(
    '$definition.name declares complete agent-facing metadata',
    ({ definition }) => {
      expect(definition.purpose.trim()).toBeTruthy();
      expect(['markdown', 'htmdx', 'none']).toContain(definition.body);
      expect(typeof definition.Component === 'function' || definition.Component !== null).toBe(
        true,
      );
    },
  );

  test.each(allDefinitions)(
    '$definition.name has a colocated story in its component folder',
    ({ directory, definition }) => {
      const storyPath = resolve(
        componentsDirectory,
        directory,
        definition.name,
        `${definition.name}.stories.ts`,
      );
      expect(existsSync(storyPath)).toBe(true);
    },
  );

  test.each(allDefinitions)(
    "$definition.name's canonical example contains its target and compiles against the merged catalog",
    ({ definition }) => {
      expect(definition.example).toMatch(new RegExp(`<${definition.name}[\\s/>]`));
      expect(compile(definition.example)).toMatchObject({ ok: true });
    },
  );

  test('the manifest projects definition catalogs with generated source and no executable fields', () => {
    const manifest = createReactComponentManifest();

    for (const { source, definition } of allDefinitions) {
      const entry = manifest.components.find((candidate) => candidate.name === definition.name);
      expect(entry).toMatchObject({
        name: definition.name,
        purpose: definition.purpose,
        example: definition.example,
        body: definition.body,
        source,
      });
      expect(entry && 'Component' in entry).toBe(false);
      if (definition.props) {
        expect(entry?.props).toEqual(definition.props);
      }
    }

    expect(JSON.parse(JSON.stringify(manifest))).toEqual(manifest);
  });
});

describe('ExecutiveSummary through the definition catalog', () => {
  test('renders its markdown body in the default runtime', () => {
    const rendered = compile(`<ExecutiveSummary>
Ship **one HTML file** with editable HTMDX source.
</ExecutiveSummary>`);

    expect(rendered).toMatchObject({ ok: true, components: ['ExecutiveSummary'] });
    expect(rendered.ok && rendered.html).toContain('data-htmdx-component="ExecutiveSummary"');
    expect(rendered.ok && rendered.html).toContain(
      'Ship <strong>one HTML file</strong> with editable HTMDX source.',
    );
  });

  test('accepts universal attributes', () => {
    const rendered = compile(
      '<ExecutiveSummary id="summary" data-state="final">\nDone.\n</ExecutiveSummary>',
    );

    expect(rendered.ok && rendered.html).toContain('id="summary"');
    expect(rendered.ok && rendered.html).toContain('data-state="final"');
  });
});

describe('Badge at the HTMDX catalog boundary', () => {
  test('renders inline content in the default runtime, top-level and nested', () => {
    const topLevel = compile('<Badge variant="secondary">audited</Badge>');
    expect(topLevel).toMatchObject({ ok: true, components: ['Badge'] });
    expect(topLevel.ok && topLevel.html).toContain('audited');

    const nested = compile(`<Card>
  <CardContent>
    <Badge variant="outline">nested</Badge>
  </CardContent>
</Card>`);
    expect(nested).toMatchObject({ ok: true });
    expect(nested.ok && nested.html).toContain('nested');
  });

  test('enforces the declared variant allowlist', () => {
    expect(compile('<Badge variant="loud">x</Badge>')).toMatchObject({
      ok: false,
      error: expect.stringContaining('must be one of'),
    });
    expect(compile('<Badge onclick="alert(1)">x</Badge>')).toMatchObject({
      ok: false,
      error: expect.stringContaining('unknown prop "onclick"'),
    });
  });
});
