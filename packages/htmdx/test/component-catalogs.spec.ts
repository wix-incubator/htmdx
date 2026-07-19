import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { compile } from '../src';
import type { HtmdxComponent } from '../src/component-definition';
import * as builtinDefinitions from '../src/components/builtins';
import * as shadcnDefinitions from '../src/components/shadcn';
import { createComponentManifest } from '../src/component-manifest';

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
        'IntentList',
        'SignalGrid',
        'OpenQuestions',
      ]),
    );
    expect(Object.keys(shadcnDefinitions)).toEqual(
      expect.arrayContaining([
        'Accordion',
        'AccordionContent',
        'AccordionItem',
        'AccordionTrigger',
        'Badge',
        'Button',
        'AspectRatio',
        'Progress',
        'Separator',
        'Alert',
        'AlertTitle',
        'AlertDescription',
        'Avatar',
        'AvatarImage',
        'AvatarFallback',
        'Breadcrumb',
        'BreadcrumbList',
        'BreadcrumbItem',
        'BreadcrumbLink',
        'BreadcrumbPage',
        'BreadcrumbSeparator',
        'BreadcrumbEllipsis',
        'Collapsible',
        'CollapsibleContent',
        'CollapsibleTrigger',
        'Dialog',
        'DialogClose',
        'DialogContent',
        'DialogDescription',
        'DialogFooter',
        'DialogHeader',
        'DialogOverlay',
        'DialogPortal',
        'DialogTitle',
        'DialogTrigger',
        'HoverCard',
        'HoverCardContent',
        'HoverCardTrigger',
        'Popover',
        'PopoverAnchor',
        'PopoverContent',
        'PopoverTrigger',
        'Tooltip',
        'TooltipContent',
        'TooltipProvider',
        'TooltipTrigger',
        'Table',
        'TableBody',
        'TableCaption',
        'TableCell',
        'TableFooter',
        'TableHead',
        'TableHeader',
        'TableRow',
        'Tabs',
        'TabsContent',
        'TabsList',
        'TabsTrigger',
      ]),
    );

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
    const manifest = createComponentManifest();

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
    ['Sources', '- Product Strategy', 'Product Strategy'],
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

describe('planning Built-ins through the definition catalog', () => {
  test.each([
    [
      'IntentList',
      '- **#int-001 · Blocker · Owner · Main intent:** "I want one source of truth." — unsure → confident',
      ['#int-001', 'Owner', 'one source of truth', 'confident'],
    ],
    [
      'SignalGrid',
      '- **User pain | red:** Manual review — Teams lose time to repeated checks.',
      ['User pain', 'Manual review', 'Teams lose time'],
    ],
    [
      'OpenQuestions',
      '- **Risk:** The old catalog may drift from runtime registration.',
      ['RISK', 'The old catalog may drift'],
    ],
  ])('parses and renders <%s> structured Markdown', (name, body, output) => {
    const rendered = compile(`<${name}>\n${body}\n</${name}>`);

    expect(rendered).toMatchObject({ ok: true, components: [name] });
    expect(rendered.ok && rendered.html).toContain(`data-htmdx-component="${name}"`);
    for (const text of output) {
      expect(rendered.ok && rendered.html).toContain(text);
    }
  });

  test.each(['IntentList', 'SignalGrid', 'OpenQuestions'])(
    'keeps <%s> card-list validation actionable',
    (name) => {
      expect(compile(`<${name}>\nnot a list\n</${name}>`)).toMatchObject({
        ok: false,
        error: expect.stringContaining("one or more non-empty '- item' rows"),
      });
    },
  );
});

