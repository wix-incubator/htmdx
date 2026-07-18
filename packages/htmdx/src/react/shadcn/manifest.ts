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
