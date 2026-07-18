// Vendored shadcn/ui hover-card root (new-york), split into its own component file.
import * as React from 'react';
import * as HoverCardPrimitive from '@radix-ui/react-hover-card';

function HoverCard(props: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />;
}

export { HoverCard };
