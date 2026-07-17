import { describe, expect, test } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { compileToReact, Htmdx } from '../src/react';
import { shadcnComponents } from '../src/react/shadcn';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function mount(source: string) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(createElement(Htmdx, { source, components: shadcnComponents }));
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
        { components: shadcnComponents },
      ),
    );

    expect(html).toContain('data-slot="card"');
    expect(html).toContain('data-slot="card-title"');
    expect(html).toContain('max-w-md');
    expect(html).toContain('bg-card');
    expect(html).toContain('<strong>12%</strong>');
    expect(html).toContain('bg-secondary');
    expect(html).toContain('data-slot="button"');
    expect(html).toContain('h-8');
  });

  test('renders top-level Badge and Button labels as inline children', () => {
    const html = renderToStaticMarkup(
      compileToReact(
        '<Badge variant="secondary">audited</Badge><Button variant="outline">Download</Button>',
        { components: shadcnComponents },
      ),
    );
    const container = document.createElement('div');
    container.innerHTML = html;

    const badge = container.querySelector('[data-slot="badge"]');
    const button = container.querySelector('[data-slot="button"]');
    expect(badge?.textContent).toBe('audited');
    expect(badge?.firstElementChild).toBeNull();
    expect(button?.textContent).toBe('Download');
    expect(button?.firstElementChild).toBeNull();
  });

  test('badge variants resolve through CVA from HTMDX attributes', () => {
    const html = renderToStaticMarkup(
      compileToReact('<Badge variant="destructive">blocked</Badge>', {
        components: shadcnComponents,
      }),
    );
    expect(html).toContain('bg-destructive');
    expect(html).toContain('blocked');
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

  test('Alert renders titled variant markup', () => {
    const html = renderToStaticMarkup(
      compileToReact(
        `<Alert variant="destructive">
  <AlertTitle>Blocked</AlertTitle>
  <AlertDescription>Migration cannot proceed.</AlertDescription>
</Alert>`,
        { components: shadcnComponents },
      ),
    );
    expect(html).toContain('data-slot="alert"');
    expect(html).toContain('data-slot="alert-title"');
    expect(html).toContain('data-slot="alert-description"');
    expect(html).toContain('text-destructive');
    expect(html).toContain('Migration cannot proceed.');
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

  test('Avatar family renders fallback and slot markers', () => {
    const html = renderToStaticMarkup(
      compileToReact(
        `<Avatar>
  <AvatarImage src="https://example.com/a.png" alt="A" />
  <AvatarFallback>CN</AvatarFallback>
</Avatar>`,
        { components: shadcnComponents },
      ),
    );
    expect(html).toContain('data-slot="avatar"');
    expect(html).toContain('data-slot="avatar-fallback"');
    expect(html).toContain('CN');
  });

  test('Progress renders indicator with numeric value', () => {
    const html = renderToStaticMarkup(
      compileToReact('<Progress value="60" />', { components: shadcnComponents }),
    );
    expect(html).toContain('data-slot="progress"');
    expect(html).toContain('data-slot="progress-indicator"');
    expect(html).toContain('translateX(-40%)');
  });

  test('Separator renders its slot marker and orientation', () => {
    const separator = renderToStaticMarkup(
      compileToReact('<Separator orientation="vertical" />', { components: shadcnComponents }),
    );
    expect(separator).toContain('data-slot="separator"');
    expect(separator).toContain('data-orientation="vertical"');
  });

  test('Breadcrumb family renders trail markup', () => {
    const html = renderToStaticMarkup(
      compileToReact(
        `<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Reports</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>`,
        { components: shadcnComponents },
      ),
    );
    expect(html).toContain('data-slot="breadcrumb"');
    expect(html).toContain('data-slot="breadcrumb-link"');
    expect(html).toContain('data-slot="breadcrumb-page"');
    expect(html).toContain('data-slot="breadcrumb-separator"');
    expect(html).toContain('aria-current="page"');
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
