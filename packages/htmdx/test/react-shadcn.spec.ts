import { describe, expect, test } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import * as shadcnDefinitions from '../src/components/shadcn';
import { compileToReact, Htmdx } from '../src/react';
import { shadcnComponents } from '../src/react/shadcn';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const definitions = Object.values(shadcnDefinitions);

function mount(source: string) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(createElement(Htmdx, { source, components: shadcnComponents, definitions }));
  });
  return { host, root };
}

function unmount(host: HTMLElement, root: Root) {
  act(() => root.unmount());
  host.remove();
}

describe('react renderer with shadcn/ui', () => {
  test('renders a shadcn Card composition from HTMDX source', () => {
    const html = renderToStaticMarkup(
      compileToReact(
        `## Q3 Report

<Card class="max-w-md">
  <CardHeader>
    <CardTitle>Revenue</CardTitle>
    <CardDescription>Audited quarterly numbers</CardDescription>
  </CardHeader>
  <CardContent>
    Revenue grew **12%** quarter over quarter.
    <Badge variant="secondary">audited</Badge>
  </CardContent>
  <CardFooter>
    <Button variant="outline" size="sm">Download</Button>
  </CardFooter>
</Card>`,
        { components: shadcnComponents, definitions },
      ),
    );

    expect(html).toContain('Revenue');
    expect(html).toContain('Audited quarterly numbers');
    expect(html).toContain('<strong>12%</strong>');
    expect(html).toContain('audited');
    expect(html).toContain('Download');
  });

  test('Table family renders semantic table markup', () => {
    const html = renderToStaticMarkup(
      compileToReact(
        `<Table>
  <TableCaption>Plans</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Plan</TableHead>
      <TableHead>MRR</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Pro</TableCell>
      <TableCell>$1,140</TableCell>
    </TableRow>
  </TableBody>
</Table>`,
        { components: shadcnComponents, definitions },
      ),
    );
    expect(html).toContain('<table');
    expect(html).toMatch(/<caption[^>]*>.*Plans.*<\/caption>/s);
    expect(html).toContain('<thead');
    expect(html).toContain('<tbody');
    expect(html).toMatch(/<th[^>]*>.*Plan.*<\/th>/s);
    expect(html).toMatch(/<td[^>]*>.*\$1,140.*<\/td>/s);
  });

  test('Dialog opens on trigger click and portals content outside the host', () => {
    const { host, root } = mount(`<Dialog>
  <DialogTrigger>
    <Button variant="outline">Open dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm migration</DialogTitle>
      <DialogDescription>This is a real modal.</DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>`);

    expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull();

    const trigger = host.querySelector<HTMLElement>('[data-slot="dialog-trigger"]');
    expect(trigger).not.toBeNull();

    act(() => {
      trigger?.click();
    });

    const content = document.querySelector('[data-slot="dialog-content"]');
    expect(content).not.toBeNull();
    expect(content?.textContent).toContain('Confirm migration');
    // The dialog is portalled: it appears in the document but not inside the host.
    expect(host.querySelector('[data-slot="dialog-content"]')).toBeNull();

    unmount(host, root);
    expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull();
  });

  test('full document: markdown narrative around interactive shadcn blocks', () => {
    const { host, root } = mount(`## Findings

Narrative before the card.

<Card>
  <CardContent>
    <Badge>ok</Badge>
  </CardContent>
</Card>

<Tabs defaultValue="a">
  <TabsList>
    <TabsTrigger value="a">A</TabsTrigger>
    <TabsTrigger value="b">B</TabsTrigger>
  </TabsList>
  <TabsContent value="a">Panel A</TabsContent>
  <TabsContent value="b">Panel B</TabsContent>
</Tabs>

Narrative after the tabs.`);

    expect(host.querySelector('h2')?.textContent).toContain('Findings');
    expect(host.querySelector('[data-slot="card"]')).not.toBeNull();
    expect(host.textContent).toContain('Panel A');
    expect(host.textContent).toContain('Narrative before the card.');
    expect(host.textContent).toContain('Narrative after the tabs.');
    unmount(host, root);
  });
});
