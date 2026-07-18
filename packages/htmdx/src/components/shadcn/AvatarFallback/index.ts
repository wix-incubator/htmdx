import type { HtmdxComponent } from '../../../component-definition';
import { AvatarFallback as Component } from './AvatarFallback';

export const AvatarFallback = {
  name: 'AvatarFallback',
  purpose: 'Initials or short text shown when an AvatarImage is unavailable.',
  example:
    '<Avatar>\n  <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />\n  <AvatarFallback>CN</AvatarFallback>\n</Avatar>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