describe('alert, avatar, and breadcrumb definitions', () => {
  test('declare their HTMDX body and authoring prop contracts', () => {
    expect(shadcnDefinitions.Alert).toMatchObject({
      body: 'htmdx',
      props: [{ name: 'variant', type: 'string', values: ['default', 'destructive'] }],
    });
    expect(shadcnDefinitions.AlertTitle.body).toBe('htmdx');
    expect(shadcnDefinitions.AlertDescription.body).toBe('htmdx');
    expect(shadcnDefinitions.Avatar.body).toBe('htmdx');
    expect(shadcnDefinitions.AvatarImage).toMatchObject({
      body: 'none',
      props: [
        { name: 'src', type: 'string', required: true },
        { name: 'alt', type: 'string' },
      ],
    });
    expect(shadcnDefinitions.AvatarFallback.body).toBe('htmdx');
    expect(shadcnDefinitions.Breadcrumb.body).toBe('htmdx');
    expect(shadcnDefinitions.BreadcrumbList.body).toBe('htmdx');
    expect(shadcnDefinitions.BreadcrumbItem.body).toBe('htmdx');
    expect(shadcnDefinitions.BreadcrumbLink).toMatchObject({
      body: 'htmdx',
      props: [{ name: 'href', type: 'string', required: true }],
    });
    expect(shadcnDefinitions.BreadcrumbPage.body).toBe('htmdx');
    expect(shadcnDefinitions.BreadcrumbSeparator.body).toBe('htmdx');
    expect(shadcnDefinitions.BreadcrumbEllipsis.body).toBe('none');
  });
});

describe('Card family at the HTMDX catalog boundary', () => {
  test('declares all structural tags as composable HTMDX definitions', () => {
    expect([
      shadcnDefinitions.Card,
      shadcnDefinitions.CardAction,
      shadcnDefinitions.CardContent,
      shadcnDefinitions.CardDescription,
      shadcnDefinitions.CardFooter,
      shadcnDefinitions.CardHeader,
      shadcnDefinitions.CardTitle,
    ]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Card', body: 'htmdx' }),
        expect.objectContaining({ name: 'CardAction', body: 'htmdx' }),
        expect.objectContaining({ name: 'CardContent', body: 'htmdx' }),
        expect.objectContaining({ name: 'CardDescription', body: 'htmdx' }),
        expect.objectContaining({ name: 'CardFooter', body: 'htmdx' }),
        expect.objectContaining({ name: 'CardHeader', body: 'htmdx' }),
        expect.objectContaining({ name: 'CardTitle', body: 'htmdx' }),
      ]),
    );
  });

  test('renders direct Markdown and nested component composition', () => {
    const direct = compile('<Card>Revenue grew **12%** quarter over quarter.</Card>');
    expect(direct).toMatchObject({ ok: true });
    expect(direct.ok && direct.html).toContain('<strong>12%</strong>');

    const rendered = compile(`<Card>
  <CardHeader>
    <CardTitle>Revenue</CardTitle>
    <CardDescription>Audited quarterly numbers</CardDescription>
    <CardAction><Badge variant="secondary">audited</Badge></CardAction>
  </CardHeader>
  <CardContent>Revenue grew **12%** quarter over quarter.</CardContent>
  <CardFooter><Button variant="outline" size="sm">Download</Button></CardFooter>
</Card>`);

    expect(rendered).toMatchObject({ ok: true });
    expect(rendered.ok && rendered.html).toContain('<strong>12%</strong>');
    expect(rendered.ok && rendered.html).toContain('audited');
    expect(rendered.ok && rendered.html).toContain('Download');
  });
});

