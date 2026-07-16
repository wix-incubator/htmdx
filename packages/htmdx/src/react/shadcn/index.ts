import type { HtmdxReactComponents } from '../index';

export { injectShadcnTheme, SHADCN_THEME_STYLE_ID, shadcnThemeCss } from './theme';
export { shadcnManifestComponents } from './manifest';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { AspectRatio } from './aspect-ratio';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Badge } from './badge';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './breadcrumb';
import { Button } from './button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from './popover';
import { Progress } from './progress';
import { Separator } from './separator';
import { Skeleton } from './skeleton';
import { Spacer } from './spacer';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Toggle } from './toggle';
import { ToggleGroup, ToggleGroupItem } from './toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

function inlineBody<T extends object>(component: T) {
  return Object.assign(component, { htmdxInlineBody: true as const });
}

export const shadcnComponents = {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  AlertTitle,
  AspectRatio,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge: inlineBody(Badge),
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button: inlineBody(Button),
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
  Progress,
  Separator,
  Skeleton,
  Spacer,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} satisfies HtmdxReactComponents;
