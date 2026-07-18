import type { HtmdxComponent } from '../../../component-definition';
import { Avatar as Component } from './Avatar';

export const Avatar = {
  name: 'Avatar',
  purpose: 'Round image container that holds an AvatarImage and AvatarFallback.',
  example:
    '<Avatar>\n  <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />\n  <AvatarFallback>CN</AvatarFallback>\n</Avatar>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
