import type { HtmdxReactComponents } from '../index';

export { injectShadcnTheme, SHADCN_THEME_STYLE_ID, shadcnThemeCss } from './theme';
export { shadcnManifestComponents } from './manifest';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion';
import { Badge } from './badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

export const shadcnComponents = {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} satisfies HtmdxReactComponents;
