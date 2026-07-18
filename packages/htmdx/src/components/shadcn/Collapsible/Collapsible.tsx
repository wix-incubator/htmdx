// Vendored shadcn/ui collapsible root (new-york), split into its own component file.
import * as React from 'react';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';

function Collapsible(props: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

export { Collapsible };