describe('disclosure families at the HTMDX catalog boundary', () => {
  test('declares each family member as composable HTMDX', () => {
    expect([
      shadcnDefinitions.Accordion,
      shadcnDefinitions.AccordionContent,
      shadcnDefinitions.AccordionItem,
      shadcnDefinitions.AccordionTrigger,
      shadcnDefinitions.Tabs,
      shadcnDefinitions.TabsContent,
      shadcnDefinitions.TabsList,
      shadcnDefinitions.TabsTrigger,
      shadcnDefinitions.Collapsible,
      shadcnDefinitions.CollapsibleContent,
      shadcnDefinitions.CollapsibleTrigger,
    ]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Accordion', body: 'htmdx' }),
        expect.objectContaining({ name: 'AccordionContent', body: 'htmdx' }),
        expect.objectContaining({ name: 'AccordionItem', body: 'htmdx' }),
        expect.objectContaining({ name: 'AccordionTrigger', body: 'htmdx' }),
        expect.objectContaining({ name: 'Tabs', body: 'htmdx' }),
        expect.objectContaining({ name: 'TabsContent', body: 'htmdx' }),
        expect.objectContaining({ name: 'TabsList', body: 'htmdx' }),
        expect.objectContaining({ name: 'TabsTrigger', body: 'htmdx' }),
        expect.objectContaining({ name: 'Collapsible', body: 'htmdx' }),
        expect.objectContaining({ name: 'CollapsibleContent', body: 'htmdx' }),
        expect.objectContaining({ name: 'CollapsibleTrigger', body: 'htmdx' }),
      ]),
    );
  });

  test('declares the family authoring props', () => {
    expect(shadcnDefinitions.Accordion.props).toEqual([
      expect.objectContaining({
        name: 'type',
        type: 'string',
        required: true,
        values: ['single', 'multiple'],
      }),
      expect.objectContaining({
        name: 'collapsible',
        type: 'boolean',
        default: false,
      }),
      expect.objectContaining({ name: 'defaultValue', type: 'json' }),
    ]);
    expect(shadcnDefinitions.AccordionItem.props).toEqual([
      expect.objectContaining({ name: 'value', type: 'string', required: true }),
    ]);
    expect(shadcnDefinitions.Tabs.props).toEqual([
      expect.objectContaining({ name: 'defaultValue', type: 'string', required: true }),
    ]);
    expect(shadcnDefinitions.TabsTrigger.props).toEqual([
      expect.objectContaining({ name: 'value', type: 'string', required: true }),
    ]);
    expect(shadcnDefinitions.TabsContent.props).toEqual([
      expect.objectContaining({ name: 'value', type: 'string', required: true }),
    ]);
    expect(shadcnDefinitions.Collapsible.props).toEqual([
      expect.objectContaining({
        name: 'defaultOpen',
        type: 'boolean',
        default: false,
      }),
    ]);
  });

  test('enforces disclosure props through the HTMDX schema', () => {
    expect(
      compile('<Accordion><AccordionItem value="a">A</AccordionItem></Accordion>'),
    ).toMatchObject({
      ok: false,
      error: expect.stringContaining('required prop "type" is missing'),
    });
    expect(compile('<Accordion type="many"></Accordion>')).toMatchObject({
      ok: false,
      error: expect.stringContaining('must be one of'),
    });
    expect(compile('<Tabs><TabsList /></Tabs>')).toMatchObject({
      ok: false,
      error: expect.stringContaining('required prop "defaultValue" is missing'),
    });
    expect(compile('<Collapsible defaultOpen="sometimes" />')).toMatchObject({
      ok: false,
      error: expect.stringContaining('must be true or false'),
    });
  });

  test('renders declarative family compositions with nested Markdown', () => {
    const rendered = compile(`<Tabs defaultValue="summary">
  <TabsList><TabsTrigger value="summary">Summary</TabsTrigger></TabsList>
  <TabsContent value="summary">
    Summary with **key metrics**.
    <Accordion type="single" collapsible="true">
      <AccordionItem value="risks">
        <AccordionTrigger>Risks</AccordionTrigger>
        <AccordionContent>Vendor **lock-in**.</AccordionContent>
      </AccordionItem>
    </Accordion>
    <Collapsible defaultOpen>
      <CollapsibleTrigger>Details</CollapsibleTrigger>
      <CollapsibleContent>Supporting evidence.</CollapsibleContent>
    </Collapsible>
  </TabsContent>
</Tabs>`);

    expect(rendered).toMatchObject({ ok: true });
    expect(rendered.ok && rendered.html).toContain('<strong>key metrics</strong>');
  });
});

