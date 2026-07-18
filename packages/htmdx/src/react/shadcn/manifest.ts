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
