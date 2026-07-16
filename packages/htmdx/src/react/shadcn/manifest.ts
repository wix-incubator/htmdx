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
  {
    name: 'Alert',
    purpose: 'Callout banner for a titled note or warning. Display-only.',
    props: [{ name: 'variant', values: ['default', 'destructive'] }],
    example:
      '<Alert>\n  <AlertTitle>Heads up</AlertTitle>\n  <AlertDescription>This artifact is display-only.</AlertDescription>\n</Alert>',
  },
  { name: 'AlertTitle', purpose: 'Bold title line inside an Alert.' },
  { name: 'AlertDescription', purpose: 'Body text inside an Alert.' },
  {
    name: 'AspectRatio',
    purpose: 'Locks its child to a fixed width:height ratio. Display-only.',
    props: [{ name: 'ratio', description: 'number, e.g. 1.7778 for 16:9' }],
    example:
      '<AspectRatio ratio="1.7778">\n  <img src="https://images.unsplash.com/photo-1535025183041-0991a977e25b" alt="cover" />\n</AspectRatio>',
  },
  {
    name: 'Avatar',
    purpose: 'Round avatar container; holds AvatarImage and AvatarFallback. Display-only.',
    example:
      '<Avatar>\n  <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />\n  <AvatarFallback>CN</AvatarFallback>\n</Avatar>',
  },
  {
    name: 'AvatarImage',
    purpose: 'Avatar photo; falls back to AvatarFallback when it fails to load.',
    props: [{ name: 'src', required: true }, { name: 'alt' }],
  },
  { name: 'AvatarFallback', purpose: 'Initials or icon shown when AvatarImage is unavailable.' },
  {
    name: 'Breadcrumb',
    purpose: 'Breadcrumb navigation trail. Display-only.',
    example:
      '<Breadcrumb>\n  <BreadcrumbList>\n    <BreadcrumbItem>\n      <BreadcrumbLink href="/">Home</BreadcrumbLink>\n    </BreadcrumbItem>\n    <BreadcrumbSeparator />\n    <BreadcrumbItem>\n      <BreadcrumbPage>Reports</BreadcrumbPage>\n    </BreadcrumbItem>\n  </BreadcrumbList>\n</Breadcrumb>',
  },
  { name: 'BreadcrumbList', purpose: 'Ordered-list wrapper for breadcrumb items.' },
  { name: 'BreadcrumbItem', purpose: 'One entry in the breadcrumb trail.' },
  {
    name: 'BreadcrumbLink',
    purpose: 'Linked breadcrumb entry.',
    props: [{ name: 'href', required: true }],
  },
  { name: 'BreadcrumbPage', purpose: 'Current-page breadcrumb entry (not a link).' },
  { name: 'BreadcrumbSeparator', purpose: 'Chevron between breadcrumb items.' },
  { name: 'BreadcrumbEllipsis', purpose: 'Collapsed-items indicator in a breadcrumb.' },
  {
    name: 'Collapsible',
    purpose: 'Single expandable region toggled by CollapsibleTrigger; state lives inside.',
    props: [{ name: 'defaultOpen', description: 'defaultOpen="true" starts expanded' }],
    example:
      '<Collapsible>\n  <CollapsibleTrigger>\n    <Button variant="outline">Toggle details</Button>\n  </CollapsibleTrigger>\n  <CollapsibleContent>Hidden until expanded.</CollapsibleContent>\n</Collapsible>',
  },
  { name: 'CollapsibleTrigger', purpose: 'Element that expands/collapses the CollapsibleContent.' },
  { name: 'CollapsibleContent', purpose: 'Region shown when the Collapsible is open.' },
  {
    name: 'Dialog',
    purpose: 'Modal dialog opened by DialogTrigger; content renders in a portal over an overlay.',
    example:
      '<Dialog>\n  <DialogTrigger>\n    <Button variant="outline">Open dialog</Button>\n  </DialogTrigger>\n  <DialogContent>\n    <DialogHeader>\n      <DialogTitle>Confirm</DialogTitle>\n      <DialogDescription>This is a real modal.</DialogDescription>\n    </DialogHeader>\n    <DialogFooter>\n      <DialogClose>\n        <Button variant="outline">Close</Button>\n      </DialogClose>\n    </DialogFooter>\n  </DialogContent>\n</Dialog>',
  },
  { name: 'DialogTrigger', purpose: 'Element that opens the Dialog on click.' },
  { name: 'DialogContent', purpose: 'Modal surface (portalled) holding header, body, and footer.' },
  { name: 'DialogHeader', purpose: 'Top area of DialogContent; holds title and description.' },
  { name: 'DialogFooter', purpose: 'Bottom action row of DialogContent.' },
  { name: 'DialogTitle', purpose: 'Accessible title of the Dialog.' },
  { name: 'DialogDescription', purpose: 'Muted description under the DialogTitle.' },
  { name: 'DialogClose', purpose: 'Element that closes the Dialog on click.' },
  {
    name: 'DialogOverlay',
    purpose: 'Dimmed backdrop behind the Dialog; rendered automatically by DialogContent.',
  },
  {
    name: 'DialogPortal',
    purpose: 'Portal host for Dialog layers; used internally by DialogContent.',
  },
  {
    name: 'HoverCard',
    purpose: 'Rich card revealed on hover of HoverCardTrigger.',
    example:
      '<HoverCard>\n  <HoverCardTrigger>\n    <Button variant="link">@shadcn</Button>\n  </HoverCardTrigger>\n  <HoverCardContent>Preview shown on hover.</HoverCardContent>\n</HoverCard>',
  },
  { name: 'HoverCardTrigger', purpose: 'Element that opens the HoverCardContent on hover.' },
  { name: 'HoverCardContent', purpose: 'Floating card body, portalled to the document.' },
  {
    name: 'Popover',
    purpose: 'Click-triggered floating panel; state lives inside.',
    example:
      '<Popover>\n  <PopoverTrigger>\n    <Button variant="outline">Open</Button>\n  </PopoverTrigger>\n  <PopoverContent>Panel content in a portal.</PopoverContent>\n</Popover>',
  },
  { name: 'PopoverTrigger', purpose: 'Element that toggles the PopoverContent on click.' },
  { name: 'PopoverContent', purpose: 'Floating panel body, portalled to the document.' },
  { name: 'PopoverAnchor', purpose: 'Optional custom positioning anchor for PopoverContent.' },
  {
    name: 'Progress',
    purpose: 'Determinate progress bar. Display-only.',
    props: [{ name: 'value', description: 'number 0-100' }],
    example: '<Progress value="60" />',
  },
  {
    name: 'Separator',
    purpose: 'Thin dividing rule between sections. Display-only.',
    props: [{ name: 'orientation', values: ['horizontal', 'vertical'] }],
    example: '<Separator orientation="horizontal" />',
  },
  {
    name: 'Skeleton',
    purpose: 'Pulsing placeholder box for loading state. Display-only.',
    example: '<Skeleton class="h-4 w-32" />',
  },
  {
    name: 'Spacer',
    purpose: 'Add explicit vertical space between adjacent content blocks. Display-only.',
    example: '<Spacer />',
  },
  {
    name: 'Table',
    purpose: 'Data table root; wrap TableHeader/TableBody rows. Display-only.',
    example:
      '<Table>\n  <TableCaption>Quarterly revenue</TableCaption>\n  <TableHeader>\n    <TableRow>\n      <TableHead>Plan</TableHead>\n      <TableHead>MRR</TableHead>\n    </TableRow>\n  </TableHeader>\n  <TableBody>\n    <TableRow>\n      <TableCell>Pro</TableCell>\n      <TableCell>$1,140</TableCell>\n    </TableRow>\n  </TableBody>\n</Table>',
  },
  { name: 'TableHeader', purpose: 'Header section (thead) of a Table.' },
  { name: 'TableBody', purpose: 'Body section (tbody) holding data rows.' },
  { name: 'TableFooter', purpose: 'Footer section (tfoot), usually totals.' },
  { name: 'TableRow', purpose: 'One row (tr) inside a Table section.' },
  { name: 'TableHead', purpose: 'Header cell (th) inside a TableRow.' },
  { name: 'TableCell', purpose: 'Data cell (td) inside a TableRow.' },
  { name: 'TableCaption', purpose: 'Caption line rendered under the Table.' },
  {
    name: 'Toggle',
    purpose: 'Two-state pressable button; state lives inside the component.',
    props: [
      { name: 'variant', values: ['default', 'outline'] },
      { name: 'size', values: ['default', 'sm', 'lg'] },
    ],
    example: '<Toggle variant="outline">Bold</Toggle>',
  },
  {
    name: 'ToggleGroup',
    purpose: 'Group of Toggle buttons with shared variant/size; single or multiple selection.',
    props: [
      { name: 'type', values: ['single', 'multiple'], required: true },
      { name: 'variant', values: ['default', 'outline'] },
      { name: 'size', values: ['default', 'sm', 'lg'] },
    ],
    example:
      '<ToggleGroup type="single" variant="outline">\n  <ToggleGroupItem value="left">Left</ToggleGroupItem>\n  <ToggleGroupItem value="center">Center</ToggleGroupItem>\n  <ToggleGroupItem value="right">Right</ToggleGroupItem>\n</ToggleGroup>',
  },
  {
    name: 'ToggleGroupItem',
    purpose: 'One selectable button inside a ToggleGroup.',
    props: [{ name: 'value', required: true }],
  },
  {
    name: 'Tooltip',
    purpose:
      'Hover tooltip; wraps its own provider so it works standalone. Shows on hover of TooltipTrigger.',
    example:
      '<Tooltip>\n  <TooltipTrigger>\n    <Button variant="outline">Hover me</Button>\n  </TooltipTrigger>\n  <TooltipContent>Extra context on hover.</TooltipContent>\n</Tooltip>',
  },
  { name: 'TooltipTrigger', purpose: 'Element that reveals the TooltipContent on hover/focus.' },
  { name: 'TooltipContent', purpose: 'Floating tooltip body, portalled to the document.' },
  {
    name: 'TooltipProvider',
    purpose: 'Optional shared tooltip config wrapper; Tooltip includes one by default.',
  },
];
