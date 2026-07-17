import { createElement, type ReactNode } from 'react';
import { describe, expect, test } from 'vitest';
import { compile, registerComponent, registerComponents, type HtmdxComponent } from '../src';

const definition = (
  value: Pick<HtmdxComponent, 'name' | 'body' | 'Component'> &
    Partial<Pick<HtmdxComponent, 'purpose' | 'example' | 'props'>>,
): HtmdxComponent => ({
  purpose: `Purpose for ${value.name}`,
  example: `<${value.name} />`,
  ...value,
});

describe('definition-driven component contracts', () => {
  test('requires complete component definitions', () => {
    const incomplete = {
      name: 'IncompleteFixture',
      purpose: '',
      example: '<IncompleteFixture />',
      body: 'none',
      Component: () => null,
    } as HtmdxComponent;

    expect(compile('', { definitions: [incomplete] })).toMatchObject({
      ok: false,
      error: expect.stringContaining('requires a purpose'),
    });
  });

  test('executes markdown, HTMDX, and bodyless body modes', () => {
    const RawNote = definition({
      name: 'RawNote',
      body: 'markdown',
      example: '<RawNote>Use **raw** Markdown.</RawNote>',
      Component: ({ body }: { body: string }) => createElement('output', null, `raw:${body}`),
    });
    const Composition = definition({
      name: 'Composition',
      body: 'htmdx',
      example: '<Composition><InlineLabel level="2">nested</InlineLabel></Composition>',
      Component: ({ children }: { children?: ReactNode }) =>
        createElement('section', null, children),
    });
    const InlineLabel = definition({
      name: 'InlineLabel',
      body: 'htmdx',
      example: '<InlineLabel level="1">label</InlineLabel>',
      props: [{ name: 'level', type: 'number', required: true, min: 1 }],
      Component: ({ level, children }: { level: number; children?: ReactNode }) =>
        createElement('mark', null, `${level}:`, children),
    });
    const Divider = definition({
      name: 'DividerFixture',
      body: 'none',
      Component: () => createElement('hr'),
    });
    const definitions = [RawNote, Composition, InlineLabel, Divider];

    const rendered = compile(
      `<RawNote>Use **raw** Markdown.</RawNote>
<Composition>Before **bold** <InlineLabel level="2">nested</InlineLabel></Composition>
<DividerFixture />`,
      { definitions },
    );

    expect(rendered).toMatchObject({
      ok: true,
      components: ['RawNote', 'Composition', 'DividerFixture'],
    });
    expect(rendered.ok && rendered.html).toContain('raw:Use **raw** Markdown.');
    expect(rendered.ok && rendered.html).toContain('<strong>bold</strong>');
    expect(rendered.ok && rendered.html).toContain('<mark>2:nested</mark>');

    const inline = compile('<Composition>plain **inline** content</Composition>', { definitions });
    const block = compile('<Composition>- first\n- second</Composition>', { definitions });
    expect(inline.ok && inline.html).toContain(
      '<section>plain <strong>inline</strong> content</section>',
    );
    expect(block.ok && block.html).toContain('<li>first</li>');
  });

  test('enforces definition body modes', () => {
    const RawNote = definition({
      name: 'StrictRawNote',
      body: 'markdown',
      Component: ({ body }: { body: string }) => createElement('output', null, body),
    });
    const Child = definition({
      name: 'StrictChild',
      body: 'htmdx',
      Component: ({ children }: { children?: ReactNode }) => createElement('span', null, children),
    });
    const Divider = definition({
      name: 'StrictDivider',
      body: 'none',
      Component: () => createElement('hr'),
    });
    const definitions = [RawNote, Child, Divider];

    expect(
      compile('<StrictRawNote><StrictChild>nested</StrictChild></StrictRawNote>', { definitions }),
    ).toMatchObject({ ok: false, error: expect.stringContaining('does not allow nested tags') });
    expect(compile('<StrictDivider>not empty</StrictDivider>', { definitions })).toMatchObject({
      ok: false,
      error: expect.stringContaining('does not allow a body'),
    });
    expect(compile('<StrictDivider></StrictDivider>', { definitions })).toMatchObject({ ok: true });
    expect(compile('<StrictRawNote>Hello {name}</StrictRawNote>', { definitions })).toMatchObject({
      ok: false,
      error: expect.stringContaining('brace expressions'),
    });
    expect(compile('<StrictChild><MissingFixture /></StrictChild>', { definitions })).toMatchObject(
      {
        ok: false,
        error: expect.stringContaining('unknown component <MissingFixture>'),
      },
    );
    expect(
      compile('<StrictChild><button onclick="alert(1)">unsafe</button></StrictChild>', {
        definitions,
      }),
    ).toMatchObject({ ok: false, error: expect.stringContaining('event handler attribute') });
  });

  test('parses declared prop types, defaults, and universal attributes', () => {
    const PropProbe = definition({
      name: 'PropProbe',
      body: 'none',
      props: [
        { name: 'label', type: 'string', required: true, pattern: '^[A-Z]', description: 'Label' },
        { name: 'count', type: 'number', min: 1, max: 10 },
        { name: 'enabled', type: 'boolean', default: false },
        { name: 'config', type: 'json', required: true },
        { name: 'tone', type: 'string', values: ['warm', 'cool'], default: 'cool' },
      ],
      Component: ({
        label,
        count,
        enabled,
        config,
        tone,
        ...attributes
      }: {
        label: string;
        count?: number;
        enabled: boolean;
        config: { mode: string };
        tone: string;
      }) =>
        createElement(
          'output',
          attributes,
          JSON.stringify({ label, count, enabled, config, tone }),
        ),
    });

    const rendered = compile(
      `<PropProbe label="Launch" count="3.5" enabled config='{"mode":"safe"}' class="probe" id="probe" aria-label="Probe" data-state="ready" />`,
      { definitions: [PropProbe] },
    );

    expect(rendered.ok && rendered.html).toContain(
      '{"label":"Launch","count":3.5,"enabled":true,"config":{"mode":"safe"},"tone":"cool"}',
    );
    expect(rendered.ok && rendered.html).toContain('id="probe"');
    expect(rendered.ok && rendered.html).toContain('aria-label="Probe"');
    expect(rendered.ok && rendered.html).toContain('data-state="ready"');
  });

  test.each([
    ['missing required prop', '<ValidatedProbe />', 'required prop "label"'],
    ['unknown prop', '<ValidatedProbe label="Good" surprise="no" />', 'unknown prop "surprise"'],
    ['invalid string pattern', '<ValidatedProbe label="bad" />', 'does not match pattern'],
    ['invalid allowed value', '<ValidatedProbe label="Good" tone="hot" />', 'must be one of'],
    ['invalid number', '<ValidatedProbe label="Good" count="many" />', 'finite number'],
    ['number below minimum', '<ValidatedProbe label="Good" count="0" />', 'at least 1'],
    ['number above maximum', '<ValidatedProbe label="Good" count="11" />', 'at most 10'],
    ['invalid boolean', '<ValidatedProbe label="Good" enabled="yes" />', 'true or false'],
    ['invalid JSON', '<ValidatedProbe label="Good" config="not-json" />', 'valid JSON'],
  ])('rejects %s', (_case, source, message) => {
    const PropProbe = definition({
      name: 'ValidatedProbe',
      body: 'none',
      props: [
        { name: 'label', type: 'string', required: true, pattern: '^[A-Z]' },
        { name: 'tone', type: 'string', values: ['warm', 'cool'] },
        { name: 'count', type: 'number', min: 1, max: 10 },
        { name: 'enabled', type: 'boolean' },
        { name: 'config', type: 'json' },
      ],
      Component: () => null,
    });

    expect(compile(source, { definitions: [PropProbe] })).toMatchObject({
      ok: false,
      error: expect.stringContaining(message),
    });
  });

  test('supports definition-based per-render and global registration alongside legacy APIs', () => {
    const PerRender = definition({
      name: 'DefinitionPerRender',
      body: 'htmdx',
      Component: ({ children }: { children?: ReactNode }) => createElement('aside', null, children),
    });
    const GlobalOne = definition({
      name: 'DefinitionGlobalOne',
      body: 'none',
      Component: () => createElement('output', null, 'global-one'),
    });
    const GlobalTwo = definition({
      name: 'DefinitionGlobalTwo',
      body: 'none',
      Component: () => createElement('output', null, 'global-two'),
    });
    const GlobalThree = definition({
      name: 'DefinitionGlobalThree',
      body: 'none',
      Component: () => createElement('output', null, 'global-three'),
    });

    registerComponent(GlobalOne, { rerender: false });
    registerComponents([GlobalTwo, GlobalThree], { rerender: false });

    expect(
      compile('<DefinitionPerRender>**per render**</DefinitionPerRender>', {
        definitions: [PerRender],
      }),
    ).toMatchObject({ ok: true });
    expect(
      compile('<DefinitionGlobalOne /><DefinitionGlobalTwo /><DefinitionGlobalThree />'),
    ).toMatchObject({ ok: true });
  });

  test('rejects definition name collisions case-insensitively', () => {
    const BundledCollision = definition({
      name: 'executivesummary',
      body: 'none',
      Component: () => null,
    });
    const First = definition({ name: 'CaseCollision', body: 'none', Component: () => null });
    const Second = definition({ name: 'casecollision', body: 'none', Component: () => null });

    expect(compile('<executivesummary />', { definitions: [BundledCollision] })).toMatchObject({
      ok: false,
      error: expect.stringContaining('collides with <ExecutiveSummary>'),
    });
    expect(compile('<CaseCollision />', { definitions: [First, Second] })).toMatchObject({
      ok: false,
      error: expect.stringContaining('collides with <CaseCollision>'),
    });
    expect(() => registerComponent(BundledCollision, { rerender: false })).toThrow(
      'collides with <ExecutiveSummary>',
    );
    expect(() => registerComponent('EXECUTIVESUMMARY', () => null, { rerender: false })).toThrow(
      'collides with <ExecutiveSummary>',
    );
    expect(
      compile('<EXECUTIVESUMMARY />', {
        components: { EXECUTIVESUMMARY: () => null },
      }),
    ).toMatchObject({
      ok: false,
      error: expect.stringContaining('collides with <ExecutiveSummary>'),
    });
  });
});