describe('Dialog family at the HTMDX catalog boundary', () => {
  test('declares composable and bodyless family members', () => {
    expect([
      shadcnDefinitions.Dialog,
      shadcnDefinitions.DialogClose,
      shadcnDefinitions.DialogContent,
      shadcnDefinitions.DialogDescription,
      shadcnDefinitions.DialogFooter,
      shadcnDefinitions.DialogHeader,
      shadcnDefinitions.DialogOverlay,
      shadcnDefinitions.DialogPortal,
      shadcnDefinitions.DialogTitle,
      shadcnDefinitions.DialogTrigger,
    ]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Dialog', body: 'htmdx' }),
        expect.objectContaining({ name: 'DialogClose', body: 'htmdx' }),
        expect.objectContaining({ name: 'DialogContent', body: 'htmdx' }),
        expect.objectContaining({ name: 'DialogDescription', body: 'htmdx' }),
        expect.objectContaining({ name: 'DialogFooter', body: 'htmdx' }),
        expect.objectContaining({ name: 'DialogHeader', body: 'htmdx' }),
        expect.objectContaining({ name: 'DialogOverlay', body: 'none' }),
        expect.objectContaining({ name: 'DialogPortal', body: 'htmdx' }),
        expect.objectContaining({ name: 'DialogTitle', body: 'htmdx' }),
        expect.objectContaining({ name: 'DialogTrigger', body: 'htmdx' }),
      ]),
    );
  });

  test('declares supported authoring props', () => {
    expect(shadcnDefinitions.Dialog.props).toEqual([
      expect.objectContaining({ name: 'defaultOpen', type: 'boolean', default: false }),
      expect.objectContaining({ name: 'modal', type: 'boolean', default: true }),
    ]);
    expect(shadcnDefinitions.DialogTrigger.props).toEqual([
      expect.objectContaining({ name: 'asChild', type: 'boolean', default: false }),
    ]);
    expect(shadcnDefinitions.DialogClose.props).toEqual([
      expect.objectContaining({ name: 'asChild', type: 'boolean', default: false }),
    ]);
    expect(shadcnDefinitions.DialogContent.props).toEqual([
      expect.objectContaining({ name: 'showCloseButton', type: 'boolean', default: true }),
      expect.objectContaining({ name: 'forceMount', type: 'boolean', default: false }),
    ]);
    expect(shadcnDefinitions.DialogFooter.props).toEqual([
      expect.objectContaining({ name: 'showCloseButton', type: 'boolean', default: false }),
    ]);
    expect(shadcnDefinitions.DialogOverlay.props).toEqual([
      expect.objectContaining({ name: 'forceMount', type: 'boolean', default: false }),
    ]);
    expect(shadcnDefinitions.DialogPortal.props).toEqual([
      expect.objectContaining({ name: 'forceMount', type: 'boolean', default: false }),
    ]);
  });

  test('enforces Dialog props and body modes through the HTMDX schema', () => {
    expect(compile('<Dialog modal="sometimes" />')).toMatchObject({
      ok: false,
      error: expect.stringContaining('must be true or false'),
    });
    expect(compile('<DialogContent showCloseButton="sometimes" />')).toMatchObject({
      ok: false,
      error: expect.stringContaining('must be true or false'),
    });
    expect(compile('<DialogOverlay>backdrop</DialogOverlay>')).toMatchObject({
      ok: false,
      error: expect.stringContaining('does not allow a body'),
    });
  });
});

