import type { HtmdxReactComponents } from '../index';

export { injectShadcnTheme, SHADCN_THEME_STYLE_ID, shadcnThemeCss } from './theme';
export { shadcnManifestComponents } from './manifest';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from './popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

export const shadcnComponents = {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} satisfies HtmdxReactComponents;
