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
    expect(Object.keys(builtinDefinitions)).toEqual(
      expect.arrayContaining([
        'ExecutiveSummary',
        'Compare',
        'Finding',
        'Evidence',
        'Sources',
        'Audience',
        'Callout',
        'SourceQuote',
        'MetricStrip',
        'Stat',
        'ChartBar',
        'ChartArea',
        'ChartLine',
        'ChartPie',
        'DataTable',
        'DecisionTable',
        'DecisionMatrix',
        'RiskTable',
        'Timeline',
      ]),
    );
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
      const entries = manifest.components.filter((candidate) => candidate.name === definition.name);
      expect(entries).toHaveLength(1);
      const [entry] = entries;
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

describe('insight and evidence Built-ins through the definition catalog', () => {
  test.each([
    ['Compare', '- **Current:** Manual review', 'Current'],
    ['Finding', '- **Drift:** Runtime support was split across catalogs.', 'Drift'],
    ['Evidence', '- **Runtime:** The exported definition drives registration.', 'Runtime'],
    ['Sources', '- **Product Strategy**', 'Product Strategy'],
    [
      'Audience',
      '- **Store owner — Primary:** Needs clear product data. · metrics: 72% — adoption · priority: High',
      'Store owner',
    ],
  ])('parses and renders <%s> card-list Markdown', (name, body, output) => {
    const rendered = compile(`<${name}>\n${body}\n</${name}>`);

    expect(rendered).toMatchObject({ ok: true, components: [name] });
    expect(rendered.ok && rendered.html).toContain(`data-htmdx-component="${name}"`);
    expect(rendered.ok && rendered.html).toContain(output);
  });

  test.each([
    ['Compare', 'Current: Manual review'],
    ['Finding', 'Drift: Split catalogs'],
    ['Evidence', 'Runtime: Exported definitions'],
    ['Sources', 'Product Strategy'],
    ['Audience', 'Store owner — Primary'],
  ])('keeps <%s> card-list validation actionable', (name, body) => {
    expect(compile(`<${name}>\n${body}\n</${name}>`)).toMatchObject({
      ok: false,
      error: expect.stringContaining("one or more non-empty '- item' rows"),
    });
  });
});

describe('narrative Built-ins through the definition catalog', () => {
  test.each([
    ['Callout', '**Important:** Validate the artifact before publishing.'],
    ['SourceQuote', '“Artifacts should remain editable.”'],
  ])('renders <%s> Markdown in the default runtime', (name, body) => {
    const rendered = compile(`<${name}>\n${body}\n</${name}>`);

    expect(rendered).toMatchObject({ ok: true, components: [name] });
    expect(rendered.ok && rendered.html).toContain(`data-htmdx-component="${name}"`);
    if (name === 'Callout') {
      expect(rendered.ok && rendered.html).toContain(
        '<strong>Important:</strong> Validate the artifact before publishing.',
      );
    } else {
      expect(rendered.ok && rendered.html).toContain('“Artifacts should remain editable.”');
    }
  });
});

describe('metric and chart Built-ins through the definition catalog', () => {
  test.each([
    ['MetricStrip', '- Adoption: **72%**', '72%'],
    ['Stat', '- Revenue: **$4.2M**', '$4.2M'],
    ['ChartBar', '- Free users: 48', 'Free users: 48'],
    ['ChartArea', '- January: 18', 'January: 18'],
    ['ChartLine', '- Week 1: 8', 'Week 1: 8'],
    ['ChartPie', '- Direct: 62', 'Direct: 62'],
  ])('parses and renders <%s> structured Markdown', (name, body, output) => {
    const rendered = compile(`<${name}>\n${body}\n</${name}>`);

    expect(rendered).toMatchObject({ ok: true, components: [name] });
    expect(rendered.ok && rendered.html).toContain(`data-htmdx-component="${name}"`);
    expect(rendered.ok && rendered.html).toContain(output);
  });

  test.each([
    ['MetricStrip', 'not a label-value list', "one or more '- label: value' rows"],
    ['Stat', '- Missing value:', 'non-empty label and value'],
    ['ChartBar', '- Signups: many', 'not a non-negative decimal'],
    ['ChartArea', '- Signups: -1', 'not a non-negative decimal'],
    ['ChartLine', '- Signups: Infinity', 'not a non-negative decimal'],
    ['ChartPie', '- : 12', 'non-empty label'],
  ])('keeps <%s> validation actionable', (name, body, error) => {
    expect(compile(`<${name}>\n${body}\n</${name}>`)).toMatchObject({
      ok: false,
      error: expect.stringContaining(error),
    });
  });
});

describe('tabular and decision Built-ins through the definition catalog', () => {
  test.each([
    ['DataTable', '| Plan | Users |\n| --- | ---: |\n| Free | 48 |', ['Plan', 'Free', '48']],
    ['DecisionTable', '- Scope: Built-in components only', ['Scope', 'Built-in components only']],
    [
      'DecisionMatrix',
      '| Criterion | A | B ✓ |\n| --- | --- | --- |\n| Fit | Partial | [green] Strong |',
      ['Criterion', 'B', 'Chosen', 'Strong'],
    ],
    ['RiskTable', '- **Must-have:** Publish exact-version metadata.', ['Must-have', 'Publish']],
    ['Timeline', '- July: Publish the manifest', ['July', 'Publish the manifest']],
  ])('parses and renders <%s> structured Markdown', (name, body, output) => {
    const rendered = compile(`<${name}>\n${body}\n</${name}>`);

    expect(rendered).toMatchObject({ ok: true, components: [name] });
    expect(rendered.ok && rendered.html).toContain(`data-htmdx-component="${name}"`);
    for (const text of output) {
      expect(rendered.ok && rendered.html).toContain(text);
    }
  });

  test.each([
    ['DataTable', '| Plan |\n| --- |', 'header, separator, and at least one data row'],
    ['DecisionTable', '- Missing separator', "one or more '- label: value' rows"],
    ['DecisionMatrix', '| A | B |\n| --- | nope |\n| x | y |', 'separator'],
    ['Timeline', '- July:', 'non-empty label and value'],
    ['RiskTable', '- **must-have:** Wrong case', 'canonical, case-sensitive'],
    ['RiskTable', '- **Must-have:**', 'followed by text'],
    ['RiskTable', '- **Must-have:** First **Not now:** Second', 'exactly one canonical bold tier'],
    [
      'RiskTable',
      '- **Must-have:** First\n- **Must-have:** Second',
      'tier "Must-have" is repeated',
    ],
  ])('keeps <%s> validation actionable', (name, body, error) => {
    expect(compile(`<${name}>\n${body}\n</${name}>`)).toMatchObject({
      ok: false,
      error: expect.stringContaining(error),
    });
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
