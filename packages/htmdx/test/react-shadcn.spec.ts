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

  test('Radix Tabs switch panels on trigger interaction', () => {
    const { host, root } = mount(`<Tabs default-value="summary">
  <TabsList>
    <TabsTrigger value="summary">Summary</TabsTrigger>
    <TabsTrigger value="details">Details</TabsTrigger>
  </TabsList>
  <TabsContent value="summary">The summary panel</TabsContent>
  <TabsContent value="details">The details panel</TabsContent>
</Tabs>`);

    const activePanel = () => host.querySelector('[data-slot="tabs-content"][data-state="active"]');
    expect(activePanel()?.textContent).toContain('The summary panel');

    const detailsTrigger = Array.from(
      host.querySelectorAll<HTMLElement>('[data-slot="tabs-trigger"]'),
    ).find((trigger) => trigger.textContent?.includes('Details'));
    expect(detailsTrigger).toBeDefined();

    act(() => {
      detailsTrigger?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
      detailsTrigger?.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    });

    expect(activePanel()?.textContent).toContain('The details panel');
    unmount(host, root);
  });

  test('Radix Accordion expands and collapses from HTMDX source', () => {
    const { host, root } = mount(`<Accordion type="single" collapsible>
  <AccordionItem value="risks">
    <AccordionTrigger>Key risks</AccordionTrigger>
    <AccordionContent>Vendor lock-in and churn.</AccordionContent>
  </AccordionItem>
</Accordion>`);

    const trigger = host.querySelector<HTMLElement>('[data-slot="accordion-trigger"]');
    expect(trigger).not.toBeNull();
    expect(host.textContent).not.toContain('Vendor lock-in');

    act(() => {
      trigger?.click();
    });
    expect(host.textContent).toContain('Vendor lock-in and churn.');
    expect(trigger?.getAttribute('data-state')).toBe('open');

    act(() => {
      trigger?.click();
    });
    expect(trigger?.getAttribute('data-state')).toBe('closed');
    unmount(host, root);
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
        { components: shadcnComponents },
      ),
    );
    expect(html).toContain('data-slot="table-container"');
    expect(html).toContain('data-slot="table"');
    expect(html).toContain('data-slot="table-header"');
    expect(html).toContain('data-slot="table-body"');
    expect(html).toContain('data-slot="table-caption"');
    expect(html).toContain('<th');
    expect(html).toContain('$1,140');
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

  test('Collapsible toggles open state from its trigger', () => {
    const { host, root } = mount(`<Collapsible>
  <CollapsibleTrigger>
    <Button variant="outline">Toggle details</Button>
  </CollapsibleTrigger>
  <CollapsibleContent>Hidden until expanded.</CollapsibleContent>
</Collapsible>`);

    const trigger = host.querySelector<HTMLElement>('[data-slot="collapsible-trigger"]');
    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute('data-state')).toBe('closed');

    act(() => {
      trigger?.click();
    });
    expect(trigger?.getAttribute('data-state')).toBe('open');

    act(() => {
      trigger?.click();
    });
    expect(trigger?.getAttribute('data-state')).toBe('closed');
    unmount(host, root);
  });

  test('full document: markdown narrative around interactive shadcn blocks', () => {
    const { host, root } = mount(`## Findings

Narrative before the card.

<Card>
  <CardContent>
    <Badge>ok</Badge>
  </CardContent>
</Card>

<Tabs default-value="a">
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
    expect(host.querySelector('[data-slot="tabs"]')).not.toBeNull();
    expect(host.textContent).toContain('Narrative before the card.');
    expect(host.textContent).toContain('Narrative after the tabs.');
    unmount(host, root);
  });
});