describe('floating-content families at the HTMDX catalog boundary', () => {
  test('declares all family members as composable HTMDX definitions', () => {
    expect([
      shadcnDefinitions.HoverCard,
      shadcnDefinitions.HoverCardContent,
      shadcnDefinitions.HoverCardTrigger,
      shadcnDefinitions.Popover,
      shadcnDefinitions.PopoverAnchor,
      shadcnDefinitions.PopoverContent,
      shadcnDefinitions.PopoverTrigger,
      shadcnDefinitions.Tooltip,
      shadcnDefinitions.TooltipContent,
      shadcnDefinitions.TooltipProvider,
      shadcnDefinitions.TooltipTrigger,
    ]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'HoverCard', body: 'htmdx' }),
        expect.objectContaining({ name: 'HoverCardContent', body: 'htmdx' }),
        expect.objectContaining({ name: 'HoverCardTrigger', body: 'htmdx' }),
        expect.objectContaining({ name: 'Popover', body: 'htmdx' }),
        expect.objectContaining({ name: 'PopoverAnchor', body: 'htmdx' }),
        expect.objectContaining({ name: 'PopoverContent', body: 'htmdx' }),
        expect.objectContaining({ name: 'PopoverTrigger', body: 'htmdx' }),
        expect.objectContaining({ name: 'Tooltip', body: 'htmdx' }),
        expect.objectContaining({ name: 'TooltipContent', body: 'htmdx' }),
        expect.objectContaining({ name: 'TooltipProvider', body: 'htmdx' }),
        expect.objectContaining({ name: 'TooltipTrigger', body: 'htmdx' }),
      ]),
    );
  });

  test('declares supported root, trigger, content, and provider props', () => {
    expect(shadcnDefinitions.HoverCard.props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'defaultOpen', type: 'boolean', default: false }),
        expect.objectContaining({ name: 'openDelay', type: 'number', default: 700 }),
        expect.objectContaining({ name: 'closeDelay', type: 'number', default: 300 }),
      ]),
    );
    expect(shadcnDefinitions.Popover.props).toEqual([
      expect.objectContaining({ name: 'defaultOpen', type: 'boolean', default: false }),
      expect.objectContaining({ name: 'modal', type: 'boolean', default: false }),
    ]);
    expect(shadcnDefinitions.Tooltip.props).toEqual([
      expect.objectContaining({ name: 'defaultOpen', type: 'boolean', default: false }),
      expect.objectContaining({ name: 'delayDuration', type: 'number', default: 0 }),
      expect.objectContaining({
        name: 'disableHoverableContent',
        type: 'boolean',
        default: false,
      }),
    ]);
    for (const trigger of [
      shadcnDefinitions.HoverCardTrigger,
      shadcnDefinitions.PopoverAnchor,
      shadcnDefinitions.PopoverTrigger,
      shadcnDefinitions.TooltipTrigger,
    ]) {
      expect(trigger.props).toEqual([
        expect.objectContaining({ name: 'asChild', type: 'boolean', default: false }),
      ]);
    }
    for (const content of [
      shadcnDefinitions.HoverCardContent,
      shadcnDefinitions.PopoverContent,
      shadcnDefinitions.TooltipContent,
    ]) {
      expect(content.props).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'forceMount', type: 'boolean', default: false }),
          expect.objectContaining({
            name: 'side',
            type: 'string',
            values: ['top', 'right', 'bottom', 'left'],
          }),
          expect.objectContaining({
            name: 'align',
            type: 'string',
            values: ['start', 'center', 'end'],
          }),
        ]),
      );
    }
    expect(shadcnDefinitions.TooltipProvider.props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'delayDuration', type: 'number', default: 0 }),
        expect.objectContaining({ name: 'skipDelayDuration', type: 'number', default: 300 }),
        expect.objectContaining({
          name: 'disableHoverableContent',
          type: 'boolean',
          default: false,
        }),
      ]),
    );
  });

  test('enforces floating-content props through the HTMDX schema', () => {
    expect(compile('<HoverCard openDelay="soon" />')).toMatchObject({
      ok: false,
      error: expect.stringContaining('finite number'),
    });
    expect(compile('<PopoverContent side="diagonal" />')).toMatchObject({
      ok: false,
      error: expect.stringContaining('must be one of'),
    });
    expect(compile('<TooltipProvider delayDuration="-1" />')).toMatchObject({
      ok: false,
      error: expect.stringContaining('at least 0'),
    });
  });

  test('compiles declarative compositions at the runtime boundary', () => {
    expect(
      compile(`<TooltipProvider delayDuration="200">
  <HoverCard>
    <HoverCardTrigger>Account</HoverCardTrigger>
    <HoverCardContent>Account preview.</HoverCardContent>
  </HoverCard>
  <Popover>
    <PopoverAnchor>Filters</PopoverAnchor>
    <PopoverTrigger>Open filters</PopoverTrigger>
    <PopoverContent>Filter choices.</PopoverContent>
  </Popover>
  <Tooltip>
    <TooltipTrigger>Status</TooltipTrigger>
    <TooltipContent>Published</TooltipContent>
  </Tooltip>
</TooltipProvider>`),
    ).toMatchObject({ ok: true });
  });
});

