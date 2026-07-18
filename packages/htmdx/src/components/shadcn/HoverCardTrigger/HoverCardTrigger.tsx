// Vendored shadcn/ui hover-card trigger (new-york), split into its own component file.
import * as React from 'react';
import * as HoverCardPrimitive from '@radix-ui/react-hover-card';

function HoverCardTrigger(props: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  return <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />;
}

export { HoverCardTrigger };
