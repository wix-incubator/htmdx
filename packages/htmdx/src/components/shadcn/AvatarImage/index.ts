import type { HtmdxComponent } from '../../../component-definition';
import { AvatarImage as Component } from './AvatarImage';

export const AvatarImage = {
  name: 'AvatarImage',
  purpose: 'Image inside an Avatar; pair it with AvatarFallback for missing images.',
  example:
    '<Avatar>\n  <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />\n  <AvatarFallback>CN</AvatarFallback>\n</Avatar>',
  body: 'none',
  props: [
    {
      name: 'src',
      type: 'string',
      required: true,
      description: 'URL of the avatar image.',
    },
    {
      name: 'alt',
      type: 'string',
      description: 'Text alternative for the image.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