describe('Table family at the HTMDX catalog boundary', () => {
  test('declares all structural tags as composable HTMDX definitions', () => {
    expect([
      shadcnDefinitions.Table,
      shadcnDefinitions.TableBody,
      shadcnDefinitions.TableCaption,
      shadcnDefinitions.TableCell,
      shadcnDefinitions.TableFooter,
      shadcnDefinitions.TableHead,
      shadcnDefinitions.TableHeader,
      shadcnDefinitions.TableRow,
    ]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Table', body: 'htmdx' }),
        expect.objectContaining({ name: 'TableBody', body: 'htmdx' }),
        expect.objectContaining({ name: 'TableCaption', body: 'htmdx' }),
        expect.objectContaining({ name: 'TableCell', body: 'htmdx' }),
        expect.objectContaining({ name: 'TableFooter', body: 'htmdx' }),
        expect.objectContaining({ name: 'TableHead', body: 'htmdx' }),
        expect.objectContaining({ name: 'TableHeader', body: 'htmdx' }),
        expect.objectContaining({ name: 'TableRow', body: 'htmdx' }),
      ]),
    );
  });

  test('declares supported cell authoring props', () => {
    expect(shadcnDefinitions.TableCell.props).toEqual([
      expect.objectContaining({ name: 'colSpan', type: 'number', min: 1, max: 1000 }),
      expect.objectContaining({ name: 'rowSpan', type: 'number', min: 0, max: 65534 }),
      expect.objectContaining({ name: 'headers', type: 'string' }),
    ]);
    expect(shadcnDefinitions.TableHead.props).toEqual([
      expect.objectContaining({ name: 'colSpan', type: 'number', min: 1, max: 1000 }),
      expect.objectContaining({ name: 'rowSpan', type: 'number', min: 0, max: 65534 }),
      expect.objectContaining({ name: 'headers', type: 'string' }),
      expect.objectContaining({
        name: 'scope',
        type: 'string',
        values: ['row', 'col', 'rowgroup', 'colgroup'],
      }),
      expect.objectContaining({ name: 'abbr', type: 'string' }),
    ]);
  });

  test('enforces declared cell props through the HTMDX schema', () => {
    expect(
      compile(
        '<Table><TableHeader><TableRow><TableHead scope="page">Plan</TableHead></TableRow></TableHeader></Table>',
      ),
    ).toMatchObject({ ok: false, error: expect.stringContaining('must be one of') });
    expect(
      compile(
        '<Table><TableBody><TableRow><TableCell colSpan="0">Plan</TableCell></TableRow></TableBody></Table>',
      ),
    ).toMatchObject({ ok: false, error: expect.stringContaining('at least 1') });
    expect(
      compile(
        '<Table><TableBody><TableRow><TableCell title="Plan">Pro</TableCell></TableRow></TableBody></Table>',
      ),
    ).toMatchObject({ ok: false, error: expect.stringContaining('unknown prop "title"') });
  });

  test('renders a complete table with Markdown cell content and declared props', () => {
    const rendered = compile(`<Table>
  <TableCaption>Quarterly plans</TableCaption>
  <TableHeader>
    <TableRow><TableHead scope="col">Plan</TableHead><TableHead scope="col">MRR</TableHead></TableRow>
  </TableHeader>
  <TableBody>
    <TableRow><TableCell>**Pro**</TableCell><TableCell>$1,140</TableCell></TableRow>
  </TableBody>
  <TableFooter>
    <TableRow><TableCell colSpan="2">Two plans</TableCell></TableRow>
  </TableFooter>
</Table>`);

    expect(rendered).toMatchObject({ ok: true });
    expect(rendered.ok && rendered.html).toContain('<strong>Pro</strong>');
    expect(rendered.ok && rendered.html).toContain('Two plans');
  });
});

describe('basic shadcn components at the HTMDX catalog boundary', () => {
  test('enforces declared props and body modes', () => {
    expect(compile('<Button variant="loud">Run</Button>')).toMatchObject({
      ok: false,
      error: expect.stringContaining('must be one of'),
    });
    expect(compile('<AspectRatio ratio="0">media</AspectRatio>')).toMatchObject({
      ok: false,
      error: expect.stringContaining('at least'),
    });
    expect(compile('<Progress value="101" />')).toMatchObject({
      ok: false,
      error: expect.stringContaining('at most 100'),
    });
    expect(compile('<Separator>content</Separator>')).toMatchObject({
      ok: false,
      error: expect.stringContaining('does not allow a body'),
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
