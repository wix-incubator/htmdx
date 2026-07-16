// Machine-readable contract for the shadcn/ui pack, mirroring the built-ins
// manifest (dist/components.json) for the React runtime. Pure data — safe to
// import without react installed.

export type HtmdxReactManifestProp = {
  name: string;
  values?: string[];
  required?: boolean;
  description?: string;
};

export type HtmdxReactManifestComponent = {
  name: string;
  purpose: string;
  props?: HtmdxReactManifestProp[];
  example?: string;
};

export const shadcnManifestComponents: readonly HtmdxReactManifestComponent[] = [
  {
    name: 'Card',
    purpose: 'Container for a self-contained block of content.',
    example:
      '<Card>\n  <CardHeader>\n    <CardTitle>Revenue</CardTitle>\n    <CardDescription>Quarterly numbers</CardDescription>\n  </CardHeader>\n  <CardContent>\nGrew **12%** quarter over quarter.\n  </CardContent>\n  <CardFooter>\n    <Button variant="outline" size="sm">Details</Button>\n  </CardFooter>\n</Card>',
  },
  { name: 'CardHeader', purpose: 'Header area of a Card; holds CardTitle and CardDescription.' },
  { name: 'CardTitle', purpose: 'Title line inside CardHeader.' },
  { name: 'CardDescription', purpose: 'Muted description line inside CardHeader.' },
  { name: 'CardAction', purpose: 'Action slot aligned to the end of CardHeader.' },
  { name: 'CardContent', purpose: 'Main body of a Card; markdown and components allowed.' },
  { name: 'CardFooter', purpose: 'Footer row of a Card, usually Buttons or Badges.' },
  {
    name: 'Badge',
    purpose: 'Small status or label chip.',
    props: [{ name: 'variant', values: ['default', 'secondary', 'destructive', 'outline'] }],
    example: '<Badge variant="secondary">audited</Badge>',
  },
  {
    name: 'Button',
    purpose: 'Button-styled element. Inert in artifacts: function props cannot be expressed.',
    props: [
      {
        name: 'variant',
        values: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      },
      { name: 'size', values: ['default', 'sm', 'lg', 'icon'] },
    ],
    example: '<Button variant="outline" size="sm">Download</Button>',
  },
  {
    name: 'Tabs',
    purpose: 'Interactive tab group; state lives inside the component.',
    props: [
      { name: 'defaultValue', required: true, description: 'value of the initially active tab' },
    ],
    example:
      '<Tabs defaultValue="a">\n  <TabsList>\n    <TabsTrigger value="a">First</TabsTrigger>\n    <TabsTrigger value="b">Second</TabsTrigger>\n  </TabsList>\n  <TabsContent value="a">First panel.</TabsContent>\n  <TabsContent value="b">Second panel.</TabsContent>\n</Tabs>',
  },
  { name: 'TabsList', purpose: 'Row of TabsTrigger elements inside Tabs.' },
  {
    name: 'TabsTrigger',
    purpose: 'Clickable tab label.',
    props: [{ name: 'value', required: true }],
  },
  {
    name: 'TabsContent',
    purpose: 'Panel shown when its value matches the active tab.',
    props: [{ name: 'value', required: true }],
  },
  {
    name: 'Accordion',
    purpose: 'Expandable sections; state lives inside the component.',
    props: [
      { name: 'type', values: ['single', 'multiple'], required: true },
      { name: 'collapsible', description: 'bare attribute; allows closing the open item' },
    ],
    example:
      '<Accordion type="single" collapsible>\n  <AccordionItem value="risks">\n    <AccordionTrigger>Key risks</AccordionTrigger>\n    <AccordionContent>Vendor lock-in.</AccordionContent>\n  </AccordionItem>\n</Accordion>',
  },
  {
    name: 'AccordionItem',
    purpose: 'One expandable section inside Accordion.',
    props: [{ name: 'value', required: true }],
  },
  { name: 'AccordionTrigger', purpose: 'Clickable header that toggles its AccordionItem.' },
  { name: 'AccordionContent', purpose: 'Body revealed when the AccordionItem is open.' },
];
